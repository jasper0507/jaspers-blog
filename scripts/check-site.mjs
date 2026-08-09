import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { access, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright-core";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const pagefind = join(root, "node_modules/.bin/pagefind");
const host = "http://127.0.0.1:4321";
const routes = ["/", "/posts/visual/", "/shuoshuo/", "/tags/", "/archives/", "/about/"];
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

async function checkFixture(browser) {
  const home = await readFile("dist/index.html", "utf8");
  const timeline = await readFile("dist/shuoshuo/index.html", "utf8");
  const archive = await readFile("dist/archives/index.html", "utf8");
  const tags = await readFile("dist/tags/index.html", "utf8");
  const rss = await readFile("dist/rss.xml", "utf8");
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  const searchIndex = JSON.parse(await readFile("dist/pagefind/pagefind-entry.json", "utf8"));

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
  assert.match(archive, /datetime="2026-01-01T16:00:00.000Z">\s*2026-01-02/);
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
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${width}px ${path} 不得横向溢出`,
      );
      assert.deepEqual(errors, [], `${path} 不得有页面错误`);
      await page.close();
    }
    await context.close();
  }

  await Promise.all([
    mkdir("artifacts/visual/home", { recursive: true }),
    mkdir("artifacts/visual/post", { recursive: true }),
  ]);
  for (const width of [1440, 768, 375, 320]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 960 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(host, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page
          .locator(`.hero-image-${theme}`)
          .evaluate(element => getComputedStyle(element).display),
        "block",
      );
      await page.screenshot({
        path: `artifacts/visual/home/home-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.goto(`${host}/posts/visual/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `artifacts/visual/post/post-${width}-${theme}.png`,
        fullPage: true,
      });
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await page.goto(host, { waitUntil: "networkidle" });

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

  await page.goto(`${host}/shuoshuo/`);
  const shuoshuoToggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  await shuoshuoToggle.waitFor({ state: "visible" });
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "true");
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "false");

  await page.goto(`${host}/posts/visual/`);
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

  await page.goto(host);
  await page.waitForFunction(
    () =>
      customElements.get("pagefind-modal-trigger") &&
      document.querySelector("pagefind-modal-trigger .pf-trigger-btn"),
  );
  await page.locator("pagefind-modal-trigger .pf-trigger-btn").click();
  const searchInput = page.locator("pagefind-modal input").first();
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
    await checkFixture(browser);
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
