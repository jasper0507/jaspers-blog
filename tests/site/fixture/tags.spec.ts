import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { host } from "../helpers.ts";

test("标签云排列与悬停反馈", async ({ page }) => {
  await page.goto(`${host}/tags/`);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  const tagCloud = page.locator(".tag-cloud");
  const tagChip = tagCloud.locator("a").first();
  assert.deepEqual(
    await tagCloud.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.display, style.flexWrap];
    }),
    ["flex", "wrap"],
    "标签云应换行排列",
  );
  assert.deepEqual(
    await tagChip.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.borderTopWidth, style.borderTopStyle];
    }),
    ["rgb(251, 249, 244)", "1px", "solid"],
    "标签 chip 应使用纸面背景与细边框",
  );
  await tagChip.hover();
  await page.waitForTimeout(200);
  assert.match(
    await tagChip.evaluate(element => getComputedStyle(element).transform),
    /^matrix\(1\.04, 0, 0, 1\.04, 0, 0\)$/,
    "标签 chip 悬停时应放大",
  );
});
