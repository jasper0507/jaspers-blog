import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { host } from "../helpers.ts";

test("搜索弹层键盘生命周期与结果范围", async ({ page }) => {
  await page.goto(host, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      customElements.get("pagefind-modal-trigger") &&
      document.querySelector("pagefind-modal-trigger .pf-trigger-btn"),
  );
  const searchTrigger = page.getByRole("button", { name: "搜索" });
  const searchInput = page.locator("pagefind-modal input").first();
  await page.locator("#theme-toggle").click();
  await page.keyboard.press("/");
  await searchInput.waitFor({ state: "visible" });
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "dark",
    "搜索面板防回归检查应在暗色主题下进行",
  );
  assert.deepEqual(
    await page.locator("dialog.pf-modal").evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.colorScheme];
    }),
    ["rgb(50, 47, 41)", "dark"],
    "暗色主题下搜索面板应继承暗色主题并使用暗色纸面底色",
  );
  assert.equal(await searchInput.evaluate(element => element === document.activeElement), true);
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document
        .querySelector("pagefind-modal-trigger .pf-trigger-btn")
        ?.getAttribute("aria-expanded") === "false",
  );
  assert.equal(await searchTrigger.getAttribute("aria-expanded"), "false");
  assert.equal(await searchTrigger.evaluate(element => element === document.activeElement), true);
  await searchTrigger.click();
  await searchInput.fill("视觉验收专用技术文章");
  const result = page
    .locator("pagefind-results a, dialog.pf-modal a")
    .filter({ hasText: "视觉验收专用技术文章" })
    .first();
  await result.waitFor({ state: "visible" });
  assert.equal(new URL((await result.getAttribute("href")) ?? "", host).pathname, "/posts/visual/");
});
