import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));

async function packTool(workspace: string) {
  const { stdout } = await exec("npm", [
    "pack",
    "./packages/content-tools",
    "--json",
    "--pack-destination",
    workspace,
    "--cache",
    join(workspace, "cache"),
  ]);
  return JSON.parse(stdout)[0] as { filename: string };
}

async function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const { stdout, stderr } = await exec("git", args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: "utf8",
  });
  return `${stdout}${stderr}`.trim();
}

async function expectFailure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as { stdout?: string; stderr?: string };
  }
  throw new Error("应当失败");
}

function output(error: { stdout?: string; stderr?: string }) {
  return `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
}

async function setup(t: { after: (fn: () => Promise<void>) => void }) {
  const workspace = await mkdtemp(join(tmpdir(), "publish-cli-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const content = join(workspace, "content");
  const remote = join(workspace, "remote.git");
  await mkdir(content);
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await writeFile(join(content, ".gitignore"), "node_modules/\n");
  await writeFile(join(content, "package.json"), '{"private":true}\n');
  await git(content, ["init", "-b", "main"]);
  await git(content, ["config", "user.email", "test@example.com"]);
  await git(content, ["config", "user.name", "Test"]);
  await git(content, ["remote", "add", "origin", remote]);
  await git(content, ["add", "-A"]);
  await git(content, ["commit", "-m", "初始内容"]);
  await git(content, ["push", "-u", "origin", "main"]);
  const packed = await packTool(workspace);
  await exec(
    "npm",
    [
      "install",
      join(workspace, packed.filename),
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      join(workspace, "cache"),
    ],
    { cwd: content },
  );
  const run = (args: string[], extra: NodeJS.ProcessEnv = {}) =>
    exec(join(content, "node_modules/.bin/jasper-content"), args, {
      cwd: content,
      env: { ...process.env, ...extra },
      encoding: "utf8",
    });
  return { workspace, content, remote, run };
}

test("有内容改动时只提交写作文件并推送，不夹带入口文件", async t => {
  const { content, run } = await setup(t);
  await writeFile(
    join(content, "posts/alpha.md"),
    `${await readFile(join(content, "posts/alpha.md"), "utf8")}\n补一段。\n`,
  );
  await rm(join(content, "shuoshuo/20240101-000002.md"));
  await writeFile(
    join(content, "package.json"),
    '{"private":true,"scripts":{"publish":"echo no"}}\n',
  );
  await git(content, ["add", "package.json"]);
  const beforeDraft = await readFile(join(content, "posts/draft.md"), "utf8");
  const { stdout } = await run(["publish", "发布 Go 并发笔记"]);
  const message = await git(content, ["log", "-1", "--pretty=%s"]);
  const files = (await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]))
    .split("\n")
    .filter(Boolean)
    .sort()
    .join("\n");
  const staged = await git(content, ["diff", "--cached", "--name-only"]);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  assert.equal(message, "发布 Go 并发笔记");
  assert.equal(files, "posts/alpha.md\nshuoshuo/20240101-000002.md");
  assert.equal(staged, "package.json");
  assert.equal(await readFile(join(content, "posts/draft.md"), "utf8"), beforeDraft);
  assert.match(stdout, /posts\/alpha\.md/);
  assert.match(stdout, new RegExp(`已推送 ${sha}`));
  assert.doesNotMatch(stdout, /已上线/);
  assert.equal(await git(content, ["rev-parse", "origin/main"]), sha);
  assert.equal(await git(content, ["show", "HEAD:package.json"]), '{"private":true}');
  assert.doesNotMatch(await git(content, ["show", "HEAD:package.json"]), /echo no/);
});

test("远端内容超前时明确失败，保留本地提交且不强推", async t => {
  const { content, remote, workspace, run } = await setup(t);
  const other = join(workspace, "other");
  await exec("git", ["clone", "-b", "main", remote, other]);
  assert.ok(existsSync(join(other, "posts/alpha.md")), "第二份仓应检出 main 上的内容");
  await git(other, ["config", "user.email", "test@example.com"]);
  await git(other, ["config", "user.name", "Test"]);
  await writeFile(join(other, "posts/from-other.md"), "远端先到。\n");
  await git(other, ["add", "posts/from-other.md"]);
  await git(other, ["commit", "-m", "远端先到"]);
  const remoteSha = await git(other, ["rev-parse", "HEAD"]);
  await git(other, ["push", "origin", "HEAD"]);
  await writeFile(join(content, "about.md"), "# 关于我\n本地改动。\n");
  const failure = await expectFailure(run(["publish"]));
  const text = output(failure);
  assert.match(text, /远端内容超前，无法推送/);
  assert.doesNotMatch(text, /已推送/);
  assert.doesNotMatch(text, /已上线/);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
  assert.equal(
    await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    "about.md",
  );
  assert.equal(await git(remote, ["rev-parse", "HEAD"]), remoteSha);
  assert.notEqual(await git(content, ["rev-parse", "HEAD"]), remoteSha);
});

test("推送被拒绝时保留本地提交并报告推送失败", async t => {
  const { content, remote, run } = await setup(t);
  await writeFile(join(remote, "hooks/pre-receive"), "#!/bin/sh\necho 模拟远端拒绝 >&2\nexit 1\n");
  await chmod(join(remote, "hooks/pre-receive"), 0o755);
  await writeFile(join(content, "about.md"), "# 关于我\n推送失败。\n");
  const failure = await expectFailure(run(["publish"]));
  const text = output(failure);
  assert.match(text, /推送失败/);
  assert.match(text, /模拟远端拒绝/);
  assert.doesNotMatch(text, /已推送/);
  assert.doesNotMatch(text, /已上线/);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
  assert.notEqual(
    await git(content, ["rev-parse", "HEAD"]),
    await git(content, ["rev-parse", "origin/main"]),
  );
});

test("已有未推送内容提交时继续推送，不空提交", async t => {
  const { content, run } = await setup(t);
  await writeFile(
    join(content, "posts/alpha.md"),
    `${await readFile(join(content, "posts/alpha.md"), "utf8")}\n未推送的修改。\n`,
  );
  await git(content, ["add", "posts/alpha.md"]);
  await git(content, ["commit", "-m", "本地已提交未推送"]);
  const localSha = await git(content, ["rev-parse", "HEAD"]);
  const commitsBefore = await git(content, ["rev-list", "--count", "HEAD"]);
  const { stdout } = await run(["publish"]);
  assert.equal(await git(content, ["rev-parse", "HEAD"]), localSha);
  assert.equal(await git(content, ["rev-list", "--count", "HEAD"]), commitsBefore);
  assert.equal(await git(content, ["rev-parse", "origin/main"]), localSha);
  assert.match(stdout, new RegExp(`已推送 ${localSha}`));
  assert.doesNotMatch(stdout, /没有新的写作要提交/);
});

test("无新写作且已同步时不空提交，打印没有新的写作要提交", async t => {
  const { content, run } = await setup(t);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const commitsBefore = await git(content, ["rev-list", "--count", "HEAD"]);
  const { stdout } = await run(["publish"]);
  assert.match(stdout, /没有新的写作要提交/);
  assert.doesNotMatch(stdout, /已推送/);
  assert.equal(await git(content, ["rev-parse", "HEAD"]), sha);
  assert.equal(await git(content, ["rev-list", "--count", "HEAD"]), commitsBefore);
  assert.equal(await git(content, ["rev-parse", "origin/main"]), sha);
});

test("未设置上游且无新改动、远端已有该提交时不推送", async t => {
  const { content, run } = await setup(t);
  await git(content, ["branch", "--unset-upstream"]);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const { stdout } = await run(["publish"]);
  assert.match(stdout, /没有新的写作要提交/);
  assert.doesNotMatch(stdout, /已推送/);
  assert.equal(await git(content, ["rev-parse", "HEAD"]), sha);
});

test("省略说明时用默认文案，并忽略 npm 隐式 message", async t => {
  const { content, run } = await setup(t);
  await writeFile(join(content, "about.md"), "# 关于我\n默认说明。\n");
  const { stdout } = await run(["publish"], { npm_config_message: "不该使用" });
  const sha = await git(content, ["rev-parse", "HEAD"]);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
  assert.match(stdout, new RegExp(`已推送 ${sha}`));
});

test("提交说明中的空格引号与 shell 字符只作为数据", async t => {
  const { content, run } = await setup(t);
  const message = `发布 "Go" 笔记 && true; echo $HOME`;
  await writeFile(join(content, "about.md"), "# 关于我\n特殊字符。\n");
  await run(["publish", message]);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), message);
});

test("多于一个提交说明参数时报用法错误", async t => {
  const { run } = await setup(t);
  const failure = await expectFailure(run(["publish", "一", "二"]));
  assert.match(output(failure), /用法：jasper-content publish/);
});

test("提交新增文章和号码计数器，不夹带已暂存工作流", async t => {
  const { content, run } = await setup(t);
  await writeFile(
    join(content, "posts/new-note.md"),
    `---
title: 新笔记
description: 摘要
publishedAt: "2026-09-13T12:00:00+08:00"
tags: []
draft: false
id: 7
---

正文。
`,
  );
  await writeFile(join(content, "post-next-id.json"), '{"next":8}\n');
  await mkdir(join(content, ".github/workflows"), { recursive: true });
  await writeFile(join(content, ".github/workflows/publish.yml"), "name: keep\n");
  await git(content, ["add", ".github/workflows/publish.yml"]);
  const { stdout } = await run(["publish"]);
  const files = (await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]))
    .split("\n")
    .filter(Boolean)
    .sort()
    .join("\n");
  const sha = await git(content, ["rev-parse", "HEAD"]);
  assert.equal(files, "post-next-id.json\nposts/new-note.md");
  assert.equal(
    await git(content, ["diff", "--cached", "--name-only"]),
    ".github/workflows/publish.yml",
  );
  assert.equal(
    await readFile(join(content, ".github/workflows/publish.yml"), "utf8"),
    "name: keep\n",
  );
  assert.match(stdout, new RegExp(`已推送 ${sha}`));
});
