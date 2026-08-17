import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
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
  pagefind,
  root,
  settingsHost,
  settingsPort,
  shanghaiYear,
} from "../helpers.ts";

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const output = join(root, "dist-settings");
const settingsEnv = { ...fixtureEnvironment, BLOG_SETTINGS_FIXTURE: "settings" };

type SettingsOutput = {
  rss: string;
  sitemap: string;
  html: string;
};

let built!: SettingsOutput;
let preview: ChildProcess | undefined;

async function waitForPreview(server: ChildProcess, url: string) {
  const timeoutMs = 60_000;
  const started = Date.now();
  let exitCode: number | null = null;
  server.once("exit", (code, signal) => {
    exitCode = code ?? (signal ? 1 : 0);
  });
  while (Date.now() - started < timeoutMs) {
    if (exitCode !== null) throw new Error(`设置预览进程提前退出，code=${exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 预览尚未监听
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`设置预览未就绪：${url}`);
}

test.beforeAll(async () => {
  await execFileAsync(
    process.execPath,
    [astro, "build", "--force", "--config", "scripts/fixtures/astro-blog-settings.config.mjs"],
    { cwd: root, env: settingsEnv },
  );
  await execFileAsync(pagefind, ["--site", "dist-settings", "--glob", "posts/**/*.html"], {
    cwd: root,
  });
  built = {
    rss: await readFile(join(output, "rss.xml"), "utf8"),
    sitemap: await readFile(join(output, "sitemap-0.xml"), "utf8"),
    html: (
      await Promise.all(
        [
          "index.html",
          "about/index.html",
          "shuoshuo/index.html",
          "tags/index.html",
          "archives/index.html",
          "posts/visual/index.html",
        ].map(path => readFile(join(output, path), "utf8")),
      )
    ).join(""),
  };
  preview = spawn(
    process.execPath,
    [
      astro,
      "preview",
      "--config",
      "scripts/fixtures/astro-blog-settings.config.mjs",
      "--host",
      "127.0.0.1",
      "--port",
      String(settingsPort),
    ],
    { cwd: root, env: settingsEnv, stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await waitForPreview(preview, `${settingsHost}/`);
  } catch (error) {
    preview.kill("SIGTERM");
    preview = undefined;
    throw error;
  }
});

test.afterAll(async () => {
  if (preview) {
    preview.kill("SIGTERM");
    await new Promise(resolve => preview?.once("exit", resolve));
  }
  await rm(output, { recursive: true, force: true });
});

test("首页读取集中博客设置", async ({ page }) => {
  await page.goto(settingsHost, { waitUntil: "networkidle" });
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
  await page.goto(`${settingsHost}/about/`);
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    `关于 ${fixtureSettings.author.name} 与 ${fixtureSettings.site.title}。`,
  );
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    new URL("/about/", fixtureSettings.site.url).href,
  );

  for (const [path, description] of [
    ["/shuoshuo/", `${fixtureSettings.author.name} 发布的轻量文字与照片内容。`],
    ["/tags/", `按标签浏览 ${fixtureSettings.author.name} 的技术文章。`],
    ["/archives/", `按时间浏览 ${fixtureSettings.author.name} 的技术文章。`],
  ]) {
    await page.goto(`${settingsHost}${path}`);
    assert.equal(
      await page.locator('meta[name="description"]').getAttribute("content"),
      description,
    );
  }

  await page.goto(`${settingsHost}/posts/visual/`);
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
  assert.ok(built.rss.includes(`<title>${escapeXml(fixtureSettings.site.title)}</title>`));
  assert.ok(built.rss.includes(`<link>${escapeXml(fixtureSettings.site.url)}</link>`));
  assert.ok(
    built.rss.includes(`<description>${escapeXml(fixtureSettings.site.description)}</description>`),
  );
  const rssLinks = [...built.rss.matchAll(/<link>([^<]+)<\/link>/g)].map(match => match[1]);
  assert.ok(rssLinks.every(link => link.startsWith(fixtureSettings.site.url)));
  const sitemapUrls = [...built.sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(sitemapUrls.length > 1);
  assert.ok(sitemapUrls.every(url => url.startsWith(fixtureSettings.site.url)));
  assert.equal(
    `${built.html}${built.rss}${built.sitemap}`.includes(expectedSite.url),
    false,
    "自定义设置 fixture 不得泄漏当前博客正式网址",
  );
});

for (const width of [1440, 375]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${width}px ${theme} 页脚读取集中设置且不溢出`, async ({ browser }) => {
      const copyright = `© ${shanghaiYear()} ${fixtureSettings.author.name}. 保留所有权利。`;
      const context = await browser.newContext({
        viewport: { width, height: 960 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(settingsHost, { waitUntil: "networkidle" });
      await page.evaluate(nextTheme => {
        document.documentElement.dataset.theme = nextTheme;
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
