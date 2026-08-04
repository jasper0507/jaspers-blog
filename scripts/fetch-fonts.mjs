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
import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontsDir = join(root, "public/fonts");
const cssPath = join(root, "src/styles/fonts.css");

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
  const file = url.split("/").pop() ?? "font.woff2";
  const numbered = file.match(/\.(\d+)\.woff2$/);
  if (numbered) return `${prefix}-${numbered[1]}.woff2`;
  return `${prefix}-${latinExtraName(unicodeRange)}.woff2`;
};

const fetchText = async url => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
};

const download = async (url, dest) => {
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
    if (!family || !url || !unicodeRange) continue;
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

// 清理旧 Noto 分包（保留 LICENSE 与拉丁 woff2）
const existing = await readdir(fontsDir);
for (const name of existing) {
  if (/^noto-(serif|sans)-sc-.*\.woff2$/.test(name)) {
    await unlink(join(fontsDir, name));
  }
}

const generated = [];
const concurrency = 12;

for (const { cssFamily, query, filePrefix } of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?${query}`;
  console.log(`fetch CSS ${cssFamily}…`);
  const css = await fetchText(cssUrl);
  const faces = uniqueVariableFaces(parseFaces(css).filter(f => f.family === cssFamily));
  console.log(`  ${faces.length} unique subsets`);

  const jobs = faces.map(face => {
    const name = localFileName(filePrefix, face.url, face.unicodeRange);
    return { ...face, localName: name, dest: join(fontsDir, name) };
  });

  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    await Promise.all(batch.map(job => download(job.url, job.dest)));
    process.stdout.write(`  downloaded ${Math.min(i + concurrency, jobs.length)}/${jobs.length}\r`);
  }
  process.stdout.write("\n");

  for (const job of jobs) {
    generated.push(formatFace(cssFamily, job.localName, job.unicodeRange));
  }
}

const header = `/* 由 scripts/fetch-fonts.mjs 生成。拉丁资源手维；Noto 为可变字重 unicode-range 分包。 */\n\n`;
await writeFile(cssPath, header + LATIN_FACES + "\n" + generated.join("\n"), "utf8");
console.log(`wrote ${cssPath} (${generated.length} Noto faces)`);

// 确保 LICENSE 存在（Noto Sans 若缺失则从 Serif 复制 OFL 并改名提示）
try {
  await readFile(join(fontsDir, "LICENSE-noto-sans-sc.txt"), "utf8");
} catch {
  const serifLicense = await readFile(join(fontsDir, "LICENSE-noto-serif-sc.txt"), "utf8");
  await writeFile(
    join(fontsDir, "LICENSE-noto-sans-sc.txt"),
    serifLicense.replaceAll("Noto Serif SC", "Noto Sans SC"),
    "utf8",
  );
  console.log("wrote LICENSE-noto-sans-sc.txt from serif OFL template");
}

console.log("done");
