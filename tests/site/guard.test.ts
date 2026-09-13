import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "./acceptance-site.ts";

test("公开与草稿标签生成相同网址时都使构建失败", { timeout: 300_000 }, async () => {
  for (const posts of [
    "tests/fixtures/posts-tag-collision",
    "tests/fixtures/posts-draft-tag-collision",
  ]) {
    await assert.rejects(
      () => build({ posts, shuoshuo: "tests/fixtures/shuoshuo-empty" }),
      /生成了相同的网址/,
    );
  }
});

test("没有公开技术文章时不装配搜索", { timeout: 300_000 }, async () => {
  await build(
    {
      posts: "tests/fixtures/posts-unpublished",
      shuoshuo: "tests/fixtures/shuoshuo-empty",
    },
    async distDirectory => {
      const home = await readFile(join(distDirectory, "index.html"), "utf8");
      assert.doesNotMatch(home, /pagefind-modal|pagefind-component-ui|nav-search/);
      await assert.rejects(readFile(join(distDirectory, "pagefind/pagefind-entry.json")));
    },
  );
});

test("非法 Markdown 内容使构建失败", { timeout: 300_000 }, async () => {
  await assert.rejects(
    () =>
      build({
        posts: "tests/fixtures/posts-invalid-math",
        shuoshuo: "tests/fixtures/shuoshuo-empty",
      }),
    /KaTeX parse error/,
  );
  await assert.rejects(
    () =>
      build({
        posts: "tests/fixtures/posts-visual",
        shuoshuo: "tests/fixtures/shuoshuo-invalid-summary",
      }),
    /说说 20240101-000003 没有可见文字或图片/,
  );
});
