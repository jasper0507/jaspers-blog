import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { origin } from "../acceptance-site.ts";

const host = origin();

test("核心阅读与站点壳交互可用", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").count(), 1);

  await page.locator("#article-menu-trigger").click();
  assert.equal(await page.locator("#article-menu-list").isVisible(), true);
  await page.keyboard.press("Escape");

  await page.locator("#theme-toggle").click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");

  await page.keyboard.press("/");
  await page.locator("pagefind-modal input").first().waitFor({ state: "visible" });
  await page.keyboard.press("Escape");

  await page.goto(`${host}/posts/2/`);
  assert.equal((await page.locator("#post-title").textContent())?.includes("视觉验收"), true);

  await page.goto(`${host}/shuoshuo/`);
  const toggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
});
