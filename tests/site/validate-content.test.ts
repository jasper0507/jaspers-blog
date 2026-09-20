import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";
import { tagSlug } from "../../packages/content-tools/tag-rules.js";
import { validateContent } from "../../packages/content-tools/validate-content.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "validate-content-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, "tests/fixtures/content"), directory, { recursive: true });
  return directory;
}

function postSource({
  title = "标题",
  description = "",
  publishedAt = "2026-09-19T12:00:00+08:00",
  tags = "[]",
  draft = false,
  id = 7,
  body = "正文。",
} = {}) {
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
publishedAt: "${publishedAt}"
tags: ${tags}
draft: ${draft}
id: ${id}
---

${body}
`;
}

test("标签 slug 与 github-slugger 对齐", () => {
  for (const tag of ["C++", "C#", "Astro", "共同", "前端开发", "Hello, World!", "???"]) {
    assert.equal(tagSlug(tag), new GithubSlugger().slug(tag), tag);
  }
});

test("示例内容通过本机校验", async t => {
  await validateContent(await workspace(t));
});

test("空摘要且有正文可以通过", async t => {
  const directory = await workspace(t);
  await writeFile(join(directory, "posts/empty-desc.md"), postSource());
  await writeFile(join(directory, "post-next-id.json"), '{"next": 8}\n');
  await validateContent(directory);
});

test("空正文、未加引号的发布时间和标签网址冲突会中文失败", async t => {
  const directory = await workspace(t);
  await writeFile(
    join(directory, "posts/empty-body.md"),
    postSource({ title: "空正文", id: 7, body: "" }),
  );
  await writeFile(
    join(directory, "posts/unquoted.md"),
    postSource({ title: "未加引号", id: 8, publishedAt: "2026-09-19T12:00:00+08:00" }).replace(
      'publishedAt: "2026-09-19T12:00:00+08:00"',
      "publishedAt: 2026-09-19T12:00:00+08:00",
    ),
  );
  await writeFile(
    join(directory, "posts/tags.md"),
    postSource({ title: "冲突标签", id: 9, tags: "\n  - C++\n  - C#" }),
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 10}\n');
  await assert.rejects(
    () => validateContent(directory),
    error => {
      const text = String(error);
      assert.match(text, /技术文章 empty-body 的正文不能为空/);
      assert.match(text, /posts\/unquoted.md：发布时间必须是加引号的上海时间/);
      assert.match(text, /标签「C\+\+」与「C#」生成了相同的网址：\/tags\/c\//);
      return true;
    },
  );
});

test("缺少必填字段或未知字段会失败", async t => {
  const directory = await workspace(t);
  await writeFile(
    join(directory, "posts/extra.md"),
    postSource({ id: 7 }).replace(
      "draft: false",
      'draft: false\nupdatedAt: "2026-09-19T12:00:00+08:00"',
    ),
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 8}\n');
  await assert.rejects(() => validateContent(directory), /不能包含未知字段 updatedAt/);
});

test("去空白后重复的标签、tags: null 和不安全整数会失败", async t => {
  const directory = await workspace(t);
  await writeFile(
    join(directory, "posts/trim-dup.md"),
    postSource({ title: "去空白重复", id: 7, tags: '\n  - "Astro"\n  - " Astro "' }),
  );
  await writeFile(
    join(directory, "posts/null-tags.md"),
    postSource({ title: "空标签", id: 8 }).replace("tags: []", "tags: null"),
  );
  await writeFile(
    join(directory, "posts/unsafe-id.md"),
    postSource({ title: "不安全整数", id: Number.MAX_SAFE_INTEGER + 1 }),
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 10}\n');
  await assert.rejects(
    () => validateContent(directory),
    error => {
      const text = String(error);
      assert.match(text, /posts\/trim-dup.md：标签不得重复/);
      assert.match(text, /posts\/null-tags.md：标签必须是列表/);
      assert.match(text, /posts\/unsafe-id.md：id 必须是正整数/);
      return true;
    },
  );
});

test("刚创建的空正文文章不能通过", async t => {
  const directory = await workspace(t);
  const created = await readFile(join(root, "packages/content-tools/post-rules.js"), "utf8");
  assert.match(created, /description: ""/);
  await writeFile(
    join(directory, "posts/new.md"),
    `---
title: "新文章"
description: ""
publishedAt: "2026-09-19T12:00:00+08:00"
tags: []
draft: false
id: 7
---
`,
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 8}\n');
  await assert.rejects(() => validateContent(directory), /技术文章 new 的正文不能为空/);
});
