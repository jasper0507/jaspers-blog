import assert from "node:assert/strict";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  findTagUrlConflicts,
  normalizePostFrontmatter,
} from "../../packages/content-tools/post-writing-rules.js";
import {
  parseMarkdownDocument,
  validateContent,
} from "../../packages/content-tools/validate-content.js";
import { postsSchema } from "../../src/lib/posts-schema.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publishedAt = "2026-09-19T12:00:00+08:00";

function legal(overrides: Record<string, unknown> = {}) {
  return {
    title: "标题",
    description: "",
    publishedAt,
    tags: [] as string[],
    draft: false,
    id: 1,
    ...overrides,
  };
}

function postMarkdown(data: Record<string, unknown>, body = "正文。") {
  const lines = ["---"];
  const write = (key: string, value: unknown) => {
    if (value === null) {
      lines.push(`${key}: null`);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        return;
      }
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${JSON.stringify(item)}`);
      return;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      lines.push(`${key}: ${value}`);
      return;
    }
    lines.push(`${key}: ${JSON.stringify(value)}`);
  };
  for (const key of ["title", "description", "publishedAt", "tags", "draft", "id"]) {
    if (Object.hasOwn(data, key)) write(key, data[key]);
  }
  for (const [key, value] of Object.entries(data)) {
    if (["title", "description", "publishedAt", "tags", "draft", "id"].includes(key)) continue;
    write(key, value);
  }
  return `${lines.join("\n")}\n---\n\n${body}\n`;
}

async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "post-writing-rules-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, "tests/fixtures/content"), directory, { recursive: true });
  return directory;
}

async function addPost(
  directory: string,
  filename: string,
  data: Record<string, unknown>,
  body = "正文。",
  next = 8,
) {
  await writeFile(join(directory, "posts", filename), postMarkdown(data, body));
  await writeFile(join(directory, "post-next-id.json"), `{"next": ${next}}\n`);
}

function assertIssue(
  issues: readonly { path: readonly (string | number | symbol)[]; message: string }[],
  path: string,
  message: RegExp,
) {
  assert.ok(
    issues.some(issue => issue.path[0] === path && message.test(issue.message)),
    `应有 ${path}：${message}，实际：${issues.map(issue => `${issue.path.join(".")}:${issue.message}`).join("；")}`,
  );
}

async function assertRejected(data: Record<string, unknown>, path: string, message: RegExp) {
  const shared = normalizePostFrontmatter(data);
  if (shared.ok) assert.fail("共享规则应拒绝");
  assertIssue(shared.issues, path, message);

  const parsed = await postsSchema.safeParseAsync(data);
  if (parsed.success) assert.fail("Astro schema 应拒绝");
  assertIssue(parsed.error.issues, path, message);
}

async function assertLocalRejected(
  directory: string,
  filename: string,
  data: Record<string, unknown>,
  message: RegExp,
  body = "正文。",
) {
  await addPost(directory, filename, data, body);
  await assert.rejects(() => validateContent(directory), message);
}

test("去空白后的重复标签在共享规则、Astro schema 和本机校验都被拒绝", async t => {
  const data = legal({ id: 7, tags: ["Astro", " Astro "] });
  await assertRejected(data, "tags", /标签不得重复/);
  await assertLocalRejected(
    await workspace(t),
    "dup-tags.md",
    data,
    /posts\/dup-tags.md：标签不得重复/,
  );
});

test("合法标题、摘要与标签的首尾空白被 trim，Astro 返回同样文本且发布时间为 Date", async () => {
  const tags = ["  Astro  "];
  const data = legal({
    title: "  标题  ",
    description: "  摘要  ",
    tags,
  });
  const shared = normalizePostFrontmatter(data);
  if (!shared.ok) assert.fail(shared.issues.map(issue => issue.message).join("；"));
  assert.deepEqual(shared.value, {
    title: "标题",
    description: "摘要",
    publishedAt,
    tags: ["Astro"],
    draft: false,
    id: 1,
  });
  assert.deepEqual(tags, ["  Astro  "]);
  assert.equal(data.title, "  标题  ");

  const parsed = await postsSchema.safeParseAsync(data);
  if (!parsed.success) assert.fail(parsed.error.issues.map(issue => issue.message).join("；"));
  assert.equal(parsed.data.title, "标题");
  assert.equal(parsed.data.description, "摘要");
  assert.deepEqual(parsed.data.tags, ["Astro"]);
  assert.ok(parsed.data.publishedAt instanceof Date);
  assert.equal(parsed.data.publishedAt.toISOString(), new Date(publishedAt).toISOString());
});

test("省略 tags 或 tags: [] 都接受并输出空数组", async t => {
  const { tags: _omittedTags, ...omitted } = legal({ id: 7 });
  const empty = legal({ id: 8, tags: [] });

  for (const data of [omitted, empty]) {
    const shared = normalizePostFrontmatter(data);
    if (!shared.ok) assert.fail(shared.issues.map(issue => issue.message).join("；"));
    assert.deepEqual(shared.value.tags, []);
    const parsed = await postsSchema.safeParseAsync(data);
    if (!parsed.success) assert.fail(parsed.error.issues.map(issue => issue.message).join("；"));
    assert.deepEqual(parsed.data.tags, []);
  }

  const directory = await workspace(t);
  await writeFile(join(directory, "posts/omitted-tags.md"), postMarkdown(omitted));
  await writeFile(join(directory, "posts/empty-tags.md"), postMarkdown(empty));
  await writeFile(join(directory, "post-next-id.json"), '{"next": 9}\n');
  await validateContent(directory);
});

test("tags: null、错误类型、空白标签和无有效网址标签两端都拒绝且指向 tags", async t => {
  const directory = await workspace(t);
  await assertRejected(legal({ tags: null }), "tags", /标签必须是列表/);
  await assertRejected(legal({ tags: "Astro" }), "tags", /标签必须是列表/);
  await assertRejected(legal({ tags: ["  "] }), "tags", /标签不能为空/);
  await assertRejected(legal({ tags: ["???"] }), "tags", /标签无法生成有效 URL：\?\?\?/);
  await assertLocalRejected(
    directory,
    "null-tags.md",
    legal({ id: 7, tags: null }),
    /标签必须是列表/,
  );
});

test("C++ 与 C# 因网址碰撞失败，同一篇、跨文章和草稿都拒绝，同名标签可复用", async t => {
  const sameArticle = findTagUrlConflicts([{ id: "one", tags: ["C++", "C#"] }]);
  assert.match(sameArticle[0]?.message ?? "", /标签「C\+\+」与「C#」生成了相同的网址：\/tags\/c\//);

  const across = findTagUrlConflicts([
    { id: "a", tags: ["C++"] },
    { id: "b", tags: ["C#"] },
  ]);
  assert.match(across[0]?.message ?? "", /标签「C\+\+」与「C#」生成了相同的网址：\/tags\/c\//);

  const withDraft = findTagUrlConflicts([
    { id: "public", tags: ["C++"] },
    { id: "draft", tags: ["C#"] },
  ]);
  assert.equal(withDraft.length, 1);

  assert.deepEqual(
    findTagUrlConflicts([
      { id: "a", tags: ["Astro"] },
      { id: "b", tags: ["Astro"] },
    ]),
    [],
  );

  const directory = await workspace(t);
  await writeFile(
    join(directory, "posts/cpp.md"),
    postMarkdown(legal({ id: 7, tags: ["C++"], draft: false })),
  );
  await writeFile(
    join(directory, "posts/csharp-draft.md"),
    postMarkdown(legal({ id: 8, tags: ["C#"], draft: true })),
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 9}\n');
  await assert.rejects(
    () => validateContent(directory),
    /标签「C\+\+」与「C#」生成了相同的网址：\/tags\/c\//,
  );
});

test("空摘要可接受，缺少 description 两端拒绝", async t => {
  const empty = legal({ description: "" });
  const shared = normalizePostFrontmatter(empty);
  if (!shared.ok) assert.fail(shared.issues.map(issue => issue.message).join("；"));
  assert.equal(shared.value.description, "");
  const parsed = await postsSchema.safeParseAsync(empty);
  if (!parsed.success) assert.fail(parsed.error.issues.map(issue => issue.message).join("；"));
  assert.equal(parsed.data.description, "");

  const { description: _description, ...missing } = legal();
  await assertRejected(missing, "description", /缺少 description/);
  await assertLocalRejected(
    await workspace(t),
    "missing-desc.md",
    missing,
    /posts\/missing-desc.md：缺少 description/,
  );
});

test("id 仅正安全整数通过，字段测试不依赖号码计数器", async () => {
  const ok = normalizePostFrontmatter(legal({ id: 1 }));
  if (!ok.ok) assert.fail(ok.issues.map(issue => issue.message).join("；"));
  assert.equal(ok.value.id, 1);
  const max = normalizePostFrontmatter(legal({ id: Number.MAX_SAFE_INTEGER }));
  if (!max.ok) assert.fail(max.issues.map(issue => issue.message).join("；"));
  const parsed = await postsSchema.safeParseAsync(legal({ id: Number.MAX_SAFE_INTEGER }));
  if (!parsed.success) assert.fail(parsed.error.issues.map(issue => issue.message).join("；"));
  assert.equal(parsed.data.id, Number.MAX_SAFE_INTEGER);

  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", true]) {
    await assertRejected(legal({ id }), "id", /id 必须是正整数/);
  }
});

test("缺少必填、未知字段、非法时间和非布尔 draft 两端按字段合同拒绝", async t => {
  await assertRejected(legal({ title: "  " }), "title", /标题不能为空/);
  await assertRejected(legal({ publishedAt: "2026-09-19T12:00:00Z" }), "publishedAt", /上海时间/);
  await assertRejected(legal({ draft: "false" }), "draft", /draft 必须是 true 或 false/);
  await assertRejected(legal({ extra: 1 }), "extra", /不能包含未知字段 extra/);

  const { title: _title, ...missingTitle } = legal({ id: 7 });
  await assertRejected(missingTitle, "title", /缺少 title/);
  await assertLocalRejected(
    await workspace(t),
    "missing-title.md",
    missingTitle,
    /posts\/missing-title.md：缺少 title/,
  );
});

test("本机未加引号的发布时间仍拒绝，解析能力不扩大", async t => {
  const directory = await workspace(t);
  await writeFile(
    join(directory, "posts/unquoted.md"),
    postMarkdown(legal({ id: 7 })).replace(
      `publishedAt: "${publishedAt}"`,
      `publishedAt: ${publishedAt}`,
    ),
  );
  await writeFile(join(directory, "post-next-id.json"), '{"next": 8}\n');
  await assert.rejects(
    () => validateContent(directory),
    /posts\/unquoted.md：发布时间必须是加引号的上海时间/,
  );
});

test("本机解析后再走共享规则，空白标签被 trim，非法头信息不会进入集合检查", async t => {
  const source = postMarkdown(
    legal({
      id: 7,
      title: "  本机标题  ",
      tags: ["  Astro  "],
    }),
  );
  const document = parseMarkdownDocument(source, { required: true });
  const result = normalizePostFrontmatter(document.data);
  if (!result.ok) assert.fail(result.issues.map(issue => issue.message).join("；"));
  assert.equal(result.value.title, "本机标题");
  assert.deepEqual(result.value.tags, ["Astro"]);

  const directory = await workspace(t);
  await addPost(directory, "bad-id.md", legal({ id: Number.MAX_SAFE_INTEGER + 1 }));
  await assert.rejects(() => validateContent(directory), /posts\/bad-id.md：id 必须是正整数/);
});
