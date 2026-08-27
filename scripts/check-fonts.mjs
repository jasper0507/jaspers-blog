import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fontsDir = join(root, "public/fonts");
const cssPath = join(root, "src/styles/fonts.css");
const css = await readFile(cssPath, "utf8");
const files = await readdir(fontsDir);

assert.match(css, /font-family:\s*"Noto Sans SC"/);
assert.match(css, /source-serif-4-latin-italic\.woff2/);
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
