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
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliDecompress } from "node:zlib";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontsDir = join(root, "public/fonts");
const cssPath = join(root, "src/styles/fonts.css");
const brotliDecompressAsync = promisify(brotliDecompress);
const NOTO_FILE = /^noto-(serif|sans)-sc-.*\.woff2$/;
const WOFF2_TAGS = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
];
const REQUIRED_WOFF2_TAGS = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "glyf",
  "loca",
];

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

const validateWoff2 = async (font, name) => {
  const invalid = () => {
    throw new Error(`下载内容不是 WOFF2 字体：${name}`);
  };
  if (
    font.length < 48 ||
    font.subarray(0, 4).toString("ascii") !== "wOF2" ||
    font.readUInt32BE(4) === 0x74746366 ||
    font.readUInt32BE(8) !== font.length ||
    font.readUInt16BE(12) === 0 ||
    font.readUInt32BE(20) === 0
  ) {
    invalid();
  }

  let offset = 48;
  const readUIntBase128 = () => {
    let value = 0;
    for (let index = 0; index < 5; index += 1) {
      if (offset >= font.length) invalid();
      const byte = font[offset];
      offset += 1;
      if ((index === 0 && byte === 0x80) || value > 0x01ffffff) invalid();
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    invalid();
  };

  const tables = new Map();
  let decompressedSize = 0;

  for (let index = 0; index < font.readUInt16BE(12); index += 1) {
    if (offset >= font.length) invalid();
    const flags = font[offset];
    offset += 1;
    const tagIndex = flags & 0x3f;
    if (tagIndex === 63 && offset + 4 > font.length) invalid();
    let tag = WOFF2_TAGS[tagIndex];
    if (tagIndex === 63) {
      tag = font.subarray(offset, offset + 4).toString("ascii");
      offset += 4;
    }
    if (tables.has(tag)) invalid();

    const transformVersion = flags >> 6;
    const transformed =
      tag === "glyf" || tag === "loca"
        ? transformVersion === 0
        : tag === "hmtx" && transformVersion === 1;
    if (
      ((tag === "glyf" || tag === "loca") && ![0, 3].includes(transformVersion)) ||
      (tag === "hmtx" && ![0, 1].includes(transformVersion)) ||
      (!["glyf", "loca", "hmtx"].includes(tag) && transformVersion !== 0)
    ) {
      invalid();
    }

    const originalLength = readUIntBase128();
    const transformedLength = transformed ? readUIntBase128() : originalLength;
    if (tag === "loca" && transformed && transformedLength !== 0) invalid();
    tables.set(tag, {
      offset: decompressedSize,
      originalLength,
      transformed,
      transformedLength,
    });
    decompressedSize += transformedLength;
    if (decompressedSize > 0xffffffff) invalid();
  }

  for (const tag of REQUIRED_WOFF2_TAGS) {
    if (!tables.has(tag)) invalid();
  }

  const compressedEnd = offset + font.readUInt32BE(20);
  if (compressedEnd > font.length) invalid();
  let decompressed;
  try {
    decompressed = await brotliDecompressAsync(font.subarray(offset, compressedEnd));
  } catch {
    invalid();
  }
  if (decompressed.length !== decompressedSize) invalid();

  const tableData = (tag, minimumLength) => {
    const table = tables.get(tag);
    if (!table || table.transformed || table.transformedLength < minimumLength) invalid();
    return decompressed.subarray(table.offset, table.offset + table.transformedLength);
  };
  const head = tableData("head", 54);
  const maxp = tableData("maxp", 32);
  const hhea = tableData("hhea", 36);
  if (
    head.readUInt32BE(0) !== 0x00010000 ||
    head.readUInt32BE(12) !== 0x5f0f3cf5 ||
    head.readUInt16BE(18) < 16 ||
    head.readUInt16BE(18) > 16384 ||
    ![0, 1].includes(head.readInt16BE(50)) ||
    head.readInt16BE(52) !== 0 ||
    maxp.readUInt32BE(0) !== 0x00010000 ||
    maxp.readUInt16BE(4) === 0 ||
    hhea.readUInt32BE(0) !== 0x00010000 ||
    hhea.readUInt16BE(34) === 0 ||
    hhea.readUInt16BE(34) > maxp.readUInt16BE(4)
  ) {
    invalid();
  }

  const cmap = tableData("cmap", 12);
  const cmapRecordsEnd = 4 + cmap.readUInt16BE(2) * 8;
  if (cmap.readUInt16BE(0) !== 0 || cmap.readUInt16BE(2) === 0 || cmapRecordsEnd > cmap.length) {
    invalid();
  }
  for (let record = 4; record < cmapRecordsEnd; record += 8) {
    const subtableOffset = cmap.readUInt32BE(record + 4);
    if (subtableOffset < cmapRecordsEnd || subtableOffset + 2 > cmap.length) invalid();
  }

  const naming = tableData("name", 18);
  const namingFormat = naming.readUInt16BE(0);
  const namingCount = naming.readUInt16BE(2);
  let namingRecordsEnd = 6 + namingCount * 12;
  if (namingCount === 0 || namingRecordsEnd > naming.length || ![0, 1].includes(namingFormat)) {
    invalid();
  }
  if (namingFormat === 1) {
    if (namingRecordsEnd + 2 > naming.length) invalid();
    namingRecordsEnd += 2 + naming.readUInt16BE(namingRecordsEnd) * 4;
  }
  const stringOffset = naming.readUInt16BE(4);
  if (namingRecordsEnd > naming.length || stringOffset < namingRecordsEnd) invalid();
  for (let record = 6; record < 6 + namingCount * 12; record += 12) {
    if (
      stringOffset + naming.readUInt16BE(record + 10) + naming.readUInt16BE(record + 8) >
      naming.length
    ) {
      invalid();
    }
  }

  tableData("OS/2", 78);
  const postVersion = tableData("post", 32).readUInt32BE(0);
  if (![0x00010000, 0x00020000, 0x00025000, 0x00030000, 0x00040000].includes(postVersion)) {
    invalid();
  }

  const numGlyphs = maxp.readUInt16BE(4);
  const loca = tables.get("loca");
  const glyf = tables.get("glyf");
  const expectedLocaLength = (numGlyphs + 1) * (head.readInt16BE(50) === 0 ? 2 : 4);
  if (loca.originalLength !== expectedLocaLength || glyf.originalLength === 0) invalid();
  if (glyf.transformed) {
    const transformedGlyf = decompressed.subarray(
      glyf.offset,
      glyf.offset + glyf.transformedLength,
    );
    if (
      transformedGlyf.length < 36 ||
      transformedGlyf.readUInt16BE(0) !== 0 ||
      (transformedGlyf.readUInt16BE(2) & 0xfffe) !== 0 ||
      transformedGlyf.readUInt16BE(4) !== numGlyphs ||
      transformedGlyf.readUInt16BE(6) !== head.readInt16BE(50)
    ) {
      invalid();
    }
    let transformedStreamsLength = 36;
    for (let stream = 8; stream < 36; stream += 4) {
      transformedStreamsLength += transformedGlyf.readUInt32BE(stream);
    }
    if ((transformedGlyf.readUInt16BE(2) & 1) !== 0) {
      transformedStreamsLength += Math.ceil(numGlyphs / 8);
    }
    if (transformedStreamsLength !== transformedGlyf.length) invalid();
  }

  const metaOffset = font.readUInt32BE(28);
  const metaLength = font.readUInt32BE(32);
  const metaOriginalLength = font.readUInt32BE(36);
  const privateOffset = font.readUInt32BE(40);
  const privateLength = font.readUInt32BE(44);
  const align = value => Math.ceil(value / 4) * 4;
  if (
    (metaOffset === 0 && (metaLength !== 0 || metaOriginalLength !== 0)) ||
    (metaOffset !== 0 &&
      (metaLength === 0 ||
        metaOriginalLength === 0 ||
        metaOffset !== align(compressedEnd) ||
        metaOffset + metaLength > font.length))
  ) {
    invalid();
  }
  const contentEnd = metaOffset === 0 ? compressedEnd : metaOffset + metaLength;
  const trailingPadding = font.subarray(contentEnd);
  if (
    (privateOffset === 0 && privateLength !== 0) ||
    (privateOffset !== 0 &&
      (privateLength === 0 ||
        privateOffset !== align(contentEnd) ||
        privateOffset + privateLength !== font.length)) ||
    (privateOffset === 0 &&
      (trailingPadding.length > 3 || trailingPadding.some(byte => byte !== 0)))
  ) {
    invalid();
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
let committed = false;
let failure;
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
      await Promise.all(
        batch.map(async job => {
          await download(job.url, job.dest);
          await validateWoff2(await readFile(job.dest), job.localName);
        }),
      );
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

  let fontsBackedUp = false;
  let fontsInstalled = false;
  let cssBackedUp = false;
  let cssInstalled = false;
  try {
    // ponytail: catchable errors roll back; add a journal only if crash recovery becomes required.
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
      throw new AggregateError(
        [error, ...rollbackErrors],
        `字体替换失败且未能完整恢复旧文件；备份保留在 ${transactionDir}`,
      );
    }
    throw error;
  }

  committed = true;
  console.log(`wrote ${cssPath} (${generated.length} Noto faces)`);
  console.log("done");
} catch (error) {
  failure = error;
  throw error;
} finally {
  if (!preserveTransaction) {
    try {
      await rm(transactionDir, { recursive: true, force: true });
    } catch (cleanupError) {
      if (!failure && !committed) throw cleanupError;
      console.warn(`未能清理临时目录 ${transactionDir}：${cleanupError.message}`);
    }
  }
}
