import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("复用公开投影时仍拒绝回退、损坏或缺失的号码计数器", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "post-catalog-"));
  const directory = join(workspace, "posts");
  const counter = join(workspace, "post-next-id.json");
  const previousDirectory = process.env.POST_CONTENT_DIR;
  // 只替换 Astro collection 边界，发布投影和稳定 ID 校验运行真实实现。
  const collection = `data:text/javascript,${encodeURIComponent(`
    export async function getCollection() {
      return [{ id: "sample", body: "正文", data: {
        id: 1, title: "标题", description: "摘要", draft: false, tags: [],
        publishedAt: new Date("2026-09-12T00:00:00+08:00")
      }}];
    }
    export async function render() { throw new Error("此用例不应渲染正文"); }
  `)}`;
  const postsModule = new URL("../../src/lib/posts.ts", import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "astro:content") return { url: collection, shortCircuit: true };
      if (context.parentURL === postsModule && specifier === "./tags") {
        return nextResolve("./tags.js", context);
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    await mkdir(directory);
    process.env.POST_CONTENT_DIR = directory;
    await writeFile(counter, '{"next": 2}');
    const { getPublishedPostCatalog } = await import(postsModule);
    const first = await getPublishedPostCatalog();
    assert.equal(first.posts[0].id, 1);
    assert.equal(await getPublishedPostCatalog(), first);

    await writeFile(counter, '{"next": 1}');
    await assert.rejects(getPublishedPostCatalog(), /号码计数器过小/);
    await writeFile(counter, "invalid JSON");
    await assert.rejects(getPublishedPostCatalog(), /号码计数器无效/);
    await rm(counter);
    await assert.rejects(getPublishedPostCatalog(), /找不到技术文章号码计数器/);

    await writeFile(counter, '{"next": 2}');
    assert.equal(await getPublishedPostCatalog(), first);
  } finally {
    hooks.deregister();
    if (previousDirectory === undefined) delete process.env.POST_CONTENT_DIR;
    else process.env.POST_CONTENT_DIR = previousDirectory;
    await rm(workspace, { recursive: true, force: true });
  }
});
