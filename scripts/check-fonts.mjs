import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { ANTHROPIC_FONTS } from "./fetch-fonts.mjs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontsDir = join(root, "public/fonts");
const cssPath = join(root, "src/styles/fonts.css");
const css = await readFile(cssPath, "utf8");
const files = await readdir(fontsDir);

assert.match(css, /font-family:\s*"Noto Sans SC"/);
for (const { name, sha256 } of ANTHROPIC_FONTS) {
  assert.ok(css.includes(`/fonts/${name}`), `缺少 Anthropic 字体声明：${name}`);
  const font = await readFile(join(fontsDir, name));
  assert.equal(
    createHash("sha256").update(font).digest("hex"),
    sha256,
    `字体内容与固定来源不一致：${name}`,
  );
}
assert.ok(files.includes("NOTICE-anthropic.txt"), "缺少 Anthropic 字体声明");
assert.doesNotMatch(css, /Source Serif 4|IBM Plex|local\(/);
assert.doesNotMatch(css, /fonts\.googleapis\.com/);
assert.ok(files.includes("LICENSE-noto-sans-sc.txt"), "缺少 Noto Sans SC 的 OFL 许可文件");
assert.ok(
  files.some(name => /^noto-sans-sc-.+\.woff2$/.test(name)),
  "缺少 Noto Sans SC 分包",
);

const urls = [...css.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map(match => match[1]);
assert.ok(urls.length > 0, "fonts.css 没有本地字体引用");
for (const name of urls) {
  assert.ok(files.includes(name), `fonts.css 引用了缺失文件：${name}`);
}

console.log("字体资源验收通过");
