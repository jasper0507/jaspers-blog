import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { host } from "../helpers.ts";

test("说说展开与收起", async ({ page }) => {
  await page.goto(`${host}/shuoshuo/`);
  const shuoshuoToggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  await shuoshuoToggle.waitFor({ state: "visible" });
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "true");
  await shuoshuoToggle.click();
  assert.equal(await shuoshuoToggle.getAttribute("aria-expanded"), "false");
});
