import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { expectedAuthor, expectedSite, host } from "../helpers.ts";

test("关于页元信息与正文", async ({ page }) => {
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
});
