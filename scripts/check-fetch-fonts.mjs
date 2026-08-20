import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sourceScript = fileURLToPath(new URL("fetch-fonts.mjs", import.meta.url));
const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-fonts-"));
const fontsDirectory = join(workingDirectory, "public/fonts");
const stylesDirectory = join(workingDirectory, "src/styles");
const cssPath = join(stylesDirectory, "fonts.css");
const mockPath = join(workingDirectory, "mock-fetch.mjs");
const validSerifBase64 = (
  await readFile(join(sourceRoot, "public/fonts/noto-serif-sc-97.woff2"))
).toString("base64");
const validSansBase64 = (
  await readFile(join(sourceRoot, "public/fonts/noto-sans-sc-97.woff2"))
).toString("base64");
const cssResponseMock = `const cssResponse = url => {
  const sans = url.includes("Noto+Sans+SC");
  const family = sans ? "Noto Sans SC" : "Noto Serif SC";
  const file = sans ? "sans.5.woff2" : "serif.4.woff2";
  return new Response("@font-face { font-family: '" + family + "'; src: url(https://example.test/" + file + "); unicode-range: U+0000-00FF; }");
};`;

const snapshot = async () => {
  const names = (await readdir(fontsDirectory)).sort();
  return {
    css: await readFile(cssPath, "utf8"),
    fonts: Object.fromEntries(
      await Promise.all(
        names.map(async name => [
          name,
          (await readFile(join(fontsDirectory, name))).toString("base64"),
        ]),
      ),
    ),
  };
};
const runCommand = () =>
  execFileAsync(process.execPath, ["--import", mockPath, "scripts/fetch-fonts.mjs"], {
    cwd: workingDirectory,
    encoding: "utf8",
  });

try {
  await mkdir(join(workingDirectory, "scripts"), { recursive: true });
  await mkdir(fontsDirectory, { recursive: true });
  await mkdir(join(workingDirectory, "src/styles"), { recursive: true });
  await symlink(
    join(sourceRoot, "node_modules"),
    join(workingDirectory, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await copyFile(sourceScript, join(workingDirectory, "scripts/fetch-fonts.mjs"));
  await writeFile(join(fontsDirectory, "noto-serif-sc-old.woff2"), "old serif");
  await writeFile(join(fontsDirectory, "noto-sans-sc-old.woff2"), "old sans");
  await writeFile(join(fontsDirectory, "source-serif-4-latin.woff2"), "old latin");
  await writeFile(join(fontsDirectory, "source-serif-4-latin-italic.woff2"), "old italic");
  await writeFile(join(fontsDirectory, "LICENSE-noto-serif-sc.txt"), "serif license");
  await writeFile(join(fontsDirectory, "LICENSE-noto-sans-sc.txt"), "sans license");
  await writeFile(cssPath, "old css\n");
  await writeFile(
    mockPath,
    `globalThis.fetch = async url => {
  if (url.includes("Noto+Sans+SC")) return new Response("unavailable", { status: 503 });
  if (url.includes("fonts.googleapis.com")) {
    return new Response("@font-face { font-family: 'Noto Serif SC'; src: url(https://example.test/serif.woff2); unicode-range: U+0000-00FF; }");
  }
  return new Response(Buffer.from(${JSON.stringify(validSerifBase64)}, "base64"));
};
`,
  );

  const before = await snapshot();
  await assert.rejects(runCommand(), /Noto\+Sans\+SC.*503/);
  assert.deepEqual(await snapshot(), before, "更新失败时旧字体和 CSS 必须原样保留");

  await writeFile(
    mockPath,
    `${cssResponseMock}

globalThis.fetch = async url => {
  if (url.includes("fonts.googleapis.com")) {
    return cssResponse(url);
  }
  return new Response("not a font");
};
`,
  );
  await assert.rejects(runCommand(), /下载内容不是 WOFF2 字体/);
  assert.deepEqual(await snapshot(), before, "字体内容无效时旧字体和 CSS 必须原样保留");

  await writeFile(
    mockPath,
    `${cssResponseMock}

globalThis.fetch = async url => {
  if (url.includes("fonts.googleapis.com")) {
    return cssResponse(url);
  }
  return new Response(Buffer.alloc(16 * 1024 * 1024 + 1));
};
`,
  );
  await assert.rejects(runCommand(), /字体响应过大/);
  assert.deepEqual(await snapshot(), before, "字体响应过大时旧字体和 CSS 必须原样保留");

  await writeFile(
    mockPath,
    `${cssResponseMock}

globalThis.fetch = async url => {
  if (url.includes("fonts.googleapis.com")) {
    return cssResponse(url);
  }
  const font = new Uint8Array(48);
  font.set([0x77, 0x4f, 0x46, 0x32]);
  const header = new DataView(font.buffer);
  header.setUint32(8, font.byteLength);
  header.setUint16(12, 1);
  header.setUint32(16, 1);
  header.setUint32(20, 1);
  return new Response(font);
};
`,
  );
  await assert.rejects(runCommand(), /下载内容不是 WOFF2 字体/);
  assert.deepEqual(await snapshot(), before, "字体结构残缺时旧字体和 CSS 必须原样保留");

  await writeFile(
    mockPath,
    `${cssResponseMock}

globalThis.fetch = async url => {
  if (url.includes("fonts.googleapis.com")) {
    return cssResponse(url);
  }
  const font = url.includes("/sans.") ? ${JSON.stringify(validSansBase64)} : ${JSON.stringify(validSerifBase64)};
  return new Response(Buffer.from(font, "base64"));
};
`,
  );
  await runCommand();
  const after = await snapshot();
  assert.deepEqual(
    Object.keys(after.fonts)
      .filter(name => name.startsWith("noto-"))
      .sort(),
    ["noto-sans-sc-5.woff2", "noto-serif-sc-4.woff2"],
    "成功后只保留本次下载的 Noto 分包",
  );
  assert.equal(
    after.fonts["source-serif-4-latin.woff2"],
    before.fonts["source-serif-4-latin.woff2"],
  );
  assert.equal(
    after.fonts["source-serif-4-latin-italic.woff2"],
    before.fonts["source-serif-4-latin-italic.woff2"],
  );
  assert.match(after.css, /source-serif-4-latin-italic\.woff2/);
  assert.equal(after.fonts["LICENSE-noto-serif-sc.txt"], before.fonts["LICENSE-noto-serif-sc.txt"]);
  assert.equal(after.fonts["LICENSE-noto-sans-sc.txt"], before.fonts["LICENSE-noto-sans-sc.txt"]);
  assert.match(after.css, /noto-serif-sc-4\.woff2/);
  assert.match(after.css, /noto-sans-sc-5\.woff2/);
  assert.doesNotMatch(after.css, /old css/);

  assert.deepEqual(
    (await readdir(workingDirectory)).filter(name => name.startsWith(".font-refresh-")),
    [],
    "命令结束后必须清理临时目录",
  );
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}

console.log("字体更新命令验收通过");
