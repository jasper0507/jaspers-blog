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
const fakeWrangler = fileURLToPath(new URL("./fixture/fake-wrangler.mjs", import.meta.url));
const pinScript = join(root, "packages/content-tools/content-repo/pin-publish-versions.js");
const publishScript = join(root, "scripts/publish-site.mjs");
const notifyScript = join(root, "scripts/notify-content-publish.mjs");
const contentSha = "cc".repeat(20);
const sourceSha = "dd".repeat(20);

async function writeBin(bin: string, name: string, script: string) {
  await mkdir(bin, { recursive: true });
  const path = join(bin, name);
  await writeFile(
    path,
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(script)} "$@"\n`,
  );
  await chmod(path, 0o755);
  return path;
}

async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await mkdtemp(join(tmpdir(), "publish-site-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  await writeBin(bin, "gh", fakeGh);
  const wrangler = await writeBin(bin, "wrangler", fakeWrangler);
  const statePath = join(dir, "gh-state.json");
  const ghLog = join(dir, "gh-log.jsonl");
  const wranglerLog = join(dir, "wrangler-log.jsonl");
  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        repo: "jasper0507/blog-content",
        sourceSha,
        nextRunId: 3,
        commits: {
          "jasper0507/blog-content": { main: contentSha },
          "jasper0507/jaspers-blog": { main: sourceSha },
        },
        runs: [
          {
            databaseId: 2,
            displayTitle: "发布 old",
            event: "push",
            headSha: contentSha,
            status: "in_progress",
            conclusion: null,
            createdAt: "2026-01-01T00:00:00Z",
            url: "https://example/2",
          },
        ],
        dispatches: [],
      },
      null,
      2,
    )}\n`,
  );
  return { dir, bin, wrangler, statePath, ghLog, wranglerLog };
}

type Workspace = Awaited<ReturnType<typeof workspace>>;

function envFor(dir: Workspace, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${dir.bin}:${process.env.PATH}`,
    FAKE_GH_STATE: dir.statePath,
    FAKE_GH_LOG: dir.ghLog,
    FAKE_WRANGLER_LOG: dir.wranglerLog,
    ...extra,
  };
}

function pipelineEnv(dir: Workspace, content: string, extra: NodeJS.ProcessEnv = {}) {
  return envFor(dir, {
    BLOG_CONTENT_DIR: content,
    PUBLISH_CONTENT_SHA: contentSha,
    PUBLISH_SOURCE_SHA: sourceSha,
    PUBLISH_SITE_URL: "https://jasper0507.me",
    PAGES_PROJECT: "jaspers-blog",
    PUBLISH_RESULT_PATH: join(dir.dir, "publish-result.json"),
    PUBLISH_WRANGLER: dir.wrangler,
    GITHUB_RUN_ID: "2",
    GITHUB_REPOSITORY: "jasper0507/blog-content",
    CLOUDFLARE_API_TOKEN: "secret-token-do-not-log",
    JASPER_ACCEPTANCE_DIST: join(dir.dir, "dist"),
    JASPER_ACCEPTANCE_CACHE: join(dir.dir, "cache"),
    ...extra,
  });
}

async function runNode(script: string, env: NodeJS.ProcessEnv, cwd = root) {
  return exec(process.execPath, [script], { cwd, env, encoding: "utf8" });
}

test("确定版本读取两仓 main 的准确提交", async t => {
  const dir = await workspace(t);
  const output = join(dir.dir, "github-output");
  const summary = join(dir.dir, "summary");
  await writeFile(output, "");
  await writeFile(summary, "");
  const { stdout } = await runNode(
    pinScript,
    envFor(dir, {
      GITHUB_REPOSITORY: "jasper0507/blog-content",
      SOURCE_REPO: "jasper0507/jaspers-blog",
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
    }),
  );
  assert.match(stdout, new RegExp(`content_sha=${contentSha}`));
  assert.match(stdout, new RegExp(`source_sha=${sourceSha}`));
  assert.match(await readFile(output, "utf8"), new RegExp(`content_sha=${contentSha}`));
  assert.match(await readFile(summary, "utf8"), new RegExp(`source_sha=${sourceSha}`));
});

test("真实外部内容校验构建成功后才上传，并记录两个提交", { timeout: 300_000 }, async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const dist = join(dir.dir, "dist");
  const cache = join(dir.dir, "cache");
  const resultPath = join(dir.dir, "publish-result.json");
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  const token = "secret-token-do-not-log";
  const { stdout, stderr } = await runNode(
    publishScript,
    pipelineEnv(dir, content, {
      PUBLISH_RESULT_PATH: resultPath,
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: "account",
      JASPER_ACCEPTANCE_DIST: dist,
      JASPER_ACCEPTANCE_CACHE: cache,
    }),
  );
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  const wrangler = JSON.parse(await readFile(dir.wranglerLog, "utf8"));
  const ghLog = await readFile(dir.ghLog, "utf8");
  assert.equal(result.status, "success");
  assert.equal(result.stage, "deploy");
  assert.equal(result.contentSha, contentSha);
  assert.equal(result.sourceSha, sourceSha);
  assert.equal(result.url, "https://jasper0507.me");
  assert.equal(wrangler.tokenSet, true);
  assert.ok(wrangler.argv.includes("pages"));
  assert.ok(wrangler.argv.includes("deploy"));
  assert.ok(wrangler.argv.includes(dist));
  assert.equal(wrangler.argv[wrangler.argv.indexOf("--project-name") + 1], "jaspers-blog");
  assert.equal(wrangler.argv[wrangler.argv.indexOf("--commit-hash") + 1], contentSha);
  assert.match(await readFile(join(dist, "posts/1/index.html"), "utf8"), /Alpha 正文/);
  assert.doesNotMatch(`${stdout}${stderr}${JSON.stringify(result)}`, /secret-token-do-not-log/);
  assert.doesNotMatch(ghLog, /commits\/main/);
});

test("必要内容缺失时校验失败且不上传", { timeout: 60_000 }, async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const resultPath = join(dir.dir, "publish-result.json");
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await rm(join(content, "about.md"));
  await assert.rejects(
    () => runNode(publishScript, pipelineEnv(dir, content, { PUBLISH_RESULT_PATH: resultPath })),
    /缺少内容来源或必要状态/,
  );
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(result.stage, "validate");
  assert.equal(result.status, "failure");
  assert.equal(result.contentSha, contentSha);
  assert.equal(result.sourceSha, sourceSha);
  await assert.rejects(readFile(dir.wranglerLog));
});

test("构建失败时不上传", { timeout: 300_000 }, async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const resultPath = join(dir.dir, "publish-result.json");
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await writeFile(join(content, "post-next-id.json"), "invalid\n");
  await assert.rejects(
    () => runNode(publishScript, pipelineEnv(dir, content, { PUBLISH_RESULT_PATH: resultPath })),
    /号码计数器无效/,
  );
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(result.stage, "build");
  assert.equal(result.status, "failure");
  await assert.rejects(readFile(dir.wranglerLog));
});

test("上传失败时记录部署阶段且不提供网站地址", { timeout: 300_000 }, async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const resultPath = join(dir.dir, "publish-result.json");
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await assert.rejects(
    () =>
      runNode(
        publishScript,
        pipelineEnv(dir, content, {
          PUBLISH_RESULT_PATH: resultPath,
          FAKE_WRANGLER_FAIL: "1",
        }),
      ),
    /模拟 Wrangler 上传失败/,
  );
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(result.stage, "deploy");
  assert.equal(result.status, "failure");
  assert.equal(result.url, undefined);
});

test("已有更新任务时构建成功也不上传，以免旧结果覆盖", { timeout: 300_000 }, async t => {
  const dir = await workspace(t);
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  state.runs.push({
    databaseId: 9,
    displayTitle: "发布 newer",
    event: "push",
    headSha: "ee".repeat(20),
    status: "in_progress",
    conclusion: null,
    createdAt: "2026-01-01T00:01:00Z",
    url: "https://example/9",
  });
  await writeFile(dir.statePath, `${JSON.stringify(state, null, 2)}\n`);
  const content = join(dir.dir, "content");
  const resultPath = join(dir.dir, "publish-result.json");
  await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
  await runNode(publishScript, pipelineEnv(dir, content, { PUBLISH_RESULT_PATH: resultPath }));
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(result.status, "skipped");
  assert.equal(result.stage, "deploy");
  await assert.rejects(readFile(dir.wranglerLog));
});

test("跨仓配置缺失时明确失败；配置后使用授权令牌触发同一流程", async t => {
  const dir = await workspace(t);
  for (const config of [
    { CONTENT_REPO: "", CONTENT_DISPATCH_TOKEN: "dispatch-token" },
    { CONTENT_REPO: "jasper0507/blog-content", CONTENT_DISPATCH_TOKEN: "" },
  ]) {
    await assert.rejects(runNode(notifyScript, envFor(dir, config)), /缺少跨仓发布配置/);
  }
  assert.equal(JSON.parse(await readFile(dir.statePath, "utf8")).dispatches.length, 0);
  await runNode(
    notifyScript,
    envFor(dir, {
      CONTENT_REPO: "jasper0507/blog-content",
      CONTENT_DISPATCH_TOKEN: "dispatch-token",
      GITHUB_SHA: sourceSha,
    }),
  );
  const dispatches = JSON.parse(await readFile(dir.statePath, "utf8")).dispatches;
  assert.equal(dispatches.length, 1);
  assert.equal(dispatches[0].event_type, "source-updated");
  assert.ok(dispatches[0].request_id);
});

test("内容仓工作流接收两种触发与重试，并固定检出已确定提交", async () => {
  const source = await readFile(
    join(root, "packages/content-tools/content-repo/.github/workflows/publish.yml"),
    "utf8",
  );
  assert.match(source, /push:[\s\S]*branches:\s*\[[^\]]*main/);
  assert.match(source, /repository_dispatch:[\s\S]*source-updated/);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /concurrency:[\s\S]*group:\s*site-publish[\s\S]*cancel-in-progress:\s*true/);
  assert.match(source, /ref:\s*\$\{\{\s*steps\.pin\.outputs\.content_sha\s*\}\}/);
  assert.match(source, /ref:\s*\$\{\{\s*steps\.pin\.outputs\.source_sha\s*\}\}/);
  assert.match(source, /actions:\s*write/);
  assert.match(source, /run: node scripts\/publish-site\.mjs build/);
  assert.match(source, /run: node scripts\/publish-site\.mjs deploy/);
  assert.match(source, /CLOUDFLARE_API_TOKEN: \$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN\s*\}\}/);
  assert.doesNotMatch(source, /CLOUDFLARE_API_TOKEN:\s*[^\s$]/);
  const buildStep = source.split("name: 校验并构建")[1]?.split("name: 安装 Wrangler")[0] ?? "";
  assert.doesNotMatch(buildStep, /CLOUDFLARE_/);
  const notify = await readFile(join(root, ".github/workflows/notify-content-publish.yml"), "utf8");
  assert.match(notify, /branches:\s*\[[^\]]*main/);
  assert.match(notify, /CONTENT_DISPATCH_TOKEN/);
  assert.match(notify, /notify-content-publish/);
  const ci = await readFile(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /BLOG_CONTENT_DIR: tests\/fixtures\/content/);
});
