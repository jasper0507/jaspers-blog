/**
 * 从 Google Fonts CSS API 拉取可自托管的 Noto Sans SC 可变字重分包，
 * 写入 public/fonts，并重生 src/styles/fonts.css。
 * 同时从固定 GitHub 提交下载 Anthropic 拉丁字体并校验 SHA-256。
 *
 * 使用 Chrome UA 以拿到带 unicode-range 的 WOFF2 分段；可变 wght 200–900
 * 覆盖中文正文 400、标题 500/600 等真实字重。
 * 跳过拉丁/西里尔/越南分包：拉丁字形由 Anthropic 字体承担。
 *
 * 只在维护时运行：node scripts/fetch-fonts.mjs
 * 页面运行时不请求字体 CDN。
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rename as renameFile,
  rm,
} from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 固定上游版本；更新版本时同时核对字体声明及 SHA-256。
const ANTHROPIC_REVISION = "70deb78a198ebd3786d772d92a23d41eeb7510c0";
export const ANTHROPIC_FONTS = [
  {
    name: "AnthropicSansWebText.ttf",
    sha256: "23d4e1fd7be1c5660deb039dfee29dc284417aea90b744a435ce9ad752e50254",
  },
  {
    name: "AnthropicSerifWebText.ttf",
    sha256: "aa2b11a302488b87acd0fbc6e30dcae2640404d529a316c647e765440c22e914",
  },
  {
    name: "AnthropicMonoVariable.ttf",
    sha256: "974d8304ca3ce5db421d4b4aa02cff170d41f5179a7acd155e934f4218d1d803",
  },
];

const LATIN_FACES = `/* Anthropic TTF 只有直立 400；其余字重与斜体由浏览器合成。 */
@font-face {
  font-family: "anthropic-sans";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/AnthropicSansWebText.ttf") format("truetype");
}

@font-face {
  font-family: "anthropic-serif";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/AnthropicSerifWebText.ttf") format("truetype");
}

@font-face {
  font-family: "anthropic-mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/AnthropicMonoVariable.ttf") format("truetype");
}
`;

const FAMILY = {
  cssFamily: "Noto Sans SC",
  query: "family=Noto+Sans+SC:wght@200..900&display=swap",
  filePrefix: "noto-sans-sc",
};

const extraKind = unicodeRange => {
  const u = unicodeRange.toUpperCase();
  if (u.includes("U+0400-045F") || u.includes("U+2116")) return "cyrillic";
  if (u.includes("U+1EA0-1EF9") || u.includes("U+20AB")) return "vietnamese";
  if (u.includes("U+0100-02BA") || u.includes("U+1E00-1E9F")) return "latin-ext";
  if (u.includes("U+0000-00FF") && !u.includes("U+4E00") && !u.includes("U+3000")) {
    return "latin";
  }
};

const localFileName = (prefix, url, unicodeRange) => {
  const remote = new URL(url);
  if (remote.protocol !== "https:") throw new Error(`字体地址必须使用 HTTPS：${url}`);
  const file = remote.pathname.split("/").pop() ?? "font.woff2";
  const numbered = file.match(/\.(\d+)\.woff2$/);
  if (numbered) return `${prefix}-${numbered[1]}.woff2`;
  const kind = extraKind(unicodeRange);
  if (kind) return `${prefix}-${kind}.woff2`;
  return `${prefix}-${Buffer.from(unicodeRange).toString("base64url").slice(0, 10)}.woff2`;
};

const isSkippedExtra = (fileName, unicodeRange) => {
  if (
    /\.woff2$/.test(fileName) &&
    /-(latin|latin-ext|cyrillic|vietnamese)\.woff2$/.test(fileName)
  ) {
    return true;
  }
  const kind = extraKind(unicodeRange);
  return kind === "latin" || kind === "latin-ext" || kind === "cyrillic" || kind === "vietnamese";
};

const fetchText = async (url, fetch) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
};

const download = async (url, dest, fetch) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
};

const parseFaces = css => {
  const faces = [];
  for (const block of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const body = block[1];
    const family = body.match(/font-family:\s*['"]?([^;'"]+)/)?.[1]?.trim();
    const url = body.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, "");
    const unicodeRange = body.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim();
    if (!family || !url || !unicodeRange) throw new Error("字体样式包含不完整的 @font-face");
    faces.push({ family, url, unicodeRange });
  }
  return faces;
};

const uniqueVariableFaces = faces => {
  const seen = new Map();
  for (const face of faces) {
    if (!seen.has(face.url)) seen.set(face.url, face);
  }
  return [...seen.values()];
};

const formatFace = (family, localName, unicodeRange) => `@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: 200 900;
  font-display: swap;
  src: url("/fonts/${localName}") format("woff2");
  unicode-range: ${unicodeRange};
}
`;

/**
 * 更新仓库的 Anthropic 字体、中文分包及字体样式；调用期间须暂停其他字体更新和构建。
 * 可捕获错误会尝试回滚；回滚失败的 AggregateError 带 recoveryDirectory，
 * 保留恢复文件供人工处理。进程中断后同样由维护者人工恢复。
 * @param {string} root
 * @param {{ fetch?: typeof globalThis.fetch, rename?: typeof renameFile }} [adapters]
 * @returns {Promise<void>}
 */
export async function refreshFonts(root, { fetch = globalThis.fetch, rename = renameFile } = {}) {
  const fontsDir = join(root, "public/fonts");
  const cssPath = join(root, "src/styles/fonts.css");

  await mkdir(fontsDir, { recursive: true });
  const transactionDir = await mkdtemp(join(root, ".font-refresh-"));
  const nextFontsDir = join(transactionDir, "fonts");
  const nextCssPath = join(transactionDir, "fonts.css");
  const oldFontsDir = join(transactionDir, "old-fonts");
  const oldCssPath = join(transactionDir, "old-fonts.css");
  let committed = false;
  let failure;
  let preserveTransaction = false;

  try {
    await mkdir(nextFontsDir);
    for (const name of await readdir(fontsDir)) {
      if (!/^noto-sans-sc-.*\.woff2$/.test(name)) {
        await cp(join(fontsDir, name), join(nextFontsDir, name), { recursive: true });
      }
    }

    const cssUrl = `https://fonts.googleapis.com/css2?${FAMILY.query}`;
    console.log(`fetch CSS ${FAMILY.cssFamily}…`);
    const css = await fetchText(cssUrl, fetch);
    const faces = uniqueVariableFaces(
      parseFaces(css).filter(face => face.family === FAMILY.cssFamily),
    ).filter(face => {
      const name = localFileName(FAMILY.filePrefix, face.url, face.unicodeRange);
      return !isSkippedExtra(name, face.unicodeRange);
    });
    if (faces.length === 0) throw new Error(`${FAMILY.cssFamily} 没有可用的中文分包`);
    console.log(`  ${faces.length} CJK subsets`);

    const localNames = new Set();
    const jobs = faces.map(face => {
      const localName = localFileName(FAMILY.filePrefix, face.url, face.unicodeRange);
      if (localNames.has(localName)) throw new Error(`字体文件名重复：${localName}`);
      localNames.add(localName);
      return { ...face, family: FAMILY.cssFamily, localName, dest: join(nextFontsDir, localName) };
    });

    const concurrency = 12;
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      // 首个失败后也要等本批下载结束，清理时不得仍有任务写入事务目录。
      const results = await Promise.allSettled(
        batch.map(job => download(job.url, job.dest, fetch)),
      );
      const errors = results
        .filter(result => result.status === "rejected")
        .map(result => result.reason);
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, "字体下载失败");
      process.stdout.write(
        `  downloaded ${Math.min(i + concurrency, jobs.length)}/${jobs.length}\r`,
      );
    }
    process.stdout.write("\n");

    for (const job of jobs) {
      const font = await readFile(job.dest);
      if (
        font.length < 48 ||
        font.subarray(0, 4).toString("ascii") !== "wOF2" ||
        font.readUInt32BE(8) !== font.length ||
        font.readUInt16BE(12) === 0 ||
        font.readUInt32BE(16) === 0 ||
        font.readUInt32BE(20) === 0
      ) {
        throw new Error(`下载内容不是 WOFF2 字体：${job.localName}`);
      }
    }

    for (const { name, sha256 } of ANTHROPIC_FONTS) {
      const url = `https://raw.githubusercontent.com/Isilsolme/dsh-anthropic-fonts/${ANTHROPIC_REVISION}/fonts/${name}`;
      const dest = join(nextFontsDir, name);
      await download(url, dest, fetch);
      const font = await readFile(dest);
      if (createHash("sha256").update(font).digest("hex") !== sha256) {
        throw new Error(`Anthropic 字体校验失败：${name}`);
      }
    }

    const stagedNotoNames = (await readdir(nextFontsDir))
      .filter(name => /^noto-sans-sc-.*\.woff2$/.test(name))
      .sort();
    const expectedNames = [...localNames].sort();
    if (
      stagedNotoNames.length !== expectedNames.length ||
      stagedNotoNames.some((name, index) => name !== expectedNames[index])
    ) {
      throw new Error("字体样式清单与下载文件不一致");
    }

    const generated = jobs.map(job => formatFace(job.family, job.localName, job.unicodeRange));
    const header = `/* 由 scripts/fetch-fonts.mjs 生成。Anthropic 固定版本 TTF；Noto Sans SC 为可变字重 unicode-range 分包。 */\n\n`;
    await writeFile(nextCssPath, header + LATIN_FACES + "\n" + generated.join("\n"), "utf8");

    try {
      await readFile(join(nextFontsDir, "LICENSE-noto-sans-sc.txt"), "utf8");
      await readFile(join(nextFontsDir, "NOTICE-anthropic.txt"), "utf8");
    } catch {
      throw new Error("缺少 Noto Sans SC 许可或 Anthropic 字体声明");
    }

    let fontsBackedUp = false;
    let fontsInstalled = false;
    let cssBackedUp = false;
    let cssInstalled = false;
    try {
      await rename(fontsDir, oldFontsDir);
      fontsBackedUp = true;
      await rename(nextFontsDir, fontsDir);
      fontsInstalled = true;
      await rename(cssPath, oldCssPath);
      cssBackedUp = true;
      await rename(nextCssPath, cssPath);
      cssInstalled = true;
    } catch (error) {
      const rollbackErrors = [];
      const rollback = async action => {
        try {
          await action();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      };
      if (cssInstalled) await rollback(() => rename(cssPath, nextCssPath));
      if (cssBackedUp) await rollback(() => rename(oldCssPath, cssPath));
      if (fontsInstalled) await rollback(() => rename(fontsDir, nextFontsDir));
      if (fontsBackedUp) await rollback(() => rename(oldFontsDir, fontsDir));
      if (rollbackErrors.length > 0) {
        preserveTransaction = true;
        throw Object.assign(
          new AggregateError([error, ...rollbackErrors], "字体替换失败且未能完整恢复旧文件"),
          { recoveryDirectory: transactionDir },
        );
      }
      throw error;
    }

    committed = true;
    console.log(`wrote ${cssPath} (${generated.length} Noto Sans SC faces)`);
    console.log("done");
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (preserveTransaction) {
      console.warn(`已保留字体事务目录以便手动恢复：${transactionDir}`);
    } else {
      try {
        await rm(transactionDir, { recursive: true, force: true });
      } catch (cleanupError) {
        if (!failure && !committed) throw cleanupError;
        console.warn(`未能清理临时目录 ${transactionDir}：${cleanupError.message}`);
      }
    }
  }
}

if (import.meta.main) {
  await refreshFonts(fileURLToPath(new URL("..", import.meta.url)));
}
