import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { access, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright-core";
import { fixtureSettings } from "./fixtures/blog-settings.mjs";
import { blogSettings } from "../src/lib/site.ts";
import { escapeXml } from "../src/lib/xml.ts";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const pagefind = join(root, "node_modules/.bin/pagefind");
const host = "http://127.0.0.1:4321";
const {
  site: expectedSite,
  author: expectedAuthor,
  home: expectedHome,
  footer: expectedFooter,
} = blogSettings;
const hasDarkHero = expectedHome.hero.darkImage !== expectedHome.hero.lightImage;
const expectedFooterLinks = author => [
  ["RSS", "/rss.xml"],
  ["GitHub", author.github],
  ["邮箱", `mailto:${author.email}`],
];
const routes = [
  "/",
  "/posts/visual/",
  "/shuoshuo/",
  "/tags/",
  "/tags/astro/",
  "/archives/",
  "/about/",
];
const visualRoutes = [
  ["home", "/"],
  ["post", "/posts/visual/"],
  ["shuoshuo", "/shuoshuo/"],
  ["tags", "/tags/"],
  ["tag", "/tags/astro/"],
  ["archives", "/archives/"],
  ["about", "/about/"],
];
const productionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./src/content/posts",
  SHUOSHUO_CONTENT_DIR: "./src/content/shuoshuo",
};
const fixtureEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
};
const tagCollisionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-tag-collision",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};

async function build(environment) {
  await execFileAsync(process.execPath, [astro, "build", "--force"], {
    cwd: root,
    env: environment,
  });
  await execFileAsync(pagefind, ["--site", "dist", "--glob", "posts/**/*.html"], { cwd: root });
}

async function buildSettingsFixture(name, content) {
  const output = fileURLToPath(new URL(`../dist-${name}/`, import.meta.url));
  try {
    await execFileAsync(
      process.execPath,
      [astro, "build", "--force", "--config", "scripts/fixtures/astro-blog-settings.config.mjs"],
      {
        cwd: root,
        env: {
          ...fixtureEnvironment,
          BLOG_SETTINGS_FIXTURE: name,
          BLOG_SETTINGS_FOOTER_CONTENT: content,
        },
      },
    );
    const assets = join(output, "_astro");
    const css = await Promise.all(
      (await readdir(assets))
        .filter(file => file.endsWith(".css"))
        .map(file => readFile(join(assets, file), "utf8")),
    );
    return {
      home: await readFile(join(output, "index.html"), "utf8"),
      about: await readFile(join(output, "about/index.html"), "utf8"),
      shuoshuo: await readFile(join(output, "shuoshuo/index.html"), "utf8"),
      tags: await readFile(join(output, "tags/index.html"), "utf8"),
      archives: await readFile(join(output, "archives/index.html"), "utf8"),
      post: await readFile(join(output, "posts/visual/index.html"), "utf8"),
      rss: await readFile(join(output, "rss.xml"), "utf8"),
      sitemap: await readFile(join(output, "sitemap.xml"), "utf8"),
      css: css.join("\n"),
    };
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}

async function footerLinks(page) {
  return page
    .locator(".site-footer ul a")
    .evaluateAll(links => links.map(link => [link.textContent?.trim(), link.getAttribute("href")]));
}

async function assertFooterLayout(page, width) {
  assert.equal(
    await page
      .locator(".footer-inner")
      .evaluate(element => getComputedStyle(element).flexDirection),
    width <= 480 ? "column" : "row",
  );
}

async function checkFooterFixture(browser, fixture, hasContent) {
  for (const width of [1440, 375]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 960 } });
      const page = await context.newPage();
      await page.setContent(fixture.home);
      await page.addStyleTag({ content: fixture.css });
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      assert.equal(await page.locator(".footer-content").count(), hasContent ? 1 : 0);
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
    }
  }
}

async function checkDarkSearchTrigger(page) {
  await page.waitForFunction(
    () =>
      customElements.get("pagefind-modal-trigger") &&
      document.querySelector("pagefind-modal-trigger .pf-trigger-btn"),
  );
  const shell = page.locator("pagefind-modal-trigger");
  const trigger = page.getByRole("button", { name: "搜索" });
  const icon = trigger.locator(".pf-trigger-icon");
  assert.equal(await trigger.getAttribute("aria-keyshortcuts"), "/");
  assert.equal(
    await shell.evaluate(element => getComputedStyle(element).colorScheme),
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
  );
  assert.deepEqual(
    await icon.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, getComputedStyle(element.parentElement).color];
    }),
    ["rgb(232, 230, 222)", "rgb(232, 230, 222)"],
  );
  await trigger.focus();
  assert.notEqual(
    await trigger.evaluate(element => getComputedStyle(element).outlineStyle),
    "none",
  );
  await trigger.hover();
  await page.waitForTimeout(200);
  assert.deepEqual(
    await trigger.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.color, style.borderBottomColor, style.borderBottomWidth];
    }),
    ["rgb(217, 119, 87)", "rgb(217, 119, 87)", "2px"],
  );
  assert.equal(
    await icon.evaluate(element => getComputedStyle(element).backgroundColor),
    "rgb(217, 119, 87)",
  );
  await page.mouse.move(0, 0);
}

async function checkSettingsFixture(browser, fixture) {
  const page = await browser.newPage();
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
  assert.match(await page.locator(".footer-content").textContent(), /^超长页脚/);
  assert.deepEqual(
    JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()),
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: fixtureSettings.site.title,
      url: fixtureSettings.site.url,
      inLanguage: "zh-CN",
    },
  );

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
  const structuredData = JSON.parse(
    await page.locator('script[type="application/ld+json"]').textContent(),
  );
  assert.equal(structuredData.author.name, fixtureSettings.author.name);
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    new URL("/posts/visual/", fixtureSettings.site.url).href,
  );
  await page.close();

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
}

async function checkBuildFailure(environment, expected) {
  let error;
  try {
    await build(environment);
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, "无效技术文章应使构建失败");
  assert.match(`${error.stdout ?? ""}${error.stderr ?? ""}`, expected);
}

function assertInOrder(source, needles, message) {
  let previous = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > previous, `${message}：${needle}`);
    previous = index;
  }
}

async function waitForServer(server) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(host);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  server.kill("SIGTERM");
  throw new Error(`Astro 预览服务器未启动：${lastError?.message ?? "未知错误"}`);
}

async function checkFixture(browser, footerFixtures) {
  const home = await readFile("dist/index.html", "utf8");
  const timeline = await readFile("dist/shuoshuo/index.html", "utf8");
  const archive = await readFile("dist/archives/index.html", "utf8");
  const tags = await readFile("dist/tags/index.html", "utf8");
  const rss = await readFile("dist/rss.xml", "utf8");
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  const searchIndex = JSON.parse(await readFile("dist/pagefind/pagefind-entry.json", "utf8"));

  assert.ok(rss.includes(`<title>${escapeXml(expectedSite.title)}</title>`));
  assert.ok(rss.includes(`<link>${escapeXml(expectedSite.url)}</link>`));
  assert.ok(rss.includes(`<description>${escapeXml(expectedSite.description)}</description>`));
  assert.ok(sitemap.includes(`<loc>${escapeXml(expectedSite.url)}</loc>`));
  assert.match(home, /同时发布的 Alpha 技术文章/);
  assert.match(home, /这是发布时间最新的公开说说/);
  assert.doesNotMatch(home, /不应公开的技术文章草稿|这是一条不应公开的草稿/);
  assert.match(timeline, /id="20250101-000001"/);
  assert.doesNotMatch(timeline, /20260103-080000|这是一条不应公开的草稿/);
  assertInOrder(
    timeline,
    ['id="20260102-080000"', 'id="20250102-000000"'],
    "说说发布时间相同时应按稳定 ID 降序排列",
  );
  assertInOrder(
    archive,
    ["/posts/alpha/", "/posts/visual/", "/posts/older/"],
    "归档应按发布时间降序、同时间按 slug 升序",
  );
  assert.match(archive, /datetime="2026-01-01T16:00:00.000Z"[^>]*>\s*2026-01-02/);
  assertInOrder(tags, ['href="/tags/共同/"', 'href="/tags/astro/"'], "同数量标签应按 zh-CN 排序");
  assert.match(tags, /href="\/tags\/astro\/"/);
  assert.equal((rss.match(/<item>/g) ?? []).length, 6);
  assertInOrder(
    rss,
    ["同时发布的 Alpha 技术文章", "视觉验收专用技术文章"],
    "RSS 应保持技术文章顺序",
  );
  assert.match(rss, /<description>这是发布时间最新的公开说说。[^<]+<\/description>/);
  assert.doesNotMatch(rss, /这里继续放入足够长的正文/);
  assert.match(sitemap, /\/posts\/alpha\//);
  assert.match(sitemap, /\/tags\/astro\//);
  assert.doesNotMatch(`${archive}${tags}${rss}${sitemap}`, /不应公开的技术文章草稿|草稿标签/);
  assert.equal(searchIndex.languages["zh-cn"].page_count, 3);

  await checkSettingsFixture(browser, footerFixtures.long);
  await checkFooterFixture(browser, footerFixtures.long, true);
  await checkFooterFixture(browser, footerFixtures.empty, false);

  for (const width of [1440, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 960 } });
    for (const path of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
      });
      const response = await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
      assert.equal(response?.ok(), true, `${path} 应可访问`);
      assert.equal(await page.locator("h1").count(), 1, `${path} 应有一个 h1`);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
        `${width}px ${path} 不得横向溢出`,
      );
      assert.deepEqual(errors, [], `${path} 不得有页面错误`);
      await page.close();
    }
    await context.close();
  }

  await Promise.all(
    visualRoutes.map(([name]) => mkdir(`artifacts/visual/${name}`, { recursive: true })),
  );
  for (const width of [1440, 375]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 960 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      for (const [name, path] of visualRoutes) {
        await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (path === "/") {
          const visibleHero = hasDarkHero ? `.hero-image-${theme}` : ".hero-image";
          assert.equal(
            await page.locator(visibleHero).evaluate(element => getComputedStyle(element).display),
            "block",
          );
          await assertFooterLayout(page, width);
          if (theme === "dark") await checkDarkSearchTrigger(page);
        }
        await page.screenshot({
          path: `artifacts/visual/${name}/${name}-${width}-${theme}.png`,
          fullPage: true,
        });
      }
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.goto(host, { waitUntil: "networkidle" });

  const heroFrame = page.locator(".hero-media");
  const heroImages = page.locator(".hero-image");
  const heroImage = heroImages.first();
  assert.equal(await page.locator(".hero-caption").textContent(), expectedHome.hero.caption);
  assert.equal(await heroImages.count(), hasDarkHero ? 2 : 1);
  assert.deepEqual(
    await heroImages.evaluateAll(images => images.map(image => image.getAttribute("src"))),
    [expectedHome.hero.lightImage, ...(hasDarkHero ? [expectedHome.hero.darkImage] : [])],
  );
  assert.equal(await heroImage.getAttribute("alt"), expectedHome.hero.alt);
  const favicon = page.locator('link[rel="icon"]');
  assert.equal(await favicon.count(), expectedSite.favicon ? 1 : 0);
  if (expectedSite.favicon) assert.equal(await favicon.getAttribute("href"), expectedSite.favicon);
  await heroImage.evaluate(image => {
    image.src = "/images/posts/transformer-paper-notes/attention-mechanism.png";
  });
  await heroImage.evaluate(image => image.decode());
  const crop = await heroImage.evaluate(image => {
    const frame = image.parentElement.getBoundingClientRect();
    const bounds = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    return {
      frameRatio: frame.width / frame.height,
      imageRatio: bounds.width / bounds.height,
      naturalRatio: image.naturalWidth / image.naturalHeight,
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
    };
  });
  assert.ok(Math.abs(crop.naturalRatio - 1.5) > 0.1, "裁切检查应使用非 3:2 图片");
  assert.ok(Math.abs(crop.frameRatio - 1.5) < 0.01, "主视觉区域应固定为 3:2");
  assert.ok(Math.abs(crop.imageRatio - 1.5) < 0.01, "主视觉图片应填满 3:2 区域");
  assert.deepEqual([crop.objectFit, crop.objectPosition], ["cover", "50% 50%"]);
  assert.equal(await heroFrame.evaluate(element => getComputedStyle(element).overflow), "hidden");

  assert.equal(await page.title(), expectedSite.title);
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    expectedSite.description,
  );
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), expectedSite.url);
  assert.equal(
    await page.locator('meta[property="og:site_name"]').getAttribute("content"),
    expectedSite.title,
  );
  assert.equal(
    await page.locator('meta[property="og:title"]').getAttribute("content"),
    expectedSite.title,
  );
  assert.equal(
    await page.locator('meta[property="og:description"]').getAttribute("content"),
    expectedSite.description,
  );
  assert.equal(
    await page.locator('meta[property="og:url"]').getAttribute("content"),
    expectedSite.url,
  );
  assert.equal(await page.locator(".brand").textContent(), expectedSite.headerTitle);
  assert.equal(
    await page.locator(".brand").getAttribute("aria-label"),
    `${expectedSite.headerTitle} 首页`,
  );
  assert.deepEqual(await footerLinks(page), expectedFooterLinks(expectedAuthor));
  assert.equal(await page.locator(".footer-content").innerHTML(), expectedFooter.html);

  const menuTrigger = page.locator("#article-menu-trigger");
  const menu = page.locator("#article-menu-list");
  await menuTrigger.click();
  await menu.waitFor({ state: "visible" });
  assert.equal(await menu.evaluate(element => element.matches(":popover-open")), true);
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  assert.equal(await menuTrigger.evaluate(element => element === document.activeElement), true);

  const themeToggle = page.locator("#theme-toggle");
  await themeToggle.click();
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");

  await page.goto(`${host}/about/`);
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    `关于 ${expectedAuthor.name} 与 ${expectedSite.title}。`,
  );
  assert.deepEqual(await page.locator("main p").allTextContents(), [
    "我是 Jasper。",
    "这里是我的个人网站，以技术文章为核心，也用说说记录轻量的想法。",
  ]);
  assert.equal(await page.locator("main a").count(), 0, "关于正文不应自动追加联系方式");

  await page.goto(`${host}/shuoshuo/`);
  const shuoshuoToggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  await shuoshuoToggle.waitFor({ state: "visible" });
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "true");
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "false");

  await page.goto(`${host}/tags/`);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  const tagCloud = page.locator(".tag-cloud");
  const tagChip = tagCloud.locator("a").first();
  assert.deepEqual(
    await tagCloud.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.display, style.flexWrap];
    }),
    ["flex", "wrap"],
    "标签云应换行排列",
  );
  assert.deepEqual(
    await tagChip.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.borderTopWidth, style.borderTopStyle];
    }),
    ["rgb(250, 249, 245)", "1px", "solid"],
    "标签 chip 应使用纸面背景与细边框",
  );
  await tagChip.hover();
  await page.waitForTimeout(200);
  assert.match(
    await tagChip.evaluate(element => getComputedStyle(element).transform),
    /^matrix\(1\.04, 0, 0, 1\.04, 0, 0\)$/,
    "标签 chip 悬停时应放大",
  );

  await page.goto(`${host}/posts/alpha/`);
  assert.equal(await page.locator(".post-toc").count(), 0, "无 h2/h3 时不应渲染目录");

  await page.goto(`${host}/posts/visual/`);
  const postStructuredData = JSON.parse(
    await page.locator('script[type="application/ld+json"]').textContent(),
  );
  assert.equal(await page.locator(".post-meta time").textContent(), "2026.01.02");
  assert.equal(
    await page.locator(".post-meta time").getAttribute("datetime"),
    "2026-01-01T16:00:00.000Z",
  );
  assert.equal(postStructuredData.datePublished, "2026-01-01T16:00:00.000Z");
  assert.equal("dateModified" in postStructuredData, false);
  assert.deepEqual(postStructuredData.author, {
    "@type": "Person",
    name: expectedAuthor.name,
  });
  const toc = page.locator(".post-toc");
  const tocLinks = toc.locator('a[href^="#"]');
  assert.deepEqual(
    await tocLinks.evaluateAll(links => links.map(link => link.getAttribute("href"))),
    ["#第一节", "#第一节子节", "#第二节"],
    "目录应按正文顺序包含 h2/h3 并排除脚注标题",
  );
  assert.deepEqual(
    await tocLinks.evaluateAll(links =>
      links.map(link => document.getElementById(link.getAttribute("href").slice(1)) !== null),
    ),
    [true, true, true],
    "每个目录链接都应对应真实标题 ID",
  );
  assert.equal(await toc.locator('a[aria-current="true"]').count(), 1, "目录初始应有一个当前项");
  assert.equal(await toc.locator('[aria-current="true"]').getAttribute("href"), "#第一节");

  await page.setViewportSize({ width: 1279, height: 960 });
  assert.equal(await toc.evaluate(element => getComputedStyle(element).display), "none");
  await page.setViewportSize({ width: 1280, height: 960 });
  assert.equal(await toc.evaluate(element => getComputedStyle(element).display), "block");

  const subsection = page.locator(".post-body h3[id]").first();
  const subsectionId = await subsection.getAttribute("id");
  assert.ok(subsectionId);
  await subsection.evaluate(element =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${subsectionId}`,
  );

  const secondHeading = page.locator(".post-body h2[id]").nth(1);
  const secondHeadingId = await secondHeading.getAttribute("id");
  assert.ok(secondHeadingId);
  await secondHeading.evaluate(element =>
    element.scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${secondHeadingId}`,
  );
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${secondHeadingId}`,
    "滚到页尾后应保持末节为当前项",
  );

  await page.goto(host);
  await page.waitForFunction(
    () =>
      customElements.get("pagefind-modal-trigger") &&
      document.querySelector("pagefind-modal-trigger .pf-trigger-btn"),
  );
  const searchTrigger = page.getByRole("button", { name: "搜索" });
  const searchInput = page.locator("pagefind-modal input").first();
  await page.keyboard.press("/");
  await searchInput.waitFor({ state: "visible" });
  assert.equal(await searchInput.evaluate(element => element === document.activeElement), true);
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document
        .querySelector("pagefind-modal-trigger .pf-trigger-btn")
        ?.getAttribute("aria-expanded") === "false",
  );
  assert.equal(await searchTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(await searchTrigger.evaluate(element => element === document.activeElement), true);
  await searchTrigger.click();
  await searchInput.fill("视觉验收专用技术文章");
  const result = page
    .locator("pagefind-results a, dialog.pf-modal a")
    .filter({ hasText: "视觉验收专用技术文章" })
    .first();
  await result.waitFor({ state: "visible" });
  assert.equal(new URL(await result.getAttribute("href"), host).pathname, "/posts/visual/");
  await context.close();
}

async function checkProduction() {
  for (const route of ["", "shuoshuo", "tags", "archives", "about"]) {
    await access(`dist/${route ? `${route}/` : ""}index.html`);
  }
  await Promise.all([
    access("dist/rss.xml"),
    access("dist/sitemap.xml"),
    access("dist/pagefind/pagefind.js"),
  ]);
  const postDirectories = (await readdir("dist/posts", { withFileTypes: true })).filter(
    entry => entry.isDirectory() && entry.name !== "2",
  );
  const searchIndex = JSON.parse(await readFile("dist/pagefind/pagefind-entry.json", "utf8"));
  assert.equal(searchIndex.languages["zh-cn"].page_count, postDirectories.length);
  await assert.rejects(access("dist/categories/index.html"));
}

const footerFixtures = {
  long: await buildSettingsFixture(
    "footer-long",
    `超长页脚 ${"不换行文字".repeat(80)} [${"超长链接".repeat(120)}](https://example.com/)`,
  ),
  empty: await buildSettingsFixture("footer-empty", ""),
};
await build(fixtureEnvironment);
const server = spawn(
  process.execPath,
  [astro, "preview", "--host", "127.0.0.1", "--port", "4321"],
  { cwd: root, stdio: "inherit" },
);

try {
  await waitForServer(server);
  const browser = await chromium.launch({ headless: true });
  try {
    await checkFixture(browser, footerFixtures);
  } finally {
    await browser.close();
  }
} finally {
  server.kill("SIGTERM");
  await checkBuildFailure(tagCollisionEnvironment, /生成了相同的网址/);
  await build(productionEnvironment);
}

await checkProduction();
console.log("站点构建、交互与截图冒烟通过");
