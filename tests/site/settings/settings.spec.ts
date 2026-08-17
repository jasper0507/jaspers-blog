import assert from "node:assert/strict";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import { fixtureSettings } from "../../../scripts/fixtures/blog-settings.mjs";
import { escapeXml } from "../../../src/lib/xml.ts";
import {
  assertFooterLayout,
  astro,
  execFileAsync,
  expectedFooterLinks,
  expectedSite,
  fixtureEnvironment,
  footerLinks,
  root,
  shanghaiYear,
} from "../helpers.ts";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

type SettingsFixture = {
  home: string;
  about: string;
  shuoshuo: string;
  tags: string;
  archives: string;
  post: string;
  rss: string;
  sitemap: string;
  css: string;
};

let fixture!: SettingsFixture;

test.beforeAll(async () => {
  const output = join(root, "dist-settings");
  try {
    await execFileAsync(
      process.execPath,
      [astro, "build", "--force", "--config", "scripts/fixtures/astro-blog-settings.config.mjs"],
      {
        cwd: root,
        env: { ...fixtureEnvironment, BLOG_SETTINGS_FIXTURE: "settings" },
      },
    );
    const assets = join(output, "_astro");
    const css = await Promise.all(
      (await readdir(assets))
        .filter(file => file.endsWith(".css"))
        .map(file => readFile(join(assets, file), "utf8")),
    );
    fixture = {
      home: await readFile(join(output, "index.html"), "utf8"),
      about: await readFile(join(output, "about/index.html"), "utf8"),
      shuoshuo: await readFile(join(output, "shuoshuo/index.html"), "utf8"),
      tags: await readFile(join(output, "tags/index.html"), "utf8"),
      archives: await readFile(join(output, "archives/index.html"), "utf8"),
      post: await readFile(join(output, "posts/visual/index.html"), "utf8"),
      rss: await readFile(join(output, "rss.xml"), "utf8"),
      sitemap: await readFile(join(output, "sitemap-0.xml"), "utf8"),
      css: css.join("\n"),
    };
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("首页读取集中博客设置", async ({ page }) => {
  await page.setContent(fixture.home);
  assert.equal(await page.title(), fixtureSettings.site.title);
  assert.equal(await page.locator(".brand").textContent(), fixtureSettings.site.headerTitle);
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    fixtureSettings.site.description,
  );
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    fixtureSettings.site.url,
  );
  assert.equal(
    await page.locator('meta[property="og:site_name"]').getAttribute("content"),
    fixtureSettings.site.title,
  );
  assert.equal(
    await page.locator('meta[property="og:title"]').getAttribute("content"),
    fixtureSettings.site.title,
  );
  assert.equal(
    await page.locator('meta[property="og:description"]').getAttribute("content"),
    fixtureSettings.site.description,
  );
  assert.equal(
    await page.locator('meta[property="og:url"]').getAttribute("content"),
    fixtureSettings.site.url,
  );
  assert.equal(
    await page.locator(".hero-caption").textContent(),
    fixtureSettings.home.hero.caption,
  );
  assert.equal(
    await page.locator(".hero-image").getAttribute("src"),
    fixtureSettings.home.hero.lightImage,
  );
  assert.equal(
    await page.locator(".hero-image").getAttribute("alt"),
    fixtureSettings.home.hero.alt,
  );
  assert.equal(
    await page.locator('link[rel="icon"]').getAttribute("href"),
    fixtureSettings.site.favicon,
  );
  assert.equal(await page.locator(".hero-image").count(), 1, "暗图缺省时不应重复输出亮色资源");
  assert.equal(
    await page.locator(".footer-content").textContent(),
    `© ${shanghaiYear()} ${fixtureSettings.author.name}. 保留所有权利。`,
  );
  const websiteDataText = await page.locator('script[type="application/ld+json"]').textContent();
  assert.ok(websiteDataText, "首页应输出站点结构化数据");
  assert.deepEqual(JSON.parse(websiteDataText), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: fixtureSettings.site.title,
    url: fixtureSettings.site.url,
    inLanguage: "zh-CN",
  });
});

test("各页元信息读取集中博客设置", async ({ page }) => {
  await page.setContent(fixture.about);
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    `关于 ${fixtureSettings.author.name} 与 ${fixtureSettings.site.title}。`,
  );
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    new URL("/about/", fixtureSettings.site.url).href,
  );

  for (const [html, description] of [
    [fixture.shuoshuo, `${fixtureSettings.author.name} 发布的轻量文字与照片内容。`],
    [fixture.tags, `按标签浏览 ${fixtureSettings.author.name} 的技术文章。`],
    [fixture.archives, `按时间浏览 ${fixtureSettings.author.name} 的技术文章。`],
  ]) {
    await page.setContent(html);
    assert.equal(
      await page.locator('meta[name="description"]').getAttribute("content"),
      description,
    );
  }

  await page.setContent(fixture.post);
  const postDataText = await page.locator('script[type="application/ld+json"]').textContent();
  assert.ok(postDataText, "技术文章应输出结构化数据");
  const structuredData = JSON.parse(postDataText);
  assert.equal(structuredData.author.name, fixtureSettings.author.name);
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    new URL("/posts/visual/", fixtureSettings.site.url).href,
  );
});

test("RSS 与站点地图读取集中博客设置", async () => {
  assert.ok(fixture.rss.includes(`<title>${escapeXml(fixtureSettings.site.title)}</title>`));
  assert.ok(fixture.rss.includes(`<link>${escapeXml(fixtureSettings.site.url)}</link>`));
  assert.ok(
    fixture.rss.includes(
      `<description>${escapeXml(fixtureSettings.site.description)}</description>`,
    ),
  );
  const rssLinks = [...fixture.rss.matchAll(/<link>([^<]+)<\/link>/g)].map(match => match[1]);
  assert.ok(rssLinks.every(link => link.startsWith(fixtureSettings.site.url)));
  const sitemapUrls = [...fixture.sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(sitemapUrls.length > 1);
  assert.ok(sitemapUrls.every(url => url.startsWith(fixtureSettings.site.url)));
  assert.equal(
    Object.values(fixture).join("").includes(expectedSite.url),
    false,
    "自定义设置 fixture 不得泄漏当前博客正式网址",
  );
});

for (const width of [1440, 375]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${width}px ${theme} 页脚读取集中设置且不溢出`, async ({ browser }) => {
      const copyright = `© ${shanghaiYear()} ${fixtureSettings.author.name}. 保留所有权利。`;
      const context = await browser.newContext({ viewport: { width, height: 960 } });
      const page = await context.newPage();
      await page.setContent(fixture.home);
      await page.addStyleTag({ content: fixture.css });
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      assert.equal(await page.locator(".footer-content").textContent(), copyright);
      assert.deepEqual(await footerLinks(page), expectedFooterLinks(fixtureSettings.author));
      await assertFooterLayout(page, width);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${width}px ${theme} 页脚不得横向溢出`,
      );
      assert.equal(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
        theme,
      );
      await context.close();
    });
  }
}
