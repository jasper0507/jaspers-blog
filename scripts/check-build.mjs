import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getTagError, tagVocabulary } from "../src/lib/tags.js";
import { LEGACY_ASSETS, POST_MIGRATIONS } from "./migrate-hexo.mjs";

const postSlug = "markdown-quick-start";
const execFileAsync = promisify(execFile);
const tagSlugs = new Map(Object.entries(tagVocabulary));
const routes = [
  "",
  "posts",
  "posts/2",
  ...POST_MIGRATIONS.map(({ slug }) => `posts/${slug}`),
  "shuoshuo",
  "tags",
  ...[...tagSlugs.values()].map(slug => `tags/${slug}`),
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

const publicPostSlugs = (await readdir("dist/posts", { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();
assert.equal(POST_MIGRATIONS.length, 15);
for (const { slug } of POST_MIGRATIONS) {
  assert.ok(publicPostSlugs.includes(slug), `生产构建应生成 ${slug}`);
}
assert.equal(publicPostSlugs.includes("hello-world"), false);

const escapeHtml = value =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const postMetadata = [];
for (const { slug } of POST_MIGRATIONS) {
  const markdown = await readFile(`src/content/posts/${slug}.md`, "utf8");
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(frontmatter, `${slug} 应有 frontmatter`);
  const jsonField = name =>
    JSON.parse(frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1]);
  const dateField = name =>
    frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];
  const title = jsonField("title");
  const description = jsonField("description");
  const tags = [...frontmatter.matchAll(/^  - (.+)$/gm)].map(([, tag]) =>
    JSON.parse(tag),
  );
  postMetadata.push({
    slug,
    title,
    description,
    publishedAt: dateField("publishedAt"),
    tags,
  });
  const page = pages[`posts/${slug}`];
  const canonical = `https://blog.jasper0507.cc.cd/posts/${slug}/`;

  assert.match(
    page,
    new RegExp(`<h1 id="post-title">${escapeRegExp(escapeHtml(title))}</h1>`),
  );
  assert.match(page, new RegExp(`<link rel="canonical" href="${canonical}">`));
  assert.match(page, new RegExp(escapeRegExp(escapeHtml(description))));
  assert.ok(tags.length > 0, `${slug} 应保留分类与标签`);
  for (const tag of tags) {
    assert.match(
      page,
      new RegExp(
        `href="/tags/${tagSlugs.get(tag)}/"[^>]*>${escapeRegExp(escapeHtml(tag))}</a></li>`,
      ),
    );
  }
  for (const field of ["publishedAt", "updatedAt"]) {
    assert.match(page, new RegExp(`datetime="${new Date(dateField(field)).toISOString()}"`));
  }
}

const orderedPosts = postMetadata.toSorted(
  (left, right) =>
    new Date(right.publishedAt) - new Date(left.publishedAt) ||
    left.slug.localeCompare(right.slug),
);
const latestPost = orderedPosts[0];
const listedPostSlugs = html =>
  [...html.matchAll(/<h[23]><a href="\/posts\/([^/]+)\/">/g)].map(
    ([, slug]) => slug,
  );

assert.deepEqual(listedPostSlugs(pages.posts), [
  ...orderedPosts.slice(0, 10).map(({ slug }) => slug),
]);
assert.deepEqual(listedPostSlugs(pages["posts/2"]), [
  ...orderedPosts.slice(10).map(({ slug }) => slug),
]);
for (const metadata of orderedPosts) {
  const page = [pages.posts, pages["posts/2"]].find(html =>
    listedPostSlugs(html).includes(metadata.slug),
  );
  assert.ok(page, `${metadata.slug} 应出现在文章分页中`);
  assert.match(page, new RegExp(escapeRegExp(escapeHtml(metadata.title))));
  assert.match(
    page,
    new RegExp(escapeRegExp(escapeHtml(metadata.description))),
  );
  assert.match(
    page,
    new RegExp(`datetime="${new Date(metadata.publishedAt).toISOString()}"`),
  );
  for (const tag of metadata.tags) {
    assert.match(page, new RegExp(escapeRegExp(escapeHtml(tag))));
  }
}
assert.match(pages.posts, /aria-label="文章分页"/);
assert.match(pages.posts, /href="\/posts\/2\/"/);
assert.match(pages["posts/2"], /href="\/posts\/"/);

assert.deepEqual(
  [...new Set(postMetadata.flatMap(({ tags }) => tags))].toSorted(),
  [...tagSlugs.keys()].toSorted(),
  "中央标签词表应覆盖全部迁移标签",
);
for (const [tag, slug] of tagSlugs) {
  assert.match(
    pages.tags,
    new RegExp(`href="/tags/${slug}/"[^>]*>${escapeRegExp(escapeHtml(tag))}`),
  );
  assert.deepEqual(
    listedPostSlugs(pages[`tags/${slug}`]),
    orderedPosts.filter(post => post.tags.includes(tag)).map(post => post.slug),
    `${tag} 标签页应只列出匹配的技术文章并保持发布时间倒序`,
  );
  assert.doesNotMatch(pages[`tags/${slug}`], /不可公开的草稿/);
}

assert.match(pages.archives, /<h2 id="archive-2026">2026 年<\/h2>/);
assert.deepEqual(
  listedPostSlugs(pages.archives),
  orderedPosts.map(({ slug }) => slug),
  "归档应按发布时间倒序，更新时间不得改变位置",
);
assert.doesNotMatch(pages.archives, /不可公开的草稿/);

for (const asset of LEGACY_ASSETS) {
  const relativePath = `images/posts/${asset.post}/${asset.target}`;
  const data = await readFile(`dist/${relativePath}`);
  assert.equal(createHash("sha256").update(data).digest("hex"), asset.sha256);
  assert.match(pages[`posts/${asset.post}`], new RegExp(`/${relativePath}`));
}

const allPages = Object.values(pages).join("\n");
assert.doesNotMatch(allPages, /jasper0507\.github\.io\/2026\//);
assert.match(
  pages["posts/github-hexo-blog-guide"],
  /https:\/\/blog\.jasper0507\.cc\.cd\/posts\/hexo-icarus-content-guide\//,
);
assert.match(
  pages["posts/data-structures-and-algorithms"],
  /<h6 role="heading" aria-level="7" id="data-structures-and-algorithms-depth-7-代码模板">代码模板<\/h6>/,
);

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
assert.match(pages[""], new RegExp(escapeRegExp(latestPost.title)));
assert.match(pages[""], new RegExp(`/posts/${latestPost.slug}/`));
assert.match(pages[""], /最近说说/);
assert.match(pages[""], /暂无说说/);
const articleMenu = pages[""].match(
  /<ul class="article-menu-list"[^>]*>([\s\S]*?)<\/ul>/,
)?.[1];
assert.ok(articleMenu, "首页应包含文章菜单");
assert.deepEqual(
  [...articleMenu.matchAll(/href="([^"]+)"/g)].map(([, href]) => href),
  ["/posts/", "/tags/", "/archives/"],
);
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
const postListPages = `${pages.posts}\n${pages["posts/2"]}`;
assert.match(postListPages, /Markdown快速上手语法/);
assert.match(postListPages, new RegExp(`/posts/${postSlug}/`));
assert.doesNotMatch(pages[""], /不可公开的草稿/);
assert.doesNotMatch(postListPages, /不可公开的草稿/);
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

const invalidTagOutDir = await mkdtemp(join(tmpdir(), "newblog-invalid-tag-"));
try {
  assert.equal(getTagError("未知标签"), "未登记标签：未知标签");
  const root = fileURLToPath(new URL("..", import.meta.url));
  let buildError;
  try {
    await execFileAsync(process.execPath, [
      join(root, "node_modules/astro/bin/astro.mjs"),
      "build",
      "--force",
      "--outDir",
      invalidTagOutDir,
    ], {
      cwd: root,
      env: {
        ...process.env,
        POST_CONTENT_DIR: "./tests/fixtures/posts-invalid-tag",
      },
    });
  } catch (error) {
    buildError = error;
  }
  assert.ok(buildError, "未登记标签必须使构建失败");
} finally {
  await rm(invalidTagOutDir, { recursive: true, force: true });
}

console.log("构建产物验收通过");
