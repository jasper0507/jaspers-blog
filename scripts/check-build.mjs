import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getTagSlug } from "../src/lib/tags.js";
import { LEGACY_ASSETS, POST_MIGRATIONS } from "./migrate-hexo.mjs";

const postSlug = "markdown-quick-start";
const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

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
  const jsonField = name => JSON.parse(frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1]);
  const dateField = name => frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];
  const title = jsonField("title");
  const description = jsonField("description");
  const tags = [...frontmatter.matchAll(/^  - (.+)$/gm)].map(([, tag]) => JSON.parse(tag));
  postMetadata.push({
    slug,
    title,
    description,
    publishedAt: dateField("publishedAt"),
    tags,
  });
}

const usedTags = [
  ...new Map(
    postMetadata.flatMap(({ tags }) =>
      tags.map(tag => [tag, { name: tag, slug: getTagSlug(tag) }]),
    ),
  ).values(),
];
const tagSlugs = new Map(usedTags.map(({ name, slug }) => [name, slug]));

const routes = [
  "",
  ...POST_MIGRATIONS.map(({ slug }) => `posts/${slug}`),
  "shuoshuo",
  "tags",
  ...usedTags.map(({ slug }) => `tags/${slug}`),
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
const postsListRedirect = await readFile("dist/posts/index.html", "utf8");
const postsPage2Redirect = await readFile("dist/posts/2/index.html", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const rss = await readFile("dist/rss.xml", "utf8");
const searchIndex = JSON.parse(await readFile("dist/pagefind/pagefind-entry.json", "utf8"));
const styles = (
  await Promise.all(
    (await readdir("dist/_astro"))
      .filter(file => file.endsWith(".css"))
      .map(file => readFile(`dist/_astro/${file}`, "utf8")),
  )
).join("\n");
const [nodeVersion, deploymentGuide, thirdPartyNotices, packageManifest] = await Promise.all([
  readFile(".node-version", "utf8"),
  readFile("docs/deployment.md", "utf8"),
  readFile("THIRD_PARTY_NOTICES.md", "utf8"),
  readFile("package.json", "utf8").then(JSON.parse),
]);

assert.equal(nodeVersion.trim(), "22.16.0");
assert.equal(packageManifest.scripts.build, "astro build && pagefind --site dist");
assert.match(deploymentGuide, /Node\.js `22\.16\.0`/);
assert.match(deploymentGuide, /包管理器：`npm`/);
assert.match(deploymentGuide, /构建命令：`npm run build`/);
assert.match(deploymentGuide, /输出目录：`dist`/);
assert.match(deploymentGuide, /正式分支：`main`/);
assert.match(deploymentGuide, /https:\/\/blog\.jasper0507\.cc\.cd/);
assert.doesNotMatch(deploymentGuide, /(?:token|secret|password)\s*[:=]\s*\S+/i);
assert.match(thirdPartyNotices, /AstroPaper/);
assert.match(thirdPartyNotices, /Copyright \(c\) 2023 Sat Naing/);
assert.match(thirdPartyNotices, /MIT License/);
assert.match(thirdPartyNotices, /原创技术文章、说说和图片不适用上述 MIT 许可/);

const publicPostSlugs = (await readdir("dist/posts", { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();
assert.equal(POST_MIGRATIONS.length, 15);
for (const { slug } of POST_MIGRATIONS) {
  assert.ok(publicPostSlugs.includes(slug), `生产构建应生成 ${slug}`);
}
assert.equal(publicPostSlugs.includes("hello-world"), false);

for (const { slug, title, description, tags } of postMetadata) {
  const markdown = await readFile(`src/content/posts/${slug}.md`, "utf8");
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  const dateField = name => frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];
  const page = pages[`posts/${slug}`];
  const canonical = `https://blog.jasper0507.cc.cd/posts/${slug}/`;

  assert.match(page, new RegExp(`<h1 id="post-title">${escapeRegExp(escapeHtml(title))}</h1>`));
  assert.match(page, new RegExp(`<link rel="canonical" href="${canonical}">`));
  assert.match(page, new RegExp(escapeRegExp(escapeHtml(description))));
  if (tags.length === 0) {
    assert.doesNotMatch(page, /aria-label="标签"/, `${slug} 无标签时不应渲染标签区域`);
  } else {
    for (const tag of tags) {
      assert.match(
        page,
        new RegExp(
          `href="/tags/${escapeRegExp(tagSlugs.get(tag))}/"[^>]*>${escapeRegExp(escapeHtml(tag))}</a></li>`,
        ),
      );
    }
  }
  for (const field of ["publishedAt", "updatedAt"]) {
    assert.match(page, new RegExp(`datetime="${new Date(dateField(field)).toISOString()}"`));
  }
}

const orderedPosts = postMetadata.toSorted(
  (left, right) =>
    new Date(right.publishedAt) - new Date(left.publishedAt) || left.slug.localeCompare(right.slug),
);
const latestPost = orderedPosts[0];
const listedPostSlugs = html =>
  [...html.matchAll(/<h[23]><a href="\/posts\/([^/]+)\/">/g)].map(([, slug]) => slug);
const listedArchiveSlugs = html =>
  [...html.matchAll(/class="archive-card-title"[^>]*href="\/posts\/([^/]+)\/"/g)].map(
    ([, slug]) => slug,
  );

for (const redirectHtml of [postsListRedirect, postsPage2Redirect]) {
  assert.match(redirectHtml, /http-equiv="refresh"/i);
  assert.match(redirectHtml, /url=\/archives\/?/i);
}
assert.doesNotMatch(postsListRedirect, /aria-label="文章分页"/);
assert.doesNotMatch(postsListRedirect, /全部文章/);

assert.ok(usedTags.length > 0, "生产内容应包含至少一个标签以便验收聚合");
assert.match(pages.tags, /<title>标签 \| Jasper(?:'|&#39;)s Blog<\/title>/);
assert.match(
  pages.tags,
  /<h1[^>]*\bsr-only\b[^>]*>标签<\/h1>|<h1[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>标签<\/h1>/,
  "标签索引应保留无障碍页面名",
);
assert.doesNotMatch(pages.tags, /class="page-intro"/, "标签索引不得有栏目 intro 壳");
assert.doesNotMatch(pages.tags, /按主题浏览技术文章/, "标签索引不得有 intro 文案");
assert.match(pages.tags, /class="tag-cloud"/, "标签索引应为标签云");
assert.doesNotMatch(pages.tags, /class="tag-list"/, "标签索引不得使用旧网格列表");

const listedTagPostSlugs = html =>
  [...html.matchAll(/class="tag-post-title"[^>]*href="\/posts\/([^/]+)\/"/g)].map(
    ([, slug]) => slug,
  );
const tagCounts = Object.fromEntries(
  usedTags.map(({ name }) => [name, orderedPosts.filter(post => post.tags.includes(name)).length]),
);

for (const { name: tag, slug } of usedTags) {
  const count = tagCounts[tag];
  assert.match(
    pages.tags,
    new RegExp(
      `href="/tags/${escapeRegExp(slug)}/"[^>]*>[\\s\\S]*?${escapeRegExp(escapeHtml(tag))}[\\s\\S]*?<span[^>]*class="tag-count"[^>]*>${count}</span>`,
    ),
    `标签云应展示「${tag}」及计数 ${count}`,
  );
  const tagPage = pages[`tags/${slug}`];
  assert.match(
    tagPage,
    new RegExp(
      `<h1[^>]*\\bsr-only\\b[^>]*>${escapeRegExp(escapeHtml(tag))}</h1>|<h1[^>]*class="[^"]*\\bsr-only\\b[^"]*"[^>]*>${escapeRegExp(escapeHtml(tag))}</h1>`,
    ),
    `${tag} 详情页应保留无障碍页面名`,
  );
  assert.doesNotMatch(tagPage, /class="page-intro"/, `${tag} 详情页不得有栏目 intro 壳`);
  assert.doesNotMatch(
    tagPage,
    /class="post-list"|class="post-preview"/,
    `${tag} 详情不得复用预览列表壳`,
  );
  assert.match(tagPage, /class="tag-post-list"/, `${tag} 详情应为日期+标题列表`);
  assert.deepEqual(
    listedTagPostSlugs(tagPage),
    orderedPosts.filter(post => post.tags.includes(tag)).map(post => post.slug),
    `${tag} 标签页应只列出匹配的技术文章并保持发布时间倒序`,
  );
  for (const post of orderedPosts.filter(post => post.tags.includes(tag))) {
    const date = new Date(post.publishedAt);
    const isoDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    assert.match(
      tagPage,
      new RegExp(
        `<time datetime="${escapeRegExp(date.toISOString())}">${escapeRegExp(isoDate)}</time>[\\s\\S]*?class="tag-post-title"[^>]*href="/posts/${escapeRegExp(post.slug)}/"[^>]*>[\\s\\S]*?${escapeRegExp(escapeHtml(post.title))}`,
      ),
      `${tag} 列表应展示 ISO 日期与标题并链到 ${post.slug}`,
    );
    assert.doesNotMatch(
      tagPage,
      new RegExp(escapeRegExp(escapeHtml(post.description))),
      `${tag} 列表不得展示摘要：${post.slug}`,
    );
  }
  assert.doesNotMatch(tagPage, /不可公开的草稿/);
}

assert.match(pages.archives, /<title>归档 \| Jasper(?:'|&#39;)s Blog<\/title>/);
assert.match(
  pages.archives,
  /<h1[^>]*\bsr-only\b[^>]*>归档<\/h1>|<h1[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>归档<\/h1>/,
  "归档页应保留无障碍页面名",
);
assert.doesNotMatch(pages.archives, /class="page-intro"/, "归档页不得有栏目 intro 壳");
assert.doesNotMatch(pages.archives, /按发布时间浏览技术文章/, "归档页不得有 intro 文案");
assert.doesNotMatch(
  pages.archives,
  /class="post-list"|class="post-preview"/,
  "归档不得复用文章预览列表壳",
);
assert.match(pages.archives, /class="archive-timeline"/, "归档应为时间轴结构");
assert.match(pages.archives, /class="archive-card"/, "归档条目应为卡片");
assert.match(pages.archives, /<h2 id="archive-2026">2026 年<\/h2>/);
assert.deepEqual(
  listedArchiveSlugs(pages.archives),
  orderedPosts.map(({ slug }) => slug),
  "归档应按发布时间倒序，更新时间不得改变位置",
);
for (const { slug, title, description, publishedAt, tags } of orderedPosts) {
  const date = new Date(publishedAt);
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  assert.match(
    pages.archives,
    new RegExp(
      `<time datetime="${escapeRegExp(date.toISOString())}">${escapeRegExp(isoDate)}</time>[\\s\\S]*?class="archive-card-title"[^>]*href="/posts/${escapeRegExp(slug)}/"[^>]*>[\\s\\S]*?${escapeRegExp(escapeHtml(title))}`,
    ),
    `归档卡片应展示 ISO 日期与标题并链到 ${slug}`,
  );
  assert.doesNotMatch(
    pages.archives,
    new RegExp(escapeRegExp(escapeHtml(description))),
    `归档条目不得展示摘要：${slug}`,
  );
  if (tags.length > 0) {
    for (const tag of tags) {
      const tagSlug = tagSlugs.get(tag);
      assert.match(
        pages.archives,
        new RegExp(
          `href="/posts/${escapeRegExp(slug)}/"[\\s\\S]*?href="/tags/${escapeRegExp(tagSlug)}/"[^>]*>${escapeRegExp(escapeHtml(tag))}`,
        ),
        `归档卡片 ${slug} 应展示可点标签「${tag}」`,
      );
    }
  }
}
assert.doesNotMatch(pages.archives, /分类|categories/i, "归档不得展示分类路径");
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
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `/${route} 应有且仅有一个主标题`);
}

assert.match(pages[""], /<title>Jasper(?:'|&#39;)s Blog<\/title>/);
assert.match(pages[""], /<link rel="canonical" href="https:\/\/blog\.jasper0507\.cc\.cd\/">/);
assert.doesNotMatch(pages[""], /见了便做|做了便放下|了了有何不了/, "首页不得再展示禅语三行主视觉");
const heroImages = [...pages[""].matchAll(/<img\b[^>]*class="[^"]*hero-image[^"]*"[^>]*>/g)];
assert.equal(heroImages.length, 2, "首页主视觉应为亮色/暗色两张图");
assert.ok(
  heroImages.some(match => /class="[^"]*hero-image-light[^"]*"/.test(match[0])),
  "应包含亮色主视觉图",
);
assert.ok(
  heroImages.some(match => /class="[^"]*hero-image-dark[^"]*"/.test(match[0])),
  "应包含暗色主视觉图",
);
for (const match of heroImages) {
  assert.match(match[0], /\bsrc="\/images\/hero-(?:light|dark)\.[^"]+"/);
  assert.match(match[0], /\bwidth="\d+"/);
  assert.match(match[0], /\bheight="\d+"/);
  assert.match(match[0], /\balt="[^"]+"/);
}
const lightHeroSrc = heroImages
  .find(match => /hero-image-light/.test(match[0]))?.[0]
  .match(/\bsrc="([^"]+)"/)?.[1];
const darkHeroSrc = heroImages
  .find(match => /hero-image-dark/.test(match[0]))?.[0]
  .match(/\bsrc="([^"]+)"/)?.[1];
assert.ok(lightHeroSrc && darkHeroSrc, "亮/暗主视觉应能解析 src");
assert.notEqual(lightHeroSrc, darkHeroSrc, "亮色与暗色主视觉资源应不同");
await access(`dist${lightHeroSrc}`);
await access(`dist${darkHeroSrc}`);
assert.match(pages[""], /Talk is cheap\. Show me the code\./, "首页应展示可配置 caption");
assert.match(pages[""], /class="hero-caption"/);
assert.match(pages[""], /class="hero-media"/);
assert.match(pages[""], /id="theme-toggle"/);
assert.doesNotMatch(
  pages[""].match(/<header[\s\S]*?<\/header>/)?.[0] ?? "",
  /id="theme-toggle"/,
  "主题钮不得位于顶栏",
);
assert.match(
  pages[""],
  /class="post-preview shuoshuo-preview"[\s\S]*?<time datetime="[^"]+">\d{4}\.\d{2}\.\d{2}<\/time>[\s\S]*?<h3>[\s\S]*?href="\/shuoshuo\/#[^"]+"/,
  "首页说说预览应与文章同构：日期 + 可点首行",
);
assert.doesNotMatch(pages[""], /shuoshuo-summary/, "首页不再渲染折叠说说摘要块");
assert.match(pages[""], /最近文章/);
assert.match(pages[""], new RegExp(escapeRegExp(latestPost.title)));
assert.match(pages[""], new RegExp(`/posts/${latestPost.slug}/`));
const compactHomeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
  .format(new Date(latestPost.publishedAt))
  .replaceAll("-", ".");
assert.match(
  pages[""],
  new RegExp(
    `<time datetime="${new Date(latestPost.publishedAt).toISOString()}">${escapeRegExp(compactHomeDate)}</time>[\\s\\S]*?${escapeRegExp(escapeHtml(latestPost.title))}[\\s\\S]*?class="post-preview-description"[\\s\\S]*?${escapeRegExp(escapeHtml(latestPost.description))}`,
  ),
  "最近文章应为 YYYY.MM.DD + 标题 + 单行描述结构",
);
assert.equal(listedPostSlugs(pages[""]).length, 1, "首页最近文章仅展示 1 条");
assert.match(pages[""], /最近说说/);
assert.match(pages[""], /Talk is cheap\. Show me the code\./);
assert.doesNotMatch(pages[""], /暂无说说/, "已发布测试说说后首页不应再显示空态");
const articleMenu = pages[""].match(/<ul class="article-menu-list"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
assert.ok(articleMenu, "首页应包含文章菜单");
assert.deepEqual(
  [...articleMenu.matchAll(/href="([^"]+)"/g)].map(([, href]) => href),
  ["/archives/", "/tags/"],
);
assert.doesNotMatch(articleMenu, /全部文章|分类/);
assert.match(
  pages[""],
  new RegExp(`href="/archives/"[^>]*>查看全部 \\(${POST_MIGRATIONS.length}\\)</a>`),
  "文章「查看全部 (N)」应使用半角括号与已发布总数",
);
assert.match(
  pages[""],
  /href="\/shuoshuo\/"[^>]*>查看全部 \(1\)<\/a>/,
  "说说「查看全部 (N)」应为已发布总数",
);
assert.doesNotMatch(pages[""], /href="\/posts\/"[^>]*>查看全部/);
assert.doesNotMatch(pages[""], /查看全部（\d+）/, "不得使用全角括号");
await assert.rejects(access("dist/categories/index.html"), "不得生成分类索引页");
assert.match(pages.shuoshuo, /Talk is cheap\. Show me the code\./);
assert.doesNotMatch(pages.shuoshuo, /暂无说说/);
for (const fixtureText of [
  "这是发布时间最新的公开说说",
  "这是一条不应公开的草稿",
  "20250101-000001",
]) {
  assert.doesNotMatch(pages[""], new RegExp(fixtureText));
  assert.doesNotMatch(pages.shuoshuo, new RegExp(fixtureText));
  assert.doesNotMatch(sitemap, new RegExp(fixtureText));
}
assert.doesNotMatch(
  pages[""],
  /rel="preload"[^>]*noto-serif-sc-(?:115|117|118|119)/,
  "首页不再为禅语预加载专用字重分段",
);
await access("dist/fonts/noto-serif-sc-4.woff2");
assert.doesNotMatch(styles, /fonts\.(?:googleapis|gstatic)\.com/, "构建产物不得请求第三方字体服务");
assert.match(styles, /\.post-preview-description/, "最近文章描述应有单行截断样式钩子");
assert.match(styles, /\.feed-section\{[^}]*border-top:/, "分区线应为信息流栏满宽顶边线");
assert.doesNotMatch(styles, /\.feed-section::before/, "分区线不得使用短装饰伪元素");
assert.match(styles, /\.header-inner\{[^}]*border-bottom:/, "导航底线应落在内容壳 header-inner 上");
assert.match(styles, /\.footer-inner\{[^}]*border-top:/, "页脚线应落在内容壳 footer-inner 上");
assert.doesNotMatch(
  styles,
  /\.site-header\{[^}]*border-bottom:/,
  "导航底线不得整屏通栏画在 site-header 上",
);
assert.match(pages[""], /<script type="application\/ld\+json">/);
assert.match(pages[""], /"@type":"WebSite"/);
assert.match(pages.archives, /Markdown快速上手语法/);
assert.match(pages.archives, new RegExp(`/posts/${postSlug}/`));
assert.match(styles, /\.archive-timeline/, "归档时间轴应有样式合同");
assert.match(styles, /\.archive-card/, "归档卡片应有样式合同");
assert.doesNotMatch(pages[""], /不可公开的草稿/);
assert.doesNotMatch(pages.archives, /不可公开的草稿/);
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

await access("dist/pagefind/pagefind.js");
await access("dist/pagefind/pagefind-component-ui.js");
await access("dist/pagefind/pagefind-component-ui.css");
// 说说列表条目也带 data-pagefind-body；第二轮「仅搜技术文章」由 #16 收紧
assert.equal(
  searchIndex.languages["zh-cn"].page_count,
  POST_MIGRATIONS.length + 1,
  "Pagefind 应索引全部技术文章与已发布说说条目",
);
assert.match(pages.search, /<pagefind-searchbox[^>]*show-sub-results/);
assert.match(pages.search, /<pagefind-config[^>]*no-worker[^>]*lang="zh-cn"/);
assert.match(pages.search, /\/pagefind\/pagefind-component-ui\.js/);
assert.match(pages[""], /href="\/rss\.xml"[^>]*>RSS<\/a>/);

for (const { slug, title } of postMetadata) {
  assert.match(sitemap, new RegExp(`/posts/${slug}/`));
  assert.match(rss, new RegExp(escapeRegExp(escapeHtml(title))));
  assert.match(rss, new RegExp(`/posts/${slug}/`));
}
for (const slug of tagSlugs.values()) {
  const sitemapPath = new URL(`/tags/${slug}/`, "https://blog.jasper0507.cc.cd").pathname;
  assert.match(sitemap, new RegExp(escapeRegExp(sitemapPath)));
}
assert.doesNotMatch(sitemap, /<loc>https:\/\/blog\.jasper0507\.cc\.cd\/posts\/<\/loc>/);
assert.doesNotMatch(sitemap, /\/posts\/2\//);
assert.doesNotMatch(sitemap, /\/categories\//);
assert.doesNotMatch(sitemap, /\/shuoshuo\/#/);
assert.match(rss, /<rss version="2\.0"/);
assert.equal(
  (rss.match(/<item>/g) ?? []).length,
  POST_MIGRATIONS.length + 1,
  "RSS 应包含全部技术文章与已发布说说",
);
assert.match(rss, /Talk is cheap\. Show me the code\./);
assert.doesNotMatch(rss, /不可公开的草稿|draft-markdown-capabilities/);

for (const [route, html] of Object.entries(pages)) {
  const canonicalUrl = new URL(route ? `/${route}/` : "/", "https://blog.jasper0507.cc.cd").href;
  assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonicalUrl)}"`));
  assert.match(html, /<meta property="og:title" content="[^"]+">/);
  assert.match(html, /<meta property="og:description" content="[^"]+">/);
  assert.match(html, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonicalUrl)}"`));
}
assert.match(post, /<meta property="og:type" content="article">/);
assert.match(post, /"@type":"BlogPosting"/);

async function buildWithPostContent(contentDir, outDir) {
  return execFileAsync(
    process.execPath,
    [join(root, "node_modules/astro/bin/astro.mjs"), "build", "--force", "--outDir", outDir],
    {
      cwd: root,
      env: {
        ...process.env,
        POST_CONTENT_DIR: contentDir,
      },
    },
  );
}

const tagRulesOutDir = await mkdtemp(join(tmpdir(), "newblog-tag-rules-"));
try {
  await buildWithPostContent("./tests/fixtures/posts-tag-rules", tagRulesOutDir);
  const openPost = await readFile(join(tagRulesOutDir, "posts/open/index.html"), "utf8");
  const emptyPost = await readFile(join(tagRulesOutDir, "posts/empty/index.html"), "utf8");
  const tagsIndex = await readFile(join(tagRulesOutDir, "tags/index.html"), "utf8");
  const openTagDetail = await readFile(join(tagRulesOutDir, "tags/自由主题词/index.html"), "utf8");
  assert.match(openPost, /href="\/tags\/自由主题词\/"[^>]*>自由主题词<\/a>/);
  assert.match(tagsIndex, /class="tag-cloud"/);
  assert.match(
    tagsIndex,
    /href="\/tags\/自由主题词\/"[^>]*>[\s\S]*?自由主题词[\s\S]*?<span[^>]*class="tag-count"[^>]*>1<\/span>/,
  );
  assert.doesNotMatch(tagsIndex, /class="page-intro"/);
  assert.match(openTagDetail, /class="tag-post-list"/);
  assert.match(openTagDetail, /开放标签 fixture/);
  assert.doesNotMatch(openTagDetail, /class="page-intro"/);
  assert.doesNotMatch(openTagDetail, /空标签 fixture/, "标签详情只应列出带该标签的文章");
  assert.doesNotMatch(emptyPost, /aria-label="标签"/, "无标签时不应渲染标签区域");
  assert.doesNotMatch(emptyPost, /class="post-tags"/);
} finally {
  await rm(tagRulesOutDir, { recursive: true, force: true });
}

const emptyTagsOutDir = await mkdtemp(join(tmpdir(), "newblog-empty-tags-"));
try {
  await buildWithPostContent("./tests/fixtures/posts-empty-tags", emptyTagsOutDir);
  const tagsIndex = await readFile(join(emptyTagsOutDir, "tags/index.html"), "utf8");
  assert.match(tagsIndex, /class="empty-state"/, "无标签时应有空态");
  assert.match(tagsIndex, /暂无标签/);
  assert.doesNotMatch(tagsIndex, /class="tag-cloud"/, "无标签时不应渲染空标签云");
  assert.doesNotMatch(tagsIndex, /class="page-intro"/);
} finally {
  await rm(emptyTagsOutDir, { recursive: true, force: true });
}

const invalidTagOutDir = await mkdtemp(join(tmpdir(), "newblog-invalid-tag-"));
try {
  let buildError;
  try {
    await buildWithPostContent("./tests/fixtures/posts-invalid-tag", invalidTagOutDir);
  } catch (error) {
    buildError = error;
  }
  assert.ok(buildError, "无法生成有效 URL 的标签必须使构建失败");
} finally {
  await rm(invalidTagOutDir, { recursive: true, force: true });
}

console.log("构建产物验收通过");
