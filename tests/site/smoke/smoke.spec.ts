import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { origin } from "../acceptance-site.ts";

const host = origin();

test("核心阅读与站点壳交互可用", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
    "rgb(245, 242, 234)",
  );

  await page.locator("#article-menu-trigger").click();
  assert.equal(await page.locator("#article-menu-list").isVisible(), true);
  await page.keyboard.press("Escape");

  await page.locator("#theme-toggle").click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  assert.equal(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
    "rgb(39, 36, 33)",
  );

  await page.keyboard.press("/");
  await page.locator("pagefind-modal input").first().waitFor({ state: "visible" });
  await page.keyboard.press("Escape");

  await page.goto(`${host}/posts/2/`);
  assert.equal((await page.locator("#post-title").textContent())?.includes("视觉验收"), true);

  const loadedFonts = await page.evaluate(async () => {
    const names = ["anthropic-sans", "anthropic-serif", "anthropic-mono", "Noto Sans SC"];
    return Promise.all(
      names.map(async name => {
        const faces = await document.fonts.load(
          `16px "${name}"`,
          name === "Noto Sans SC" ? "中文" : "Latin",
        );
        return { name, loaded: faces.length > 0 && faces.every(face => face.status === "loaded") };
      }),
    );
  });
  assert.ok(
    loadedFonts.every(font => font.loaded),
    JSON.stringify(loadedFonts),
  );

  await page.goto(`${host}/shuoshuo/`);
  const toggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
});
