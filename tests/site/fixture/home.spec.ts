import assert from "node:assert/strict";
import { test } from "@playwright/test";
import {
  expectedAuthor,
  expectedFooter,
  expectedFooterLinks,
  expectedHome,
  expectedSite,
  footerLinks,
  hasDarkHero,
  host,
} from "../helpers.ts";

test("首页主视觉资源与标题结构", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  const heroImages = page.locator(".hero-image");
  const heroImage = heroImages.first();
  assert.equal(await page.locator(".hero-caption").textContent(), expectedHome.hero.caption);
  assert.equal(await heroImages.count(), hasDarkHero ? 2 : 1);
  assert.deepEqual(
    await heroImages.evaluateAll(images => images.map(image => image.getAttribute("src"))),
    [expectedHome.hero.lightImage, ...(hasDarkHero ? [expectedHome.hero.darkImage] : [])],
  );
  assert.equal(await heroImage.getAttribute("alt"), expectedHome.hero.alt);
  assert.equal(await page.locator("h1").count(), 1, "首页应只有一个 h1");

  const favicon = page.locator('link[rel="icon"]');
  assert.equal(await favicon.count(), expectedSite.favicon ? 1 : 0);
  if (expectedSite.favicon) assert.equal(await favicon.getAttribute("href"), expectedSite.favicon);
});

test("主视觉固定为 3:2 并居中裁切", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  const heroFrame = page.locator(".hero-media");
  const heroImage = page.locator(".hero-image").first();
  await heroImage.evaluate<void, HTMLImageElement>(image => {
    image.src = "/images/posts/transformer-paper-notes/attention-mechanism.png";
  });
  await heroImage.evaluate<void, HTMLImageElement>(image => image.decode());
  const crop = await heroImage.evaluate<
    {
      frameRatio: number;
      imageRatio: number;
      naturalRatio: number;
      objectFit: string;
      objectPosition: string;
    },
    HTMLImageElement
  >(image => {
    const frame = image.parentElement!.getBoundingClientRect();
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
});

test("首页元信息、品牌与页脚", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
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
  assert.equal(await page.locator(".footer-content").textContent(), expectedFooter.copyright);
});

test("文章菜单弹层可键盘关闭并归还焦点", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  const menuTrigger = page.locator("#article-menu-trigger");
  const menu = page.locator("#article-menu-list");
  await menuTrigger.click();
  await menu.waitFor({ state: "visible" });
  assert.equal(await menu.evaluate(element => element.matches(":popover-open")), true);
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  assert.equal(await menuTrigger.evaluate(element => element === document.activeElement), true);
});

test("主题切换在重载后保持", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  await page.locator("#theme-toggle").click();
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
});
