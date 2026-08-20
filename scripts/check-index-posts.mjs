import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { countPublishedPostPages, indexPublishedPosts } from "./lib/index-published-posts.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-index-"));

async function pageCount(distDirectory) {
  const searchIndex = JSON.parse(
    await readFile(join(distDirectory, "pagefind/pagefind-entry.json"), "utf8"),
  );
  return searchIndex.languages["zh-cn"]?.page_count ?? 0;
}

try {
  const emptyDist = join(workingDirectory, "empty");
  await mkdir(emptyDist, { recursive: true });
  assert.equal(await countPublishedPostPages(emptyDist), 0);
  await indexPublishedPosts(root, emptyDist);
  assert.ok((await pageCount(emptyDist)) <= 1, "没有已发布技术文章时搜索索引应为空或仅含占位页");
  await assert.rejects(readFile(join(emptyDist, ".pagefind-seed/index.html")));

  const publishedDist = join(workingDirectory, "published");
  await mkdir(join(publishedDist, "posts/1"), { recursive: true });
  await mkdir(join(publishedDist, "posts/not-an-id"), { recursive: true });
  await mkdir(join(publishedDist, "posts/1-draft"), { recursive: true });
  await mkdir(join(publishedDist, "about"), { recursive: true });
  await writeFile(
    join(publishedDist, "posts/1/index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>公开</title></head><body data-pagefind-body><p>公开技术文章</p></body></html>\n`,
  );
  await writeFile(
    join(publishedDist, "posts/not-an-id/index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>非数字目录</title></head><body data-pagefind-body><p>不应进入搜索</p></body></html>\n`,
  );
  await writeFile(
    join(publishedDist, "posts/1-draft/index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>数字前缀</title></head><body data-pagefind-body><p>不应进入搜索</p></body></html>\n`,
  );
  await writeFile(
    join(publishedDist, "about/index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>关于</title></head><body data-pagefind-body><p>不应进入搜索</p></body></html>\n`,
  );
  assert.equal(await countPublishedPostPages(publishedDist), 1);
  await indexPublishedPosts(root, publishedDist);
  assert.equal(await pageCount(publishedDist), 1);

  await mkdir(join(publishedDist, "posts/2"));
  await writeFile(
    join(publishedDist, "posts/2/index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>另一篇公开文章</title></head><body data-pagefind-body><p>另一篇公开技术文章</p></body></html>\n`,
  );
  assert.equal(await countPublishedPostPages(publishedDist), 2);
  await indexPublishedPosts(root, publishedDist);
  assert.equal(await pageCount(publishedDist), 2);
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}

console.log("已发布技术文章搜索索引验收通过");
