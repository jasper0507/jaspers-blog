import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { blogSettings } from "../../src/lib/site.ts";

const execFileAsync = promisify(execFile);
export const root = fileURLToPath(new URL("../../", import.meta.url));
export const host = "http://127.0.0.1:4321";
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
  "/posts/2/",
  "/shuoshuo/",
  "/tags/",
  "/tags/astro/",
  "/archives/",
  "/about/",
];
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
export const draftTagCollisionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-draft-tag-collision",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};

export async function build(environment: Record<string, string | undefined>) {
  await execFileAsync("npm", ["run", "build"], {
    cwd: root,
    env: environment,
  });
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

export async function pagefindFragmentText() {
  const fragmentDir = join(root, "dist/pagefind/fragment");
  const names = await readdir(fragmentDir);
  const chunks = await Promise.all(
    names
      .filter(name => name.endsWith(".pf_fragment"))
      .map(async name => gunzipSync(await readFile(join(fragmentDir, name))).toString("utf8")),
  );
  return chunks.join("\n").replaceAll("\u200b", "");
}

export function footerLinks(page: Page) {
  return page
    .locator(".site-footer ul a")
    .evaluateAll(links => links.map(link => [link.textContent?.trim(), link.getAttribute("href")]));
}
