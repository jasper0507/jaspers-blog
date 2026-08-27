import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import { countPublishedPostPages } from "../../../scripts/lib/index-published-posts.mjs";
import { build, productionEnvironment, root } from "../helpers.ts";

const accessDist = (path: string) => access(join(root, "dist", path));
const readDist = (path: string) => readFile(join(root, "dist", path), "utf8");

test.setTimeout(300_000);
test.beforeAll(() => build(productionEnvironment));

test("生产构建产物完整", async () => {
  for (const route of ["", "shuoshuo", "tags", "archives", "about"]) {
    await accessDist(`${route ? `${route}/` : ""}index.html`);
  }
  await Promise.all([
    accessDist("rss.xml"),
    accessDist("sitemap-index.xml"),
    accessDist("sitemap-0.xml"),
    accessDist("pagefind/pagefind.js"),
    accessDist("404.html"),
    accessDist("favicon.svg"),
    accessDist("fonts/source-serif-4-latin.woff2"),
    accessDist("fonts/source-serif-4-latin-italic.woff2"),
  ]);
  await assert.rejects(accessDist("categories/index.html"));
  await assert.rejects(accessDist("prototype/warmth/index.html"));

  const home = await readDist("index.html");
  assert.doesNotMatch(home, /fonts\.googleapis\.com/);
  const cssDirectory = join(root, "dist/_astro");
  const css = (
    await Promise.all(
      (await readdir(cssDirectory))
        .filter(name => name.endsWith(".css"))
        .map(name => readFile(join(cssDirectory, name), "utf8")),
    )
  ).join("\n");
  assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  assert.match(css, /source-serif-4-latin-italic\.woff2/);

  const publishedCount = await countPublishedPostPages(join(root, "dist"));
  const searchIndex = JSON.parse(await readDist("pagefind/pagefind-entry.json"));
  const pageCount = searchIndex.languages["zh-cn"]?.page_count ?? 0;
  if (publishedCount === 0) {
    assert.ok(pageCount <= 1, "没有已发布技术文章时搜索索引应为空或仅含占位页");
    return;
  }
  assert.equal(pageCount, publishedCount);
});
