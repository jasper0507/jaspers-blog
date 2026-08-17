import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import { assertInOrder, expectedSite, root } from "../helpers.ts";

const readDist = (path: string) => readFile(join(root, "dist", path), "utf8");

test("草稿不进入任何公开面", async () => {
  const home = await readDist("index.html");
  const timeline = await readDist("shuoshuo/index.html");
  const archive = await readDist("archives/index.html");
  const tags = await readDist("tags/index.html");
  const rss = await readDist("rss.xml");
  const sitemap = await readDist("sitemap-0.xml");
  assert.match(home, /同时发布的 Alpha 技术文章/);
  assert.match(home, /这是发布时间最新的公开说说/);
  assert.doesNotMatch(home, /不应公开的技术文章草稿|这是一条不应公开的草稿/);
  assert.match(timeline, /id="20250101-000001"/);
  assert.doesNotMatch(timeline, /20260103-080000|这是一条不应公开的草稿/);
  assert.doesNotMatch(`${archive}${tags}${rss}${sitemap}`, /不应公开的技术文章草稿|草稿标签/);
});

test("说说时间线按发布时间降序、同时间按稳定 ID 降序", async () => {
  const timeline = await readDist("shuoshuo/index.html");
  assertInOrder(
    timeline,
    ['id="20260102-080000"', 'id="20250102-000000"'],
    "说说发布时间相同时应按稳定 ID 降序排列",
  );
});

test("归档按发布时间降序、同时间按 slug 升序", async () => {
  const archive = await readDist("archives/index.html");
  assertInOrder(
    archive,
    ["/posts/alpha/", "/posts/visual/", "/posts/older/"],
    "归档应按发布时间降序、同时间按 slug 升序",
  );
  assert.match(archive, /datetime="2026-01-01T16:00:00.000Z"[^>]*>\s*2026-01-02/);
});

test("标签列表按 zh-CN 排序", async () => {
  const tags = await readDist("tags/index.html");
  assertInOrder(tags, ['href="/tags/共同/"', 'href="/tags/astro/"'], "同数量标签应按 zh-CN 排序");
  assert.match(tags, /href="\/tags\/astro\/"/);
});

test("RSS 合并技术文章与说说并保持排序", async () => {
  const rss = await readDist("rss.xml");
  assert.ok(rss.includes("<title>Jasper&apos;s Blog</title>"));
  assert.ok(rss.includes(`<link>${expectedSite.url}</link>`));
  assert.ok(rss.includes(`<description>${expectedSite.description}</description>`));
  assert.equal((rss.match(/<item>/g) ?? []).length, 6);
  assertInOrder(
    rss,
    ["同时发布的 Alpha 技术文章", "视觉验收专用技术文章"],
    "RSS 应保持技术文章顺序",
  );
  assert.match(rss, /<description>这是发布时间最新的公开说说。[^<]+<\/description>/);
  assert.doesNotMatch(rss, /这里继续放入足够长的正文/);
});

test("站点地图收录范围", async () => {
  const sitemap = await readDist("sitemap-0.xml");
  assert.ok(sitemap.includes(`<loc>${expectedSite.url}</loc>`));
  assert.match(sitemap, /\/posts\/alpha\//);
  assert.match(sitemap, /\/tags\/astro\//);
  assert.doesNotMatch(
    sitemap,
    /\/search\/|\/rss\.xml|<loc>[^<]*#/,
    "站点地图不得包含搜索页、订阅源或说说锚点",
  );
});

test("Pagefind 只覆盖已发布技术文章", async () => {
  const searchIndex = JSON.parse(await readDist("pagefind/pagefind-entry.json"));
  assert.equal(searchIndex.languages["zh-cn"].page_count, 3);
});
