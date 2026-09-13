import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "./acceptance-site.ts";

test("公开与草稿标签生成相同网址时都使构建失败", { timeout: 300_000 }, async () => {
  for (const content of [
    "tests/fixtures/posts-tag-collision",
    "tests/fixtures/posts-draft-tag-collision",
  ]) {
    await assert.rejects(() => build(content), /生成了相同的网址/);
  }
});

test("没有公开技术文章时不装配搜索", { timeout: 300_000 }, async () => {
  await build("tests/fixtures/posts-unpublished", async distDirectory => {
    const home = await readFile(join(distDirectory, "index.html"), "utf8");
    assert.doesNotMatch(home, /pagefind-modal|pagefind-component-ui|nav-search/);
    await assert.rejects(readFile(join(distDirectory, "pagefind/pagefind-entry.json")));
  });
});

test("非法 Markdown 内容使构建失败", { timeout: 300_000 }, async () => {
  await assert.rejects(() => build("tests/fixtures/posts-invalid-math"), /KaTeX parse error/);
  await assert.rejects(
    () => build("tests/fixtures/shuoshuo-invalid-summary"),
    /说说 20240101-000003 没有可见文字或图片/,
  );
});

test(
  "外部内容缺失必要状态或关于我 Markdown 损坏时明确失败，空公开内容仍可构建",
  { timeout: 300_000 },
  async () => {
    const content = await mkdtemp(join(tmpdir(), "external-content-"));
    try {
      await cp("tests/fixtures/content", content, { recursive: true });
      const about = join(content, "about.md");
      await rm(about);
      await assert.rejects(build(content), /缺少内容来源或必要状态.*about.md/);
      await writeFile(about, "$$\n\\notARealKatexCommand{\n$$\n");
      await assert.rejects(build(content), /KaTeX parse error/);
      await writeFile(about, "");
      const counter = join(content, "post-next-id.json");
      await rm(counter);
      await assert.rejects(build(content), /缺少内容来源或必要状态.*post-next-id.json/);
      await writeFile(counter, "invalid");
      await assert.rejects(build(content), /号码计数器无效/);
      await writeFile(counter, '{"next": 1}');
      await assert.rejects(build(content), /号码计数器过小/);
      for (const name of ["posts", "shuoshuo"]) {
        await rm(join(content, name), { recursive: true });
        await mkdir(join(content, name));
      }
      await build(content, async output => {
        assert.doesNotMatch(
          await readFile(join(output, "index.html"), "utf8"),
          /pagefind-modal|nav-search/,
        );
        assert.doesNotMatch(
          await readFile(join(output, "about/index.html"), "utf8"),
          /我是公开示例作者|我是 Jasper/,
        );
      });
    } finally {
      await rm(content, { recursive: true, force: true });
    }
  },
);
