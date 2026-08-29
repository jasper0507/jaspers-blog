import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import {
  assertInOrder,
  expectedHome,
  expectedSite,
  host,
  pagefindFragmentText,
  root,
} from "../helpers.ts";

const readDist = (path: string) => readFile(join(root, "dist", path), "utf8");
const longShuoshuoSummary =
  "这是发布时间最新的公开说说。它故意使用与发布时间不同的文件名，用来确认稳定 ID 不会从可修改的时间重新推导。 这里继续放入足够长的正文，… [1 Image]";
const emojiShuoshuoSummary = `${"🙂".repeat(79)}…`;

test("公开内容合同", async () => {
  const [home, timeline, detail, archive, tags, rss, sitemap] = await Promise.all([
    readDist("index.html"),
    readDist("shuoshuo/index.html"),
    readDist("shuoshuo/20250101-000001/index.html"),
    readDist("archives/index.html"),
    readDist("tags/index.html"),
    readDist("rss.xml"),
    readDist("sitemap-0.xml"),
  ]);

  assert.match(home, /同时发布的 Alpha 技术文章/);
  assert.ok(home.includes(longShuoshuoSummary));
  assert.doesNotMatch(
    `${home}${timeline}${archive}${tags}${rss}${sitemap}`,
    /不应公开的技术文章草稿|这是一条不应公开的草稿|草稿标签/,
  );
  assertInOrder(
    timeline,
    ['href="/shuoshuo/20260102-080000/"', 'href="/shuoshuo/20250102-000000/"'],
    "说说排序",
  );
  assertInOrder(archive, ["/posts/1/", "/posts/2/", "/posts/3/"], "文章排序");
  assertInOrder(tags, ['href="/tags/共同/"', 'href="/tags/astro/"'], "标签排序");
  assert.match(home, /href="\/shuoshuo\/20250101-000001\/"/);
  assert.match(timeline, /href="\/shuoshuo\/20250101-000001\/"/);
  assert.doesNotMatch(`${home}${timeline}${rss}`, /\/shuoshuo\/#/);
  assert.match(
    detail,
    /<link rel="canonical" href="https:\/\/jasper0507\.me\/shuoshuo\/20250101-000001\/"/,
  );
  assert.match(detail, /loading="lazy"/);
  assert.match(detail, /decoding="async"/);
  assert.ok(detail.includes(longShuoshuoSummary));
  assert.ok(rss.includes(`<link>${expectedSite.url}</link>`));
  assert.match(rss, /https:\/\/jasper0507\.me\/shuoshuo\/20250101-000001\//);
  for (const summary of [
    longShuoshuoSummary,
    "这是相同 发布时间下编号较早的说说。",
    emojiShuoshuoSummary,
    "[2 Images]",
  ]) {
    assert.ok(
      rss.includes(`<description>${summary}</description>`),
      `RSS 缺少说说摘要：${summary}`,
    );
  }
  for (const summary of [longShuoshuoSummary, emojiShuoshuoSummary, "[2 Images]"]) {
    assert.ok(timeline.includes(summary), `时间流缺少折叠摘要：${summary}`);
  }
  assert.equal((rss.match(/<item>/g) ?? []).length, 8);
  assert.doesNotMatch(sitemap, /\/search\/|\/rss\.xml|<loc>[^<]*#/);
  assert.match(sitemap, /\/shuoshuo\/20250101-000001\//);

  const searchIndex = JSON.parse(await readDist("pagefind/pagefind-entry.json"));
  assert.equal(searchIndex.languages["zh-cn"].page_count, 3);
  const corpus = await pagefindFragmentText();
  assert.match(corpus, /视觉验收专用技术文章/);
  assert.doesNotMatch(corpus, /mc\^2/);
});

test("站点壳、主题、菜单与搜索", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(host, { waitUntil: "networkidle" });
  assert.equal(await page.title(), expectedSite.title);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator(".hero-caption").textContent(), expectedHome.hero.caption);
  assert.equal(
    await page.locator(".hero-image").first().getAttribute("src"),
    expectedHome.hero.lightImage,
  );

  const menuTrigger = page.locator("#article-menu-trigger");
  const menu = page.locator("#article-menu-list");
  await menuTrigger.click();
  await menu.waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await menuTrigger.evaluate(element => element === document.activeElement), true);

  await page.locator("#theme-toggle").click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");

  await page.keyboard.press("/");
  const searchInput = page.locator("pagefind-modal input").first();
  await searchInput.waitFor({ state: "visible" });
  await searchInput.fill("视觉验收专用技术文章");
  const result = page
    .locator("pagefind-results a, dialog.pf-modal a")
    .filter({ hasText: "视觉验收专用技术文章" })
    .first();
  await result.waitFor({ state: "visible" });
  assert.equal(new URL((await result.getAttribute("href")) ?? "", host).pathname, "/posts/2/");
});

test("暗色主视觉只请求暗色图片", async ({ page }) => {
  const heroRequests: string[] = [];
  page.on("request", request => {
    if (/\/images\/hero-(?:light|dark)\.jpg$/.test(request.url())) {
      heroRequests.push(new URL(request.url()).pathname);
    }
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(host, { waitUntil: "networkidle" });

  assert.equal(await page.locator(".hero-media > img").count(), 1);
  assert.equal(await page.locator(".hero-image").getAttribute("src"), expectedHome.hero.darkImage);
  assert.deepEqual(heroRequests, [expectedHome.hero.darkImage]);
});

test("技术文章阅读能力", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${host}/posts/2/`);
  assert.ok(await page.locator(".post-body .katex").count());
  assert.equal(await page.locator("#footnote-label").textContent(), "脚注");
  assert.ok(await page.locator('[aria-label="返回脚注引用"]').count());
  assert.ok(await page.locator('.astro-code[data-title="example.js"]').count());
  assert.ok(await page.locator(".astro-code .line.highlighted").count());
  assert.ok(await page.locator(".astro-code .line.diff.add").count());
  assert.ok(await page.locator(".astro-code .line.diff.remove").count());

  const tocLinks = page.locator('.post-toc a[href^="#"]');
  assert.deepEqual(
    await tocLinks.evaluateAll(links => links.map(link => link.getAttribute("href"))),
    ["#第一节", "#第一节子节", "#第二节"],
  );
  await page
    .locator(".post-body h2")
    .nth(1)
    .evaluate(element =>
      scrollTo({
        top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
        behavior: "instant",
      }),
    );
  await page.waitForFunction(
    () =>
      document.querySelector('.post-toc a[aria-current="true"]')?.getAttribute("href") ===
      "#第二节",
  );

  const backToTop = page.locator("#back-to-top");
  await page.waitForFunction(
    () => document.querySelector("#back-to-top")?.getAttribute("data-visible") === "true",
  );
  await backToTop.click();
  await page.waitForFunction(() => scrollY < 8 && document.activeElement?.id === "post-title");
});

test("说说和移动端基本可用", async ({ page }) => {
  await page.goto(`${host}/shuoshuo/`);
  const toggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  const summary = page.locator('[data-shuoshuo-summary="20250101-000001"]');
  const body = page.locator("#shuoshuo-body-20250101-000001");
  await toggle.waitFor({ state: "visible" });
  assert.equal(await summary.isVisible(), true);
  assert.equal(await body.isHidden(), true);
  assert.equal(await body.getAttribute("inert"), null);
  assert.equal(
    await page.locator('a[href="/shuoshuo/20250101-000001/"]').first().isVisible(),
    true,
  );
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await summary.isHidden(), true);
  assert.equal(await body.isVisible(), true);

  const detailResponse = await page.goto(`${host}/shuoshuo/20250101-000001/`);
  assert.equal(detailResponse?.ok(), true);
  assert.equal(await page.locator("h1").textContent(), "说说 · 2026年2月3日 09:30");
  assert.equal(await page.locator("[data-shuoshuo-toggle]").count(), 0);
  assert.equal(await page.getByText("隐藏区域内的测试链接").isVisible(), true);

  await page.setViewportSize({ width: 320, height: 960 });
  for (const path of ["/", "/posts/2/"]) {
    const response = await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
    assert.equal(response?.ok(), true);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    );
  }
});

test("未知路径使用站点 404", async ({ page }) => {
  const response = await page.goto(`${host}/not-a-page/`);
  assert.equal(response?.status(), 404);
  assert.equal((await page.locator("h1").textContent())?.trim(), "没有找到这个页面");
});

test("核心页面没有明显无障碍违规", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/posts/2/", "/shuoshuo/", "/shuoshuo/20250101-000001/"]) {
    await page.goto(`${host}${path}`);
    const { violations } = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
      [],
      path,
    );
  }
});
