import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import type { Page } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { blogSettings } from "../../src/lib/site.ts";

export const execFileAsync = promisify(execFile);
export const root = fileURLToPath(new URL("../../", import.meta.url));
export const astro = join(root, "node_modules/astro/bin/astro.mjs");
export const pagefind = join(root, "node_modules/.bin/pagefind");
export const host = "http://127.0.0.1:4321";
export const settingsPort = 4322;
export const settingsHost = `http://127.0.0.1:${settingsPort}`;
export const {
  site: expectedSite,
  author: expectedAuthor,
  home: expectedHome,
  footer: expectedFooter,
} = blogSettings;
export const hasDarkHero = expectedHome.hero.darkImage !== expectedHome.hero.lightImage;
export const expectedFooterLinks = (author: typeof expectedAuthor) => [
  ["RSS", "/rss.xml"],
  ["GitHub", author.github],
  ["邮箱", `mailto:${author.email}`],
];
export const routes = [
  "/",
  "/posts/visual/",
  "/shuoshuo/",
  "/tags/",
  "/tags/astro/",
  "/archives/",
  "/about/",
];
export const visualRoutes = [
  ["home", "/"],
  ["post", "/posts/visual/"],
  ["shuoshuo", "/shuoshuo/"],
  ["tags", "/tags/"],
  ["tag", "/tags/astro/"],
  ["archives", "/archives/"],
  ["about", "/about/"],
] as const;
export const productionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./src/content/posts",
  SHUOSHUO_CONTENT_DIR: "./src/content/shuoshuo",
};
export const fixtureEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
};
export const tagCollisionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-tag-collision",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};

export async function build(environment: Record<string, string | undefined>) {
  await execFileAsync(process.execPath, [astro, "build", "--force"], {
    cwd: root,
    env: environment,
  });
  await execFileAsync(pagefind, ["--site", "dist", "--glob", "posts/**/*.html"], { cwd: root });
}

export function shanghaiYear(now = new Date()) {
  return new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric" }).format(now);
}

export function assertInOrder(source: string, needles: string[], message: string) {
  let previous = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > previous, `${message}：${needle}`);
    previous = index;
  }
}

export function assertRenderedKatex(html: string, message: string) {
  assert.match(html, /class="katex"/, `${message}：应渲染 KaTeX`);
  assert.match(html, /class="katex-display"/, `${message}：应渲染块级公式`);
  assert.doesNotMatch(html, /language-math/, `${message}：不得留下未渲染的 math 源码块`);
}

export function assertChineseFootnotes(html: string, message: string) {
  assert.match(html, /id="footnote-label"[^>]*>脚注</, `${message}：脚注标题应为中文`);
  assert.match(html, /aria-label="返回脚注引用"/, `${message}：脚注返回文案应为中文`);
}

export function footerLinks(page: Page) {
  return page
    .locator(".site-footer ul a")
    .evaluateAll(links => links.map(link => [link.textContent?.trim(), link.getAttribute("href")]));
}

export async function assertFooterLayout(page: Page, width: number) {
  assert.equal(
    await page
      .locator(".footer-inner")
      .evaluate(element => getComputedStyle(element).flexDirection),
    width <= 480 ? "column" : "row",
  );
}

export async function checkDarkSearchTrigger(page: Page) {
  await page.waitForFunction(
    () =>
      customElements.get("pagefind-modal-trigger") &&
      document.querySelector("pagefind-modal-trigger .pf-trigger-btn"),
  );
  const shell = page.locator("pagefind-modal-trigger");
  const trigger = page.getByRole("button", { name: "搜索" });
  const icon = trigger.locator(".pf-trigger-icon");
  assert.equal(await trigger.getAttribute("aria-keyshortcuts"), "/");
  assert.equal(
    await shell.evaluate(element => getComputedStyle(element).colorScheme),
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
  );
  assert.deepEqual(
    await icon.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, getComputedStyle(element.parentElement!).color];
    }),
    ["rgb(233, 230, 221)", "rgb(233, 230, 221)"],
  );
  await trigger.focus();
  assert.notEqual(
    await trigger.evaluate(element => getComputedStyle(element).outlineStyle),
    "none",
  );
  await trigger.hover();
  await page.waitForTimeout(200);
  assert.deepEqual(
    await trigger.evaluate(element => {
      const style = getComputedStyle(element);
      return [style.color, style.borderBottomColor, style.borderBottomWidth];
    }),
    ["rgb(217, 119, 87)", "rgb(217, 119, 87)", "2px"],
  );
  assert.equal(
    await icon.evaluate(element => getComputedStyle(element).backgroundColor),
    "rgb(217, 119, 87)",
  );
  await page.mouse.move(0, 0);
}
