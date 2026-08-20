import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { initRepoWithOrigin } from "./lib/test-git.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const script = fileURLToPath(new URL("new-post.mjs", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-post-"));
const directory = join(workingDirectory, "src/content/posts");
const nextIdPath = join(workingDirectory, "src/content/post-next-id.json");
const { remoteDirectory } = await initRepoWithOrigin(workingDirectory);

function run(...args) {
  return execFileAsync(process.execPath, [script, ...args], {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, TZ: "UTC" },
  });
}

function build() {
  return execFileAsync(process.execPath, [astro, "build", "--force"], {
    cwd: root,
    env: {
      ...process.env,
      TZ: "UTC",
      POST_CONTENT_DIR: directory,
      SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
    },
  });
}

async function writeNext(next) {
  await mkdir(join(workingDirectory, "src/content"), { recursive: true });
  await writeFile(nextIdPath, `{"next": ${next}}\n`);
}

async function readNext() {
  return JSON.parse(await readFile(nextIdPath, "utf8")).next;
}

async function rejectsBuild(source, path = join(directory, "深度学习笔记.md")) {
  await writeFile(path, source);
  await assert.rejects(build());
}

try {
  await assert.rejects(run());
  await assert.rejects(run("   "));
  await assert.rejects(run("???"));
  await assert.rejects(run(".hidden"));
  await assert.rejects(run("one", "two"));
  await assert.rejects(run("深度学习笔记"));

  await writeNext(1);
  const before = new Date();
  const created = await run("深度学习笔记");
  const after = new Date();
  assert.match(created.stdout, /已创建 src\/content\/posts\/深度学习笔记\.md/);
  assert.match(created.stdout, /公开网址 \/posts\/1\//);
  assert.deepEqual(await readdir(directory), ["深度学习笔记.md"]);
  assert.equal(await readNext(), 2);

  const path = join(directory, "深度学习笔记.md");
  const source = await readFile(path, "utf8");
  const publishedAt = source.match(/^publishedAt: "(.+)"$/m)?.[1];
  assert.ok(publishedAt, "应生成发布时间");
  assert.match(publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
  const publishedTime = new Date(publishedAt).getTime();
  assert.ok(publishedTime >= before.getTime() - 1_000 && publishedTime <= after.getTime() + 1_000);
  assert.equal(
    source,
    `---\ntitle: "深度学习笔记"\ndescription: ""\npublishedAt: "${publishedAt}"\ntags: []\ndraft: false\nid: 1\n---\n`,
  );

  await assert.rejects(run("深度学习笔记"));
  assert.equal(await readFile(path, "utf8"), source, "冲突时不得覆盖文章");
  assert.equal(await readNext(), 2, "冲突时不得占用号码");

  await assert.rejects(run("???"));
  assert.equal(await readNext(), 2, "创建失败时不得占用号码");

  const stripped = await run("问答?");
  assert.match(stripped.stdout, /已创建 src\/content\/posts\/问答\.md/);
  assert.match(stripped.stdout, /公开网址 \/posts\/2\//);
  assert.equal(await readNext(), 3);
  const strippedSource = await readFile(join(directory, "问答.md"), "utf8");
  assert.match(strippedSource, /^title: "问答\?"$/m);
  assert.match(strippedSource, /^id: 2$/m);

  await rm(join(directory, "问答.md"));
  await writeNext(2);

  await assert.rejects(build(), "未完成模板不得通过构建");

  const validSource = source
    .replace('description: ""', 'description: "技术文章创建命令验收。"')
    .concat("\n正文。\n");
  await writeFile(path, validSource);
  await build();
  assert.match(await readFile(join(root, "dist/posts/1/index.html"), "utf8"), /深度学习笔记/);

  await rejectsBuild(validSource.replace(`"${publishedAt}"`, publishedAt));

  for (const invalidTime of [
    "2026-08-13",
    "2026-08-13T12:00:00Z",
    "2026-08-13T12:00:00+09:00",
    "2026-02-30T12:00:00+08:00",
  ]) {
    await rejectsBuild(validSource.replace(publishedAt, invalidTime));
  }
  await rejectsBuild(
    validSource.replace("draft: false", "updatedAt: 2026-08-13T12:00:00+08:00\ndraft: false"),
  );
  await rejectsBuild(validSource.replace("draft: false", "extra: true\ndraft: false"));
  await rejectsBuild(validSource.replace('title: "深度学习笔记"', 'title: ""'));
  await rejectsBuild(
    validSource.replace('description: "技术文章创建命令验收。"', 'description: ""'),
  );
  await rejectsBuild(validSource.replace("\n正文。\n", "\n"));
  await rejectsBuild(
    validSource.replace("draft: false", "draft: true").replace("\n正文。\n", "\n"),
  );
  await rejectsBuild(validSource.replace("id: 1", "id: 0"));
  await rejectsBuild(validSource.replace(/\nid: 1\n/, "\n"));
  await writeNext(1);
  await rejectsBuild(validSource);
  await writeNext(3);
  await writeFile(path, validSource);
  await rejectsBuild(validSource, join(directory, "另一篇.md"));
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
  await rm(remoteDirectory, { recursive: true, force: true });
}

console.log("技术文章创建命令验收通过");
