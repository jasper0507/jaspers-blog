import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { host, routes } from "../helpers.ts";

for (const width of [1440, 320]) {
  for (const path of routes) {
    test(`${width}px ${path} 可访问、无横向溢出、无页面错误`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 960 } });
      const page = await context.newPage();
      const errors: string[] = [];
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
      await context.close();
    });
  }
}
