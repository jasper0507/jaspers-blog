import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const script = fileURLToPath(new URL("new-post.mjs", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-post-"));
const slug = "new-post";
const directory = join(workingDirectory, "src/content/posts");
const path = join(directory, `${slug}.md`);

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

async function rejectsBuild(source) {
  await writeFile(path, source);
  await assert.rejects(build());
}

try {
  await assert.rejects(run());
  for (const invalid of [
    "New-post",
    "new_post",
    "new-post.md",
    "-new-post",
    "new-post-",
    "new--post",
  ]) {
    await assert.rejects(run(invalid));
  }
  await assert.rejects(run("one", "two"));

  const before = new Date();
  await run(slug);
  const after = new Date();
  assert.deepEqual(await readdir(directory), [`${slug}.md`]);

  const source = await readFile(path, "utf8");
  const publishedAt = source.match(/^publishedAt: "(.+)"$/m)?.[1];
  assert.ok(publishedAt, "应生成发布时间");
  assert.match(publishedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
  const publishedTime = new Date(publishedAt).getTime();
  assert.ok(publishedTime >= before.getTime() - 1_000 && publishedTime <= after.getTime() + 1_000);
  assert.equal(
    source,
    `---\ntitle: ""\ndescription: ""\npublishedAt: "${publishedAt}"\ntags: []\ndraft: false\n---\n`,
  );

  await assert.rejects(run(slug));
  assert.equal(await readFile(path, "utf8"), source, "冲突时不得覆盖文章");
  await assert.rejects(build(), "未完成模板不得通过构建");

  const validSource = source
    .replace('title: ""', 'title: "新技术文章"')
    .replace('description: ""', 'description: "技术文章创建命令验收。"')
    .concat("\n正文。\n");
  await writeFile(path, validSource);
  await build();
  assert.match(await readFile(join(root, `dist/posts/${slug}/index.html`), "utf8"), /新技术文章/);

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
  await rejectsBuild(validSource.replace('title: "新技术文章"', 'title: ""'));
  await rejectsBuild(
    validSource.replace('description: "技术文章创建命令验收。"', 'description: ""'),
  );
  await rejectsBuild(validSource.replace("\n正文。\n", "\n"));
  await rejectsBuild(
    validSource.replace("draft: false", "draft: true").replace("\n正文。\n", "\n"),
  );
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}

console.log("技术文章创建命令验收通过");
