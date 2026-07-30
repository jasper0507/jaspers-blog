import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routes = ["", "posts", "shuoshuo", "tags", "archives", "about", "search"];
const pages = Object.fromEntries(
  await Promise.all(
    routes.map(async route => [
      route,
      await readFile(`dist/${route ? `${route}/` : ""}index.html`, "utf8"),
    ]),
  ),
);
const sitemap = await readFile("dist/sitemap.xml", "utf8");

for (const [route, html] of Object.entries(pages)) {
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) ?? []).length,
    1,
    `/${route} 应有且仅有一个主标题`,
  );
}

assert.match(pages[""], /<title>Jasper(?:'|&#39;)s Blog<\/title>/);
assert.match(
  pages[""],
  /<link rel="canonical" href="https:\/\/blog\.jasper0507\.cc\.cd\/">/,
);
assert.match(pages[""], /见了便做/);
assert.match(pages[""], /做了便放下/);
assert.match(pages[""], /了了有何不了/);
assert.match(pages[""], /最近文章/);
assert.match(pages[""], /最近说说/);
assert.match(pages[""], /暂无说说/);
assert.match(pages[""], /<script type="application\/ld\+json">/);
assert.match(pages[""], /"@type":"WebSite"/);
assert.match(pages.about, /Jasper/);
assert.match(pages.about, /github\.com\/jasper0507/);
assert.match(pages.about, /jasper0507\.self@gmail\.com/);
assert.match(sitemap, /https:\/\/blog\.jasper0507\.cc\.cd\/about\//);

console.log("构建产物验收通过");
