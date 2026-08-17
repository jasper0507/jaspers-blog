/**
 * 从 Google Fonts CSS API 拉取可自托管的 Noto 可变字重分包，写入 public/fonts，
 * 并重生 src/styles/fonts.css（拉丁字体文件保持不动，仅改写 @font-face 声明）。
 *
 * 使用 Chrome UA 以拿到带 unicode-range 的 WOFF2 分段；Noto Serif/Sans SC 使用
 * 可变 wght（200–900）一份分包覆盖 400/600/700，避免伪粗与三倍静态体积。
 *
 * 运行：node scripts/fetch-fonts.mjs
 */
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, writeFile, readdir, rename, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontsDir = join(root, "public/fonts");
const cssPath = join(root, "src/styles/fonts.css");
const NOTO_FILE = /^noto-(serif|sans)-sc-.*\.woff2$/;
const MAX_CSS_BYTES = 1024 * 1024;
const MAX_FONT_BYTES = 16 * 1024 * 1024;
const MAX_FONT_DATA_BYTES = 64 * 1024 * 1024;
const MAX_ALL_FONTS_BYTES = 256 * 1024 * 1024;
let downloadedFontBytes = 0;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const LATIN_FACES = `/* 拉丁：既有单文件策略，不随 Noto 分包重建 */
@font-face {
  font-family: "Source Serif 4";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/source-serif-4-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "IBM Plex Sans";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("/fonts/ibm-plex-sans-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/ibm-plex-mono-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
`;

const FAMILIES = [
  {
    cssFamily: "Noto Serif SC",
    query: "family=Noto+Serif+SC:wght@200..900&display=swap",
    filePrefix: "noto-serif-sc",
  },
  {
    cssFamily: "Noto Sans SC",
    query: "family=Noto+Sans+SC:wght@200..900&display=swap",
    filePrefix: "noto-sans-sc",
  },
];

const latinExtraName = unicodeRange => {
  const u = unicodeRange.toUpperCase();
  if (u.includes("U+0400") || u.includes("U+0301")) return "cyrillic";
  if (u.includes("U+0102") || u.includes("U+1EA0")) return "vietnamese";
  if (u.includes("U+0100-02BA") || u.includes("U+1E00")) return "latin-ext";
  if (u.includes("U+0000-00FF")) return "latin";
  return `extra-${Buffer.from(unicodeRange).toString("base64url").slice(0, 10)}`;
};

const localFileName = (prefix, url, unicodeRange) => {
  const remote = new URL(url);
  if (remote.protocol !== "https:") throw new Error(`字体地址必须使用 HTTPS：${url}`);
  const file = remote.pathname.split("/").pop() ?? "font.woff2";
  const numbered = file.match(/\.(\d+)\.woff2$/);
  if (numbered) return `${prefix}-${numbered[1]}.woff2`;
  return `${prefix}-${latinExtraName(unicodeRange)}.woff2`;
};

const declaredResponseSize = (res, limit, label) => {
  const header = res.headers.get("content-length");
  if (!header) return;
  const size = Number(header);
  if (!Number.isSafeInteger(size) || size < 0 || size > limit) {
    throw new Error(`${label}响应过大或长度无效`);
  }
};

const fetchText = async url => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  if (!res.body) throw new Error(`GET ${url} → 响应为空`);
  declaredResponseSize(res, MAX_CSS_BYTES, "字体样式");
  const chunks = [];
  let size = 0;
  for await (const chunk of Readable.fromWeb(res.body)) {
    size += chunk.length;
    if (size > MAX_CSS_BYTES) throw new Error("字体样式响应过大");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size).toString("utf8");
};

const download = async (url, dest) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  if (!res.body) throw new Error(`GET ${url} → 响应为空`);
  declaredResponseSize(res, MAX_FONT_BYTES, "字体");
  let fileBytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      fileBytes += chunk.length;
      downloadedFontBytes += chunk.length;
      if (fileBytes > MAX_FONT_BYTES || downloadedFontBytes > MAX_ALL_FONTS_BYTES) {
        callback(new Error("字体响应过大"));
      } else {
        callback(null, chunk);
      }
    },
  });
  await pipeline(Readable.fromWeb(res.body), limiter, createWriteStream(dest));
};

const validateWoff2 = (font, name) => {
  const compressedSize = font.length >= 24 ? font.readUInt32BE(20) : 0;
  if (
    font.length < 48 ||
    font.subarray(0, 4).toString("ascii") !== "wOF2" ||
    font.readUInt32BE(8) !== font.length ||
    font.readUInt16BE(12) === 0 ||
    font.readUInt32BE(16) === 0 ||
    font.readUInt32BE(16) > MAX_FONT_DATA_BYTES ||
    compressedSize === 0 ||
    compressedSize > font.length - 48
  ) {
    throw new Error(`下载内容不是 WOFF2 字体：${name}`);
  }
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

/** 可变字体：每个 url 只保留一条，声明 font-weight: 200 900 */
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

await mkdir(fontsDir, { recursive: true });
const transactionDir = await mkdtemp(join(root, ".font-refresh-"));
const nextFontsDir = join(transactionDir, "fonts");
const nextCssPath = join(transactionDir, "fonts.css");
const oldFontsDir = join(transactionDir, "old-fonts");
const oldCssPath = join(transactionDir, "old-fonts.css");
let preserveTransaction = false;

try {
  await mkdir(nextFontsDir);
  for (const name of await readdir(fontsDir)) {
    if (!NOTO_FILE.test(name)) {
      await cp(join(fontsDir, name), join(nextFontsDir, name), { recursive: true });
    }
  }

  const jobs = [];
  const localNames = new Set();
  const concurrency = 12;

  for (const { cssFamily, query, filePrefix } of FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?${query}`;
    console.log(`fetch CSS ${cssFamily}…`);
    const css = await fetchText(cssUrl);
    const faces = uniqueVariableFaces(parseFaces(css).filter(f => f.family === cssFamily));
    if (faces.length === 0) throw new Error(`${cssFamily} 没有可用的字体分包`);
    console.log(`  ${faces.length} unique subsets`);

    const familyJobs = faces.map(face => {
      const localName = localFileName(filePrefix, face.url, face.unicodeRange);
      if (localNames.has(localName)) throw new Error(`字体文件名重复：${localName}`);
      localNames.add(localName);
      return { ...face, family: cssFamily, localName, dest: join(nextFontsDir, localName) };
    });

    for (let i = 0; i < familyJobs.length; i += concurrency) {
      const batch = familyJobs.slice(i, i + concurrency);
      await Promise.all(batch.map(job => download(job.url, job.dest)));
      for (const job of batch) {
        validateWoff2(await readFile(job.dest), job.localName);
      }
      process.stdout.write(
        `  downloaded ${Math.min(i + concurrency, familyJobs.length)}/${familyJobs.length}\r`,
      );
    }
    process.stdout.write("\n");
    jobs.push(...familyJobs);
  }

  const stagedNotoNames = (await readdir(nextFontsDir)).filter(name => NOTO_FILE.test(name)).sort();
  const expectedNames = [...localNames].sort();
  if (
    stagedNotoNames.length !== expectedNames.length ||
    stagedNotoNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error("字体样式清单与下载文件不一致");
  }

  const generated = jobs.map(job => formatFace(job.family, job.localName, job.unicodeRange));
  const header = `/* 由 scripts/fetch-fonts.mjs 生成。拉丁资源手维；Noto 为可变字重 unicode-range 分包。 */\n\n`;
  await writeFile(nextCssPath, header + LATIN_FACES + "\n" + generated.join("\n"), "utf8");

  try {
    await readFile(join(nextFontsDir, "LICENSE-noto-sans-sc.txt"), "utf8");
  } catch {
    const serifLicense = await readFile(join(nextFontsDir, "LICENSE-noto-serif-sc.txt"), "utf8");
    await writeFile(
      join(nextFontsDir, "LICENSE-noto-sans-sc.txt"),
      serifLicense.replaceAll("Noto Serif SC", "Noto Sans SC"),
      "utf8",
    );
    console.log("wrote LICENSE-noto-sans-sc.txt from serif OFL template");
  }

  // ponytail: 替换失败时保留旧资产供人工恢复；无人值守更新再加崩溃安全事务。
  preserveTransaction = true;
  await rename(fontsDir, oldFontsDir);
  await rename(nextFontsDir, fontsDir);
  await rename(cssPath, oldCssPath);
  await rename(nextCssPath, cssPath);
  preserveTransaction = false;

  console.log(`wrote ${cssPath} (${generated.length} Noto faces)`);
  console.log("done");
} finally {
  if (preserveTransaction) console.error(`字体替换未完成；旧资产保留在 ${transactionDir}`);
  else await rm(transactionDir, { recursive: true, force: true });
}
