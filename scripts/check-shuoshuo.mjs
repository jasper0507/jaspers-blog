import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const pagefind = join(root, "node_modules/.bin/pagefind");
const temporaryDirectory = await mkdtemp(join(root, ".shuoshuo-fixture-"));
const outDir = join(temporaryDirectory, "dist");
const emptyPostsDirectory = join(temporaryDirectory, "empty-posts");
const emptyShuoshuoDirectory = join(temporaryDirectory, "empty-shuoshuo");
const fixtureEnvironment = {
  ...process.env,
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
};
const buildSearchFixture = async (directory, environment) => {
  await execFileAsync(process.execPath, [astro, "build", "--force", "--outDir", directory], {
    cwd: root,
    env: environment,
  });
  try {
    await execFileAsync(pagefind, ["--site", directory, "--glob", "posts/**/*.html"], {
      cwd: root,
    });
  } catch {
    // 无技术文章时 Pagefind 无法建索引；视为 0 页。
  }
};
const getIndexedPageCount = async directory => {
  try {
    const entry = JSON.parse(
      await readFile(join(directory, "pagefind/pagefind-entry.json"), "utf8"),
    );
    return Object.values(entry.languages).reduce((sum, language) => sum + language.page_count, 0);
  } catch {
    return 0;
  }
};

try {
  await Promise.all([mkdir(emptyPostsDirectory), mkdir(emptyShuoshuoDirectory)]);
  await buildSearchFixture(outDir, fixtureEnvironment);

  const home = await readFile(join(outDir, "index.html"), "utf8");
  const timeline = await readFile(join(outDir, "shuoshuo/index.html"), "utf8");
  const rss = await readFile(join(outDir, "rss.xml"), "utf8");
  const timelineStyles = (
    await Promise.all(
      [...timeline.matchAll(/<link rel="stylesheet" href="([^"]+\.css)">/g)].map(([, href]) =>
        readFile(join(outDir, href.slice(1)), "utf8"),
      ),
    )
  ).join("\n");
  const searchIndex = JSON.parse(
    await readFile(join(outDir, "pagefind/pagefind-entry.json"), "utf8"),
  );
  const stableId = "20250101-000001";
  const olderId = "20260102-080000";
  const draftId = "20260103-080000";

  assert.match(home, new RegExp(`/shuoshuo/#${stableId}`));
  assert.match(home, /这是发布时间最新的公开说说/);
  assert.match(
    home,
    /class="post-preview shuoshuo-preview"[\s\S]*?<time datetime="[^"]+">\d{4}\.\d{2}\.\d{2}<\/time>[\s\S]*?这是发布时间最新的公开说说/,
    "首页说说应为日期 + 正文首行预览",
  );
  assert.doesNotMatch(home, /shuoshuo-summary/, "首页不再使用折叠摘要块");
  assert.doesNotMatch(home, /这是一条不应公开的草稿/);
  assert.ok(
    timeline.indexOf(stableId) < timeline.indexOf(olderId),
    "说说应按发布时间而非稳定 ID 倒序",
  );
  assert.match(timeline, new RegExp(`id="${stableId}"`));
  assert.match(timeline, /说说 · 2026年2月3日 09:30/);
  assert.match(
    timeline,
    new RegExp(`<h2 class="sr-only" id="${stableId}">说说 · 2026年2月3日 09:30</h2>`),
  );
  assert.match(
    timeline,
    /<h1[^>]*\bsr-only\b[^>]*>说说<\/h1>|<h1[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>说说<\/h1>/,
    "说说页应保留无障碍页面名",
  );
  assert.doesNotMatch(timeline, /class="page-intro"/, "说说页不得有栏目 intro 壳");
  assert.match(timeline, /class="shuoshuo-card"/, "说说列表条目应为纸面卡片");
  assert.doesNotMatch(timeline, /data-pagefind-body/, "说说不得进入 Pagefind 索引");
  assert.match(timeline, /data-shuoshuo-toggle/);
  assert.doesNotMatch(
    timeline,
    /class="shuoshuo-body"[^>]*data-collapsed/,
    "无脚本时长说说应保持完整可读",
  );
  assert.match(timeline, /https:\/\/example\.com\/fixture-photo\.jpg/);
  assert.match(timeline, /class="katex"/, "说说应渲染 KaTeX markup");
  assert.match(
    timelineStyles,
    /font-family:KaTeX_Main/,
    "说说页面实际加载的 CSS 应包含 KaTeX 基础规则",
  );
  assert.doesNotMatch(timeline, new RegExp(draftId));
  assert.doesNotMatch(timeline, /这是一条不应公开的草稿/);
  assert.equal(
    searchIndex.languages["zh-cn"].page_count,
    15,
    "fixture 构建应仅索引技术文章，不含说说",
  );
  assert.equal((rss.match(/<item>/g) ?? []).length, 17);
  assert.match(rss, /说说 · 2026年2月3日 09:30/);
  assert.match(rss, new RegExp(`/shuoshuo/#${stableId}`));
  assert.doesNotMatch(rss, /这是一条不应公开的草稿/);

  const shuoshuoOnlyOutDir = join(temporaryDirectory, "shuoshuo-only-dist");
  await buildSearchFixture(shuoshuoOnlyOutDir, {
    ...fixtureEnvironment,
    POST_CONTENT_DIR: emptyPostsDirectory,
  });
  const shuoshuoOnlyRss = await readFile(join(shuoshuoOnlyOutDir, "rss.xml"), "utf8");
  assert.equal((shuoshuoOnlyRss.match(/<item>/g) ?? []).length, 2);
  assert.doesNotMatch(shuoshuoOnlyRss, /Markdown快速上手语法/);
  assert.equal(await getIndexedPageCount(shuoshuoOnlyOutDir), 0, "仅说说时 Pagefind 索引应为空");

  const emptyOutDir = join(temporaryDirectory, "empty-dist");
  await buildSearchFixture(emptyOutDir, {
    ...process.env,
    POST_CONTENT_DIR: emptyPostsDirectory,
    SHUOSHUO_CONTENT_DIR: emptyShuoshuoDirectory,
  });
  assert.doesNotMatch(await readFile(join(emptyOutDir, "rss.xml"), "utf8"), /<item>/);
  assert.equal(await getIndexedPageCount(emptyOutDir), 0, "无内容时 Pagefind 索引应为空");

  const styles = (
    await Promise.all(
      (await readdir(join(outDir, "_astro")))
        .filter(file => file.endsWith(".css"))
        .map(file => readFile(join(outDir, "_astro", file), "utf8")),
    )
  ).join("\n");

  const browser = await chromium.launch({ headless: true });
  try {
    const searchPage = await browser.newPage();
    await searchPage.route("http://pagefind.test/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      const target = resolve(outDir, `.${pathname === "/" ? "/index.html" : pathname}`);
      assert.ok(target.startsWith(`${outDir}/`));
      await route.fulfill({ path: target });
    });
    await searchPage.goto("http://pagefind.test/");
    const searchResults = await searchPage.evaluate(async () => {
      const pagefind = await import("/pagefind/pagefind.js");
      await pagefind.options({ noWorker: true });
      const search = async term =>
        Promise.all((await pagefind.search(term)).results.map(result => result.data()));
      return {
        post: await search("Markdown快速上手语法"),
        // 仅出现在 fixture 说说正文中的长句，避免与技术文章分词重合
        shuoshuoOnly: await search("故意使用与发布时间不同的文件名"),
        draft: await search("这是一条不应公开的草稿"),
      };
    });
    assert.ok(
      searchResults.post.some(result => result.url === "/posts/markdown-quick-start/"),
      "搜索应链接到技术文章永久链接",
    );
    assert.equal(searchResults.shuoshuoOnly.length, 0, "仅出现在说说中的文句不得被 Pagefind 索引");
    assert.ok(
      searchResults.post.every(result => result.url.startsWith("/posts/")),
      "搜索结果应只指向技术文章",
    );
    assert.equal(searchResults.draft.length, 0, "搜索不得收录说说草稿");
    await searchPage.close();

    const homePage = await browser.newPage({
      viewport: { width: 320, height: 800 },
    });
    await homePage.route("https://example.com/**", route => route.abort());
    await homePage.setContent(home);
    await homePage.addStyleTag({ content: styles });
    const homePreview = homePage.locator(".shuoshuo-preview");
    assert.equal(await homePreview.locator("time").count(), 1);
    assert.match(await homePreview.locator("h3 a").textContent(), /这是发布时间最新的公开说说/);
    assert.match(
      (await homePreview.locator("h3 a").getAttribute("href")) ?? "",
      new RegExp(`/shuoshuo/#${stableId}`),
    );
    await homePage.close();

    const inlineScript = [...timeline.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(
      ([, source]) => source.includes("data-shuoshuo-toggle"),
    );
    assert.ok(inlineScript, "说说展开脚本应内联到时间流页面");
    const pageMarkup = timeline.replace(inlineScript[0], "");

    for (const width of [1024, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.route("https://example.com/**", route => route.abort());
      await page.setContent(pageMarkup, {
        waitUntil: "domcontentloaded",
      });
      await page.addStyleTag({ content: styles });
      await page.addScriptTag({ content: inlineScript[1] });
      await page.evaluate(id => history.replaceState(null, "", `#${id}`), stableId);
      const toggle = page.locator(`[data-shuoshuo-toggle="${stableId}"]`);
      const body = page.locator(`article:has([id="${stableId}"]) .shuoshuo-body`);
      const hiddenLink = body.locator("a");

      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${width}px 说说页不得横向溢出`,
      );
      const collapsedStyle = await body.evaluate(element => {
        const content = element.querySelector(".post-body");
        return {
          contentFontSize: content ? getComputedStyle(content).fontSize : "",
          overflow: getComputedStyle(element).overflow,
        };
      });
      assert.deepEqual(
        collapsedStyle,
        { contentFontSize: "16px", overflow: "hidden" },
        "说说正文应保持原有字号，折叠外壳应裁切溢出内容",
      );
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await body.getAttribute("inert"), "");
      await hiddenLink.focus();
      assert.equal(await hiddenLink.evaluate(element => element === document.activeElement), false);
      await toggle.focus();
      await page.keyboard.press("Enter");
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await body.getAttribute("data-collapsed"), null);
      assert.equal(await body.getAttribute("inert"), null);
      await hiddenLink.focus();
      assert.equal(await hiddenLink.evaluate(element => element === document.activeElement), true);
      await toggle.focus();
      assert.equal(await toggle.textContent(), "收起");
      await page.keyboard.press("Space");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await body.getAttribute("data-collapsed"), "");
      assert.equal(await toggle.textContent(), "展开");
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await execFileAsync(
    process.execPath,
    [astro, "build", "--force", "--outDir", join(temporaryDirectory, "production-dist")],
    {
      cwd: root,
      env: {
        ...process.env,
        SHUOSHUO_CONTENT_DIR: "./src/content/shuoshuo",
      },
    },
  );
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("说说 fixture 验收通过");
