import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const fakeGh = fileURLToPath(new URL("./fixture/fake-gh.mjs", import.meta.url));
const sourceSha = "aa".repeat(20);

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

async function writeGh(bin: string) {
  await mkdir(bin, { recursive: true });
  const path = join(bin, "gh");
  await writeFile(
    path,
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(fakeGh)} "$@"\n`,
  );
  await chmod(path, 0o755);
}

async function setup(t: { after: (fn: () => Promise<void>) => void }) {
  const workspace = await mkdtemp(join(tmpdir(), "publish-cli-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const content = join(workspace, "content");
  const remote = join(workspace, "remote.git");
  const bin = join(workspace, "bin");
  const statePath = join(workspace, "gh-state.json");
  const logPath = join(workspace, "gh-log.jsonl");
  await mkdir(content);
  await exec("git", ["init", "--bare", remote]);
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await writeFile(join(content, ".gitignore"), "node_modules/\n");
  await writeFile(join(content, "package.json"), '{"private":true}\n');
  await git(content, ["init", "-b", "main"]);
  await git(content, ["config", "user.email", "test@example.com"]);
  await git(content, ["config", "user.name", "Test"]);
  await git(content, ["remote", "add", "origin", "git@github.com:jasper0507/blog-content.git"]);
  await git(content, ["remote", "set-url", "--push", "origin", remote]);
  await git(content, ["add", "-A"]);
  await git(content, ["commit", "-m", "初始内容"]);
  const head = await git(content, ["rev-parse", "HEAD"]);
  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        repo: "jasper0507/blog-content",
        sourceSha,
        nextRunId: 1,
        commits: {
          "jasper0507/blog-content": { main: head },
          "jasper0507/jaspers-blog": { main: sourceSha },
        },
        runs: [],
        dispatches: [],
        pushResult: {
          stage: "deploy",
          status: "success",
          url: "https://jasper0507.me",
          sourceSha,
        },
        workflowResult: {
          stage: "deploy",
          status: "success",
          url: "https://jasper0507.me",
          sourceSha,
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeGh(bin);
  await writeFile(
    join(remote, "hooks/post-receive"),
    `#!/bin/sh\nexport FAKE_GH_STATE=${JSON.stringify(statePath)}\nwhile read oldrev newrev refname; do\n  ${JSON.stringify(process.execPath)} ${JSON.stringify(fakeGh)} record-push "$newrev"\ndone\n`,
    { mode: 0o755 },
  );
  await chmod(join(remote, "hooks/post-receive"), 0o755);
  await git(content, ["push", "-u", "origin", "main"], {
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_GH_STATE: statePath,
  });
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
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        FAKE_GH_STATE: statePath,
        FAKE_GH_LOG: logPath,
        JASPER_PUBLISH_POLL_MS: "20",
        JASPER_PUBLISH_TIMEOUT_MS: "2000",
        ...extra,
      },
      encoding: "utf8",
    });
  return { workspace, content, remote, statePath, logPath, run, bin };
}

test("有内容改动时只提交写作文件，推送后关联本次任务并报告上线", async t => {
  const { content, run, statePath } = await setup(t);
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
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const latest = state.runs.at(-1);
  assert.equal(message, "发布 Go 并发笔记");
  assert.equal(files, "posts/alpha.md\nshuoshuo/20240101-000002.md");
  assert.equal(staged, "package.json");
  assert.equal(await readFile(join(content, "posts/draft.md"), "utf8"), beforeDraft);
  assert.match(stdout, /posts\/alpha\.md/);
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
  assert.match(stdout, new RegExp(`内容提交 ${sha}`));
  assert.match(stdout, new RegExp(`源码提交 ${sourceSha}`));
  assert.match(stdout, /校验：通过[\s\S]*构建：通过[\s\S]*部署：通过/);
  assert.equal(latest.event, "push");
  assert.equal(latest.headSha, sha);
  assert.equal(await git(content, ["show", "HEAD:package.json"]), '{"private":true}');
  assert.doesNotMatch(await git(content, ["show", "HEAD:package.json"]), /echo no/);
});

test("远端内容超前时明确失败，保留本地提交且不强推", async t => {
  const { content, remote, workspace, run } = await setup(t);
  const other = join(workspace, "other");
  await exec("git", ["clone", remote, other]);
  await git(other, ["config", "user.email", "test@example.com"]);
  await git(other, ["config", "user.name", "Test"]);
  await writeFile(join(other, "posts/from-other.md"), "远端先到。\n");
  await git(other, ["add", "posts/from-other.md"]);
  await git(other, ["commit", "-m", "远端先到"]);
  const remoteSha = await git(other, ["rev-parse", "HEAD"]);
  await git(other, ["push", "origin", "HEAD"]);
  await writeFile(join(content, "about.md"), "# 关于我\n本地改动。\n");
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /远端内容超前，无法推送/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
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
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /推送失败/);
  assert.match(output, /模拟远端拒绝/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
  assert.notEqual(
    await git(content, ["rev-parse", "HEAD"]),
    await git(content, ["rev-parse", "origin/main"]),
  );
});

test("已有未推送内容提交时继续推送，不空提交也不误认为完成", async t => {
  const { content, run, statePath } = await setup(t);
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
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
  assert.doesNotMatch(stdout, /重新触发发布/);
  const latest = JSON.parse(await readFile(statePath, "utf8")).runs.at(-1);
  assert.equal(latest.event, "push");
  assert.equal(latest.headSha, localSha);
});

test("未设置上游且无新改动时重试，不把同提交的历史成功当作本次结果", async t => {
  const { content, run, statePath } = await setup(t);
  await git(content, ["branch", "--unset-upstream"]);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const before = JSON.parse(await readFile(statePath, "utf8"));
  before.runs.push({
    databaseId: 90,
    displayTitle: `发布 ${sha}`,
    event: "push",
    headSha: sha,
    status: "completed",
    conclusion: "success",
    createdAt: "2026-01-01T00:00:00Z",
    url: "https://github.com/jasper0507/blog-content/actions/runs/90",
    result: {
      contentSha: sha,
      sourceSha,
      stage: "deploy",
      status: "success",
      url: "https://jasper0507.me",
    },
  });
  await writeFile(statePath, `${JSON.stringify(before, null, 2)}\n`);
  const { stdout } = await run(["publish"]);
  assert.match(stdout, /重新触发发布/);
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
  assert.equal(await git(content, ["rev-parse", "HEAD"]), sha);
  const retry = JSON.parse(await readFile(statePath, "utf8")).runs.find(
    (item: { event: string; databaseId: number }) => item.event === "workflow_dispatch",
  );
  assert.ok(retry);
  assert.notEqual(retry.databaseId, 90);
  assert.match(retry.displayTitle, /^发布 /);
  assert.doesNotMatch(retry.displayTitle, new RegExp(sha));
});

test("无新内容时不空提交，重试关联新任务且不把历史成功当作本次结果", async t => {
  const { content, run, statePath } = await setup(t);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const before = JSON.parse(await readFile(statePath, "utf8"));
  before.workflowResult = {
    stage: "validate",
    status: "failure",
    error: "号码计数器无效",
    contentSha: sha,
    sourceSha,
  };
  before.runs.push({
    databaseId: 90,
    displayTitle: `发布 ${sha}`,
    event: "push",
    headSha: sha,
    status: "completed",
    conclusion: "success",
    createdAt: "2026-01-01T00:00:00Z",
    url: "https://github.com/jasper0507/blog-content/actions/runs/90",
    result: {
      contentSha: sha,
      sourceSha,
      stage: "deploy",
      status: "success",
      url: "https://jasper0507.me",
    },
  });
  await writeFile(statePath, `${JSON.stringify(before, null, 2)}\n`);
  const commitsBefore = await git(content, ["rev-list", "--count", "HEAD"]);
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  assert.match(`${failure.stdout}\n${failure.stderr}`, /内容已保存但未上线/);
  assert.match(`${failure.stdout}\n${failure.stderr}`, /校验：失败/);
  assert.match(`${failure.stdout}\n${failure.stderr}`, /号码计数器无效/);
  assert.equal(await git(content, ["rev-parse", "HEAD"]), sha);
  assert.equal(await git(content, ["rev-list", "--count", "HEAD"]), commitsBefore);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const retry = state.runs.find(
    (runItem: { event: string; databaseId: number }) => runItem.event === "workflow_dispatch",
  );
  assert.ok(retry);
  assert.notEqual(retry.databaseId, 90);
  assert.match(retry.displayTitle, /^发布 /);
});

test("推送后校验失败时保留提交且不宣称上线", async t => {
  const { content, run, statePath } = await setup(t);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.pushResult = {
    stage: "validate",
    status: "failure",
    error: "缺少内容来源或必要状态：about.md",
    sourceSha,
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(content, "about.md"), "# 关于我\n改过。\n");
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  assert.match(`${failure.stdout}\n${failure.stderr}`, /内容已保存但未上线/);
  assert.match(`${failure.stdout}\n${failure.stderr}`, /校验：失败/);
  assert.doesNotMatch(`${failure.stdout}\n${failure.stderr}`, /已上线/);
  assert.match(await git(content, ["log", "-1", "--pretty=%s"]), /更新博客内容/);
  assert.equal(
    await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    "about.md",
  );
  const remoteSha = await git(content, ["rev-parse", "origin/main"]);
  assert.equal(remoteSha, await git(content, ["rev-parse", "HEAD"]));
});

test("远端任务仍在进行时继续等待，完成后才报告上线", async t => {
  const { content, run, statePath } = await setup(t);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.pushResult.pending = true;
  state.completeAfterLists = 2;
  state.listCalls = 0;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(content, "about.md"), "# 关于我\n等待任务。\n");
  const { stdout } = await run(["publish"]);
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
  const after = JSON.parse(await readFile(statePath, "utf8"));
  assert.ok(after.listCalls >= 2);
  assert.equal(after.runs.at(-1).status, "completed");
});

test("无法确认远端任务时不把历史成功当作本次发布", async t => {
  const { content, run, statePath } = await setup(t);
  await writeFile(join(content, "shuoshuo/20240101-000001.md"), "draft: true\n");
  const failure = await run(["publish"], { FAKE_GH_FAIL: "run-list" }).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  assert.match(`${failure.stdout}\n${failure.stderr}`, /无法确认远端结果/);
  assert.match(`${failure.stdout}\n${failure.stderr}`, /内容已保存但未上线/);
  assert.doesNotMatch(`${failure.stdout}\n${failure.stderr}`, /已上线/);
  const sha = await git(content, ["rev-parse", "HEAD"]);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  assert.ok(state.runs.some((item: { headSha: string }) => item.headSha === sha));
});

test("省略说明时用默认文案，并忽略 npm 隐式 message", async t => {
  const { content, run } = await setup(t);
  await writeFile(join(content, "about.md"), "# 关于我\n默认说明。\n");
  const { stdout } = await run(["publish"], { npm_config_message: "不该使用" });
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
});

test("提交说明中的空格引号与 shell 字符只作为数据", async t => {
  const { content, run } = await setup(t);
  const message = `发布 "Go" 笔记 && true; echo $HOME`;
  await writeFile(join(content, "about.md"), "# 关于我\n特殊字符。\n");
  await run(["publish", message]);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), message);
});

test("经 npm 参数分隔传入自定义说明", async t => {
  const { content, bin, statePath, logPath } = await setup(t);
  await writeFile(
    join(content, "package.json"),
    `${JSON.stringify({ private: true, scripts: { publish: "jasper-content publish" } })}\n`,
  );
  await writeFile(join(content, "about.md"), "# 关于我\n经 npm 发布。\n");
  const { stdout } = await exec("npm", ["run", "publish", "--", "发布 Go 并发笔记"], {
    cwd: content,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_GH_STATE: statePath,
      FAKE_GH_LOG: logPath,
      JASPER_PUBLISH_POLL_MS: "20",
      JASPER_PUBLISH_TIMEOUT_MS: "2000",
    },
  });
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "发布 Go 并发笔记");
  assert.equal(
    await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    "about.md",
  );
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
});

test("多于一个提交说明参数时报用法错误", async t => {
  const { run } = await setup(t);
  const failure = await run(["publish", "一", "二"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  assert.match(`${failure.stdout}\n${failure.stderr}`, /用法：jasper-content publish/);
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
  assert.equal(files, "post-next-id.json\nposts/new-note.md");
  assert.equal(
    await git(content, ["diff", "--cached", "--name-only"]),
    ".github/workflows/publish.yml",
  );
  assert.equal(
    await readFile(join(content, ".github/workflows/publish.yml"), "utf8"),
    "name: keep\n",
  );
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
});

test("推送后构建失败时保留提交且不宣称上线", async t => {
  const { content, run, statePath } = await setup(t);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.pushResult = {
    stage: "build",
    status: "failure",
    error: "页面构建失败",
    sourceSha,
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(content, "about.md"), "# 关于我\n构建失败。\n");
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /校验：通过/);
  assert.match(output, /构建：失败/);
  assert.match(output, /页面构建失败/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "更新博客内容");
});

test("推送后部署失败时保留提交且不宣称上线", async t => {
  const { content, run, statePath } = await setup(t);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.pushResult = {
    stage: "deploy",
    status: "failure",
    error: "上传失败",
    sourceSha,
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(content, "about.md"), "# 关于我\n部署失败。\n");
  const failure = await run(["publish"]).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /校验：通过[\s\S]*构建：通过[\s\S]*部署：失败/);
  assert.match(output, /上传失败/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
});

test("无法下载发布结果时不宣称成功", async t => {
  const { content, run } = await setup(t);
  await writeFile(join(content, "about.md"), "# 关于我\n结果丢失。\n");
  const failure = await run(["publish"], { FAKE_GH_FAIL: "run-download" }).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /无法确认远端结果/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
});

test("查询超时时不宣称成功", async t => {
  const { content, run, statePath } = await setup(t);
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.pushResult.pending = true;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(join(content, "about.md"), "# 关于我\n查询超时。\n");
  const failure = await run(["publish"], { JASPER_PUBLISH_TIMEOUT_MS: "80" }).then(
    () => {
      throw new Error("应当失败");
    },
    error => error,
  );
  const output = `${failure.stdout}\n${failure.stderr}`;
  assert.match(output, /无法确认远端结果/);
  assert.match(output, /内容已保存但未上线/);
  assert.doesNotMatch(output, /已上线/);
  assert.equal(
    await git(content, ["rev-parse", "HEAD"]),
    await git(content, ["rev-parse", "origin/main"]),
  );
});
