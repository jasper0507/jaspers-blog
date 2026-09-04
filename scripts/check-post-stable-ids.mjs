import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPostStableIds, createPost } from "../src/lib/post-rules.js";
import { createShuoshuoDraft, isShuoshuoStableId } from "../src/lib/shuoshuo-rules.js";

const root = await mkdtemp(join(tmpdir(), "newblog-post-id-"));
const postsDirectory = join(root, "posts");
const nextIdPath = join(root, "post-next-id.json");

async function writeNext(next) {
  await writeFile(nextIdPath, `{"next": ${next}}\n`);
}

async function readNext() {
  return JSON.parse(await readFile(nextIdPath, "utf8")).next;
}

try {
  const shuoshuo = createShuoshuoDraft();
  assert.ok(isShuoshuoStableId(shuoshuo.id));
  assert.ok(shuoshuo.source.includes(`publishedAt: "${shuoshuo.publishedAt}"`));

  await assert.rejects(createPost(postsDirectory, "深度学习笔记"), /找不到技术文章号码计数器/);
  await assert.rejects(assertPostStableIds(postsDirectory, []), /找不到技术文章号码计数器/);

  await writeNext(1);
  await assert.rejects(createPost(postsDirectory, "   "), /标题不能为空/);
  await assert.rejects(createPost(postsDirectory, "???"), /标题无法生成有效文件名/);
  await assert.rejects(createPost(postsDirectory, ".hidden"), /标题无法生成有效文件名/);
  assert.equal(await readNext(), 1, "创建失败时不得占用号码");

  const before = new Date();
  const created = await createPost(postsDirectory, "深度学习笔记");
  const after = new Date();
  assert.equal(created.id, 1);
  assert.equal(created.path, join(postsDirectory, "深度学习笔记.md"));
  assert.deepEqual(await readdir(postsDirectory), ["深度学习笔记.md"]);
  assert.equal(await readNext(), 2);

  const source = await readFile(created.path, "utf8");
  const publishedAt = source.match(/^publishedAt: "(.+)"$/m)?.[1];
  assert.ok(publishedAt, "应生成发布时间");
  assert.match(publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
  const publishedTime = new Date(publishedAt).getTime();
  assert.ok(publishedTime >= before.getTime() - 1_000 && publishedTime <= after.getTime() + 1_000);
  assert.equal(
    source,
    `---\ntitle: "深度学习笔记"\ndescription: ""\npublishedAt: "${publishedAt}"\ntags: []\ndraft: false\n# 禁止修改\nid: 1\n---\n`,
  );

  const beforeCollision = source;
  await assert.rejects(createPost(postsDirectory, "深度学习笔记"), /技术文章已存在/);
  assert.equal(await readFile(created.path, "utf8"), beforeCollision, "冲突时不得覆盖文章");
  assert.equal(await readNext(), 2, "冲突时不得占用号码");

  const stripped = await createPost(postsDirectory, "问答?");
  assert.equal(stripped.id, 2);
  assert.equal(stripped.path, join(postsDirectory, "问答.md"));
  assert.equal(await readNext(), 3);
  const strippedSource = await readFile(stripped.path, "utf8");
  assert.match(strippedSource, /^title: "问答\?"$/m);
  assert.match(strippedSource, /^id: 2$/m);

  await assertPostStableIds(postsDirectory, [
    { filename: "深度学习笔记", id: 1 },
    { filename: "问答", id: 2 },
  ]);

  await assert.rejects(
    assertPostStableIds(postsDirectory, [
      { filename: "深度学习笔记", id: 1 },
      { filename: "另一篇", id: 1 },
    ]),
    /技术文章「深度学习笔记」与「另一篇」使用了相同的稳定 ID：1/,
  );

  await writeNext(1);
  await assert.rejects(
    assertPostStableIds(postsDirectory, [{ filename: "深度学习笔记", id: 1 }]),
    /技术文章号码计数器过小：next=1，已用最大号=1/,
  );
  await writeNext(3);
  await assertPostStableIds(postsDirectory, []);

  await writeFile(nextIdPath, "not-json");
  await assert.rejects(createPost(postsDirectory, "无效计数器"), /技术文章号码计数器无效/);
  await assert.rejects(assertPostStableIds(postsDirectory, []), /技术文章号码计数器无效/);
  await writeNext(3);
  assert.equal((await readdir(postsDirectory)).includes("无效计数器.md"), false);

  await chmod(nextIdPath, 0o444);
  try {
    await assert.rejects(createPost(postsDirectory, "将回滚"));
    assert.equal(
      (await readdir(postsDirectory)).includes("将回滚.md"),
      false,
      "bump 失败须撤回文件",
    );
  } finally {
    await chmod(nextIdPath, 0o644);
  }
  assert.equal(await readNext(), 3);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("内容创建规则验收通过");
