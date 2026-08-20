import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { appendFile, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { initRepoWithOrigin } from "./lib/test-git.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const script = fileURLToPath(new URL("new-shuoshuo.mjs", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-shuoshuo-"));
const { remoteDirectory } = await initRepoWithOrigin(workingDirectory);

function build(environment) {
  return execFileAsync(process.execPath, [astro, "build", "--force"], {
    cwd: root,
    env: environment,
  });
}

try {
  const before = new Date();
  await execFileAsync(process.execPath, [script], {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, TZ: "UTC" },
  });
  const after = new Date();
  const directory = join(workingDirectory, "src/content/shuoshuo");
  const files = await readdir(directory);

  assert.equal(files.length, 1);
  assert.match(files[0], /^\d{8}-\d{6}\.md$/);
  const source = await readFile(join(directory, files[0]), "utf8");
  const id = files[0].replace(/\.md$/, "");
  const publishedAt = source.match(/^publishedAt: "(.+)"$/m)?.[1];
  assert.ok(publishedAt, "应生成发布时间");
  const publishedTime = new Date(publishedAt).getTime();
  assert.ok(publishedTime >= before.getTime() - 1_000 && publishedTime <= after.getTime() + 1_000);
  assert.match(
    source,
    new RegExp(
      `publishedAt: "${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}T${id.slice(9, 11)}:${id.slice(11, 13)}:${id.slice(13, 15)}\\+08:00"`,
    ),
  );
  assert.match(source, /^draft: false$/m);
  assert.doesNotMatch(source, /^title:/m);
  assert.equal(source.replace(/^---\n[\s\S]*?\n---\n?/, "").trim(), "");

  const environment = {
    ...process.env,
    TZ: "UTC",
    POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
    SHUOSHUO_CONTENT_DIR: directory,
  };
  await assert.rejects(build(environment));

  await appendFile(
    join(directory, files[0]),
    "\n![第一张照片][one]\n\n[![第二张照片](https://example.com/two.jpg)](https://example.com/photo)\n\n[one]: https://example.com/one.jpg\n",
  );
  await build(environment);

  const home = await readFile(join(root, "dist/index.html"), "utf8");
  const timeline = await readFile(join(root, "dist/shuoshuo/index.html"), "utf8");
  const rss = await readFile(join(root, "dist/rss.xml"), "utf8");
  const publishedAtIso = new Date(publishedAt).toISOString();
  const publishedAtRss = new Date(publishedAt).toUTCString();
  assert.match(home, new RegExp(`href="/shuoshuo/#${id}"[^>]*>2 Images</a>`));
  assert.match(home, new RegExp(`datetime="${publishedAtIso}"`));
  assert.match(timeline, new RegExp(`id="${id}"`));
  assert.match(timeline, new RegExp(`href="/shuoshuo/#${id}"`));
  assert.match(timeline, new RegExp(`datetime="${publishedAtIso}"`));
  assert.equal((timeline.match(/<img /g) ?? []).length, 2);
  assert.match(rss, /<description>2 Images<\/description>/);
  assert.match(rss, new RegExp(`/shuoshuo/#${id}`));
  assert.match(rss, new RegExp(`<pubDate>${publishedAtRss}</pubDate>`));

  const validSource = await readFile(join(directory, files[0]), "utf8");
  await writeFile(
    join(directory, files[0]),
    validSource.replace("draft: false", "draft: false\ntitle: 不允许的标题"),
  );
  await assert.rejects(build(environment));

  const unquotedSource = validSource.replace(`"${publishedAt}"`, publishedAt);
  await writeFile(join(directory, files[0]), unquotedSource);
  await assert.rejects(build(environment));

  await writeFile(
    join(directory, files[0]),
    unquotedSource.replace(publishedAt, publishedAt.replace("+08:00", "Z")),
  );
  await assert.rejects(build(environment));

  await writeFile(join(directory, files[0]), validSource);
  await rename(join(directory, files[0]), join(directory, "20260230-120000.md"));
  await assert.rejects(build(environment));
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
  await rm(remoteDirectory, { recursive: true, force: true });
}

console.log("说说创建命令验收通过");
