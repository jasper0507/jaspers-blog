import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";

const postSlug = "markdown-quick-start";
const routes = [
  "",
  "posts",
  `posts/${postSlug}`,
  "shuoshuo",
  "tags",
  "archives",
  "about",
  "search",
];
const pages = Object.fromEntries(
  await Promise.all(
    routes.map(async route => [
      route,
      await readFile(`dist/${route ? `${route}/` : ""}index.html`, "utf8"),
    ]),
  ),
);
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const styles = (
  await Promise.all(
    (await readdir("dist/_astro"))
      .filter(file => file.endsWith(".css"))
      .map(file => readFile(`dist/_astro/${file}`, "utf8")),
  )
).join("\n");

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
assert.match(pages[""], /Markdown快速上手语法/);
assert.match(pages[""], new RegExp(`/posts/${postSlug}/`));
assert.match(pages[""], /最近说说/);
assert.match(pages[""], /暂无说说/);
assert.match(pages.shuoshuo, /暂无说说/);
for (const fixtureText of [
  "这是发布时间最新的公开说说",
  "这是一条不应公开的草稿",
  "20250101-000001",
]) {
  assert.doesNotMatch(pages[""], new RegExp(fixtureText));
  assert.doesNotMatch(pages.shuoshuo, new RegExp(fixtureText));
  assert.doesNotMatch(sitemap, new RegExp(fixtureText));
}
for (const segment of ["115", "117", "118", "119"]) {
  assert.match(
    pages[""],
    new RegExp(`/fonts/noto-serif-sc-${segment}\\.woff2`),
    `首页应预加载禅语使用的 Noto Serif SC ${segment} 分段`,
  );
  await access(`dist/fonts/noto-serif-sc-${segment}.woff2`);
}
assert.doesNotMatch(
  styles,
  /fonts\.(?:googleapis|gstatic)\.com/,
  "构建产物不得请求第三方字体服务",
);
assert.match(pages[""], /<script type="application\/ld\+json">/);
assert.match(pages[""], /"@type":"WebSite"/);
assert.match(pages.posts, /Markdown快速上手语法/);
assert.match(pages.posts, new RegExp(`/posts/${postSlug}/`));
assert.doesNotMatch(pages[""], /不可公开的草稿/);
assert.doesNotMatch(pages.posts, /不可公开的草稿/);
assert.doesNotMatch(sitemap, /draft-markdown-capabilities/);
await assert.rejects(
  access("dist/posts/draft-markdown-capabilities/index.html"),
  "草稿不得生成公开详情页",
);

const post = pages[`posts/${postSlug}`];
assert.match(post, /<title>Markdown快速上手语法 \| Jasper/);
assert.match(post, /这是一篇用于新手快速上手Markdown的文章/);
assert.match(post, /2026年1月23日/);
assert.match(post, /发布于/);
assert.match(post, /更新于/);
assert.match(post, /工程实践/);
assert.match(post, /文档写作/);
assert.match(post, /教程/);
assert.match(post, /Markdown/);
assert.match(post, /aria-label="文章目录"/);
assert.match(post, /href="#一基本语法"/);
assert.match(post, /id="一基本语法"/);
assert.match(post, /class="katex/);
assert.match(post, /<table>/);
assert.match(post, /type="checkbox"/);
assert.match(post, /<del>删除线<\/del>/);
assert.match(post, /class="astro-code/);
assert.match(post, />脚注<\/h2>/);
assert.doesNotMatch(post, />Footnotes<\/h2>/);
assert.doesNotMatch(post, /href="#footnote-label"/);
assert.match(pages.about, /Jasper/);
assert.match(pages.about, /github\.com\/jasper0507/);
assert.match(pages.about, /jasper0507\.self@gmail\.com/);
assert.match(sitemap, /https:\/\/blog\.jasper0507\.cc\.cd\/about\//);

console.log("构建产物验收通过");
