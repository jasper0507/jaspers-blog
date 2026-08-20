import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { host, routes } from "../helpers.ts";

test("未知路径显示站点 404", async ({ page }) => {
  const response = await page.goto(`${host}/not-a-page/`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 404);
  assert.equal((await page.locator("h1").textContent())?.trim(), "没有找到这个页面");
  assert.equal(await page.locator('.not-found-links a[href="/"]').count(), 1);
  assert.equal(await page.locator('.not-found-links a[href="/archives/"]').count(), 1);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  );
});

for (const width of [1440, 320]) {
  for (const theme of ["light", "dark"] as const) {
    for (const path of routes) {
      test(`${width}px ${theme} ${path} 可访问、无横向溢出、无页面错误`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: 960 },
          colorScheme: theme,
        });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") errors.push(message.text());
        });
        const response = await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
        await page.evaluate(nextTheme => {
          document.documentElement.dataset.theme = nextTheme;
        }, theme);
        assert.equal(response?.ok(), true, `${path} 应可访问`);
        assert.equal(await page.locator("h1").count(), 1, `${path} 应有一个 h1`);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
          `${width}px ${theme} ${path} 不得横向溢出`,
        );
        assert.deepEqual(errors, [], `${path} 不得有页面错误`);
        await context.close();
      });
    }
  }
}
