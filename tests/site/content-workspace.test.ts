import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { prepareContentRepo } from "../../scripts/prepare-content-repo.mjs";
import { releaseContentTools } from "../../scripts/release-content-tools.mjs";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const fakeGh = fileURLToPath(new URL("./fixture/fake-gh.mjs", import.meta.url));
const fixtureContent = join(root, "tests/fixtures/content");
const templateDir = join(root, "packages/content-tools/content-repo");
const packedFiles = [
  "README.md",
  "cli.js",
  "content-paths.js",
  "create-content.js",
  "package.json",
  "post-rules.js",
  "publish-content.js",
  "shanghai-time.js",
  "shuoshuo-rules.js",
];
const releaseUrl =
  "https://github.com/jasper0507/jaspers-blog/releases/download/content-tools-v0.1.0/jasper-blog-content-tools-0.1.0.tgz";

async function git(cwd: string, args: string[]) {
  const { stdout, stderr } = await exec("git", args, { cwd, encoding: "utf8" });
  return `${stdout}${stderr}`.trim();
}

async function expectFailure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as Error & { stdout?: string; stderr?: string };
  }
  throw new Error("应当失败");
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

async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await mkdtemp(join(tmpdir(), "content-workspace-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  const statePath = join(dir, "gh-state.json");
  const logPath = join(dir, "gh-log.jsonl");
  await writeGh(bin);
  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        sourceRepo: "jasper0507/jaspers-blog",
        releases: [],
        createdRepos: [],
        existingRepos: [],
        actionsPermissions: {},
      },
      null,
      2,
    )}\n`,
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_GH_STATE: statePath,
    FAKE_GH_LOG: logPath,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
  return { dir, bin, statePath, logPath, env };
}

async function serveTarball(tarballPath: string, t: { after: (fn: () => Promise<void>) => void }) {
  const filename = basename(tarballPath);
  const data = await readFile(tarballPath);
  const server = createServer((req, res) => {
    if (req.url === `/${filename}`) {
      res.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": data.length,
      });
      res.end(data);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("无法监听发行包");
  return `http://127.0.0.1:${address.port}/${filename}`;
}

async function postIndex(directory: string) {
  const names = (await readdir(join(directory, "posts")))
    .filter(name => name.endsWith(".md"))
    .sort();
  const entries = await Promise.all(
    names.map(async name => {
      const source = await readFile(join(directory, "posts", name), "utf8");
      const id = source.match(/^id:\s*(\d+)\s*$/m)?.[1];
      return { name, id, source };
    }),
  );
  return entries;
}

async function shuoshuoIndex(directory: string) {
  const names = (await readdir(join(directory, "shuoshuo")))
    .filter(name => name.endsWith(".md"))
    .sort();
  const entries = await Promise.all(
    names.map(async name => ({
      name,
      source: await readFile(join(directory, "shuoshuo", name), "utf8"),
    })),
  );
  return entries;
}

test("发行包只含创建与发布工具，并上传到未占用的 GitHub Release", async t => {
  const dir = await workspace(t);
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  const listed = await exec("tar", ["-tzf", packed.tarballPath], { encoding: "utf8" });
  const files = listed.stdout
    .trim()
    .split("\n")
    .map(name => name.replace(/^package\//, ""))
    .filter(Boolean)
    .sort();
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  const log = await readFile(dir.logPath, "utf8");
  assert.equal(packed.tag, "content-tools-v0.1.0");
  assert.equal(packed.filename, "jasper-blog-content-tools-0.1.0.tgz");
  assert.equal(
    packed.assetUrl,
    "https://github.com/jasper0507/jaspers-blog/releases/download/content-tools-v0.1.0/jasper-blog-content-tools-0.1.0.tgz",
  );
  assert.deepEqual(files, packedFiles);
  assert.equal(state.releases.length, 1);
  assert.equal(state.releases[0].tag, packed.tag);
  assert.ok(state.releases[0].assets.some((asset: string) => asset.endsWith(packed.filename)));
  assert.match(log, /release","create"/);
  assert.doesNotMatch(listed.stdout, /astro|content-repo|posts\/|about\.md|CLOUDFLARE|\.env/);
});

test("已发布同版本时拒绝覆盖发行资源", async t => {
  const dir = await workspace(t);
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  state.releases.push({ tag: "content-tools-v0.1.0", assets: ["existing.tgz"] });
  await writeFile(dir.statePath, `${JSON.stringify(state, null, 2)}\n`);
  const error = await expectFailure(
    releaseContentTools({ root, packDestination: dir.dir, env: dir.env }),
  );
  const after = JSON.parse(await readFile(dir.statePath, "utf8"));
  assert.match(error.message, /已发布|拒绝覆盖/);
  assert.equal(after.releases.length, 1);
  assert.deepEqual(after.releases[0].assets, ["existing.tgz"]);
});

test("内容仓快照保留文件、稳定 ID 与计数器，不改写源码仓历史", async t => {
  const dir = await workspace(t);
  const source = join(dir.dir, "source");
  const output = join(dir.dir, "content");
  await mkdir(join(source, "src/content"), { recursive: true });
  await cp(fixtureContent, join(source, "src/content"), { recursive: true });
  await git(source, ["init", "-b", "main"]);
  await git(source, ["config", "user.email", "test@example.com"]);
  await git(source, ["config", "user.name", "Test"]);
  await git(source, ["add", "-A"]);
  await git(source, ["commit", "-m", "源码仓旧历史"]);
  await git(source, ["commit", "--allow-empty", "-m", "另一条源码提交"]);
  const sourceLog = await git(source, ["log", "--format=%H %s"]);
  await writeFile(join(source, "src/content/posts/uncommitted.md"), "---\nid: 99\n---\n未提交。\n");
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  await prepareContentRepo({
    contentSource: join(source, "src/content"),
    templateDir,
    outputDir: output,
    tarballUrl: await serveTarball(packed.tarballPath, t),
    npmCache: join(dir.dir, "cache"),
    env: dir.env,
  });
  assert.equal(await git(source, ["log", "--format=%H %s"]), sourceLog);
  assert.equal(
    await readFile(join(source, "src/content/posts/uncommitted.md"), "utf8"),
    "---\nid: 99\n---\n未提交。\n",
  );
  assert.equal(
    await readFile(join(output, "about.md"), "utf8"),
    await readFile(join(source, "src/content/about.md"), "utf8"),
  );
  assert.equal(
    await readFile(join(output, "post-next-id.json"), "utf8"),
    await readFile(join(source, "src/content/post-next-id.json"), "utf8"),
  );
  assert.equal(JSON.parse(await readFile(join(output, "post-next-id.json"), "utf8")).next, 7);
  const sourcePosts = await postIndex(join(source, "src/content"));
  const outputPosts = await postIndex(output);
  assert.deepEqual(
    outputPosts.map(item => ({ name: item.name, id: item.id })),
    sourcePosts.map(item => ({ name: item.name, id: item.id })),
  );
  assert.deepEqual(
    outputPosts.map(item => item.source),
    sourcePosts.map(item => item.source),
  );
  assert.deepEqual(await shuoshuoIndex(output), await shuoshuoIndex(join(source, "src/content")));
  await assert.rejects(readFile(join(output, ".git/HEAD")));
});

test("干净内容仓按锁定发行地址安装后可离线创建，且不含网站入口", async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  const tarballUrl = await serveTarball(packed.tarballPath, t);
  await prepareContentRepo({
    contentSource: fixtureContent,
    templateDir,
    outputDir: content,
    tarballUrl,
    npmCache: join(dir.dir, "cache"),
    env: dir.env,
  });
  const manifest = JSON.parse(await readFile(join(content, "package.json"), "utf8"));
  const lockfile = await readFile(join(content, "package-lock.json"), "utf8");
  const ignore = await readFile(join(content, ".gitignore"), "utf8");
  const readme = await readFile(join(content, "README.md"), "utf8");
  const workflow = await readFile(join(content, ".github/workflows/publish.yml"), "utf8");
  assert.equal(manifest.dependencies["@jasper-blog/content-tools"], tarballUrl);
  assert.equal(manifest.scripts["new:post"], "jasper-content new:post");
  assert.equal(manifest.scripts["new:shuoshuo"], "jasper-content new:shuoshuo");
  assert.equal(manifest.scripts.publish, "jasper-content publish");
  assert.equal(manifest.scripts.dev, undefined);
  assert.equal(manifest.scripts.build, undefined);
  assert.equal(manifest.scripts.preview, undefined);
  assert.match(ignore, /node_modules\//);
  assert.match(lockfile, /@jasper-blog\/content-tools/);
  assert.match(readme, /npm ci/);
  assert.match(readme, /new:post/);
  assert.match(readme, /new:shuoshuo/);
  assert.match(readme, /更新博客内容/);
  assert.match(readme, /draft/);
  assert.match(readme, /重试/);
  assert.match(readme, /升级/);
  assert.match(readme, /推送成功不等于上线|已保存但未上线/);
  assert.match(workflow, /publish-result/);
  assert.match(workflow, /workflow_dispatch:/);
  await assert.rejects(readFile(join(content, "astro.config.mjs")));

  const clean = join(dir.dir, "clean");
  await mkdir(clean);
  for (const name of ["package.json", "package-lock.json", "post-next-id.json", "about.md"]) {
    await writeFile(join(clean, name), await readFile(join(content, name)));
  }
  await cp(join(content, "posts"), join(clean, "posts"), { recursive: true });
  await cp(join(content, "shuoshuo"), join(clean, "shuoshuo"), { recursive: true });
  await exec(
    "npm",
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(dir.dir, "cache")],
    {
      cwd: clean,
      env: dir.env,
    },
  );
  const tool = JSON.parse(
    await readFile(join(clean, "node_modules/@jasper-blog/content-tools/package.json"), "utf8"),
  );
  assert.equal(Object.keys(tool.dependencies ?? {}).length, 0);
  const run = (args: string[]) =>
    exec(join(clean, "node_modules/.bin/jasper-content"), args, {
      cwd: clean,
      env: {
        ...dir.env,
        HTTP_PROXY: "http://127.0.0.1:1",
        HTTPS_PROXY: "http://127.0.0.1:1",
      },
    });
  await run(["new:post", "准备仓文章"]);
  await run(["new:shuoshuo"]);
  const created = await readFile(join(clean, "posts/准备仓文章.md"), "utf8");
  assert.match(created, /^id: 7$/m);
  assert.match(created, /^draft: false$/m);
  assert.match(created, /^publishedAt: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00"$/m);
  assert.equal(JSON.parse(await readFile(join(clean, "post-next-id.json"), "utf8")).next, 8);
  const shuoshuo = (await readdir(join(clean, "shuoshuo"))).filter(
    name =>
      !name.startsWith("20240101") && !name.startsWith("202501") && !name.startsWith("202601"),
  );
  assert.equal(shuoshuo.length, 1);
  assert.match(shuoshuo[0], /^\d{8}-\d{6}\.md$/);
});

test("拒绝覆盖已有准备目录中的写作内容", async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  await mkdir(content);
  await writeFile(join(content, "about.md"), "未提交的写作改动");
  await assert.rejects(
    prepareContentRepo({
      contentSource: fixtureContent,
      outputDir: content,
      tarballUrl: releaseUrl,
      env: dir.env,
    }),
    /已存在|空目录/,
  );
  assert.equal(await readFile(join(content, "about.md"), "utf8"), "未提交的写作改动");
});

test("准备远程仓时创建私有仓并关闭 Actions，不写入生产凭据", async t => {
  const dir = await workspace(t);
  const output = join(dir.dir, "content");
  const remote = join(dir.dir, "remote.git");
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  await prepareContentRepo({
    contentSource: fixtureContent,
    templateDir,
    outputDir: output,
    tarballUrl: await serveTarball(packed.tarballPath, t),
    npmCache: join(dir.dir, "cache"),
    applyRemote: true,
    contentRepo: "jasper0507/blog-content",
    pushUrl: remote,
    env: dir.env,
  });
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  const log = await readFile(dir.logPath, "utf8");
  assert.equal(state.createdRepos.length, 1);
  assert.equal(state.createdRepos[0].name, "jasper0507/blog-content");
  assert.equal(state.createdRepos[0].private, true);
  assert.equal(state.actionsPermissions["jasper0507/blog-content"], false);
  assert.doesNotMatch(log, /secret/);
  assert.doesNotMatch(log, /CLOUDFLARE|CONTENT_DISPATCH_TOKEN|wrangler/);
  assert.equal(await git(output, ["rev-list", "--count", "HEAD"]), "1");
  assert.doesNotMatch(await git(output, ["log", "-1", "--pretty=%s"]), /源码仓旧历史/);
  assert.equal(await git(output, ["rev-parse", "HEAD"]), await git(remote, ["rev-parse", "HEAD"]));
  const tracked = (await git(output, ["ls-files"])).split("\n");
  assert.ok(!tracked.some(name => name.startsWith("node_modules/")));
  assert.ok(tracked.includes(".github/workflows/publish.yml"));
  assert.ok(tracked.includes("package-lock.json"));
});

test("远程内容仓已存在时拒绝覆盖", async t => {
  const dir = await workspace(t);
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  state.existingRepos = ["jasper0507/blog-content"];
  await writeFile(dir.statePath, `${JSON.stringify(state, null, 2)}\n`);
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  const error = await expectFailure(
    prepareContentRepo({
      contentSource: fixtureContent,
      templateDir,
      outputDir: join(dir.dir, "content"),
      tarballUrl: await serveTarball(packed.tarballPath, t),
      npmCache: join(dir.dir, "cache"),
      applyRemote: true,
      contentRepo: "jasper0507/blog-content",
      env: dir.env,
    }),
  );
  const after = JSON.parse(await readFile(dir.statePath, "utf8"));
  assert.match(error.message, /已存在/);
  assert.equal(after.createdRepos.length, 0);
});

test("准备仓的 publish 关联内容仓工作流并报告上线", async t => {
  const dir = await workspace(t);
  const content = join(dir.dir, "content");
  const remote = join(dir.dir, "remote.git");
  const sourceSha = "aa".repeat(20);
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  const packed = await releaseContentTools({
    root,
    packDestination: dir.dir,
    env: dir.env,
  });
  await prepareContentRepo({
    contentSource: fixtureContent,
    templateDir,
    outputDir: content,
    tarballUrl: await serveTarball(packed.tarballPath, t),
    npmCache: join(dir.dir, "cache"),
    env: dir.env,
  });
  await git(content, ["init", "-b", "main"]);
  await git(content, ["config", "user.email", "test@example.com"]);
  await git(content, ["config", "user.name", "Test"]);
  await git(content, ["remote", "add", "origin", "git@github.com:jasper0507/blog-content.git"]);
  await git(content, ["remote", "set-url", "--push", "origin", remote]);
  await git(content, ["add", "-A"]);
  await git(content, ["commit", "-m", "初始内容"]);
  const state = JSON.parse(await readFile(dir.statePath, "utf8"));
  Object.assign(state, {
    repo: "jasper0507/blog-content",
    sourceSha,
    nextRunId: 1,
    commits: {
      "jasper0507/blog-content": { main: await git(content, ["rev-parse", "HEAD"]) },
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
  });
  await writeFile(dir.statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(
    join(remote, "hooks/post-receive"),
    `#!/bin/sh\nexport FAKE_GH_STATE=${JSON.stringify(dir.statePath)}\nwhile read oldrev newrev refname; do\n  ${JSON.stringify(process.execPath)} ${JSON.stringify(fakeGh)} record-push "$newrev"\ndone\n`,
  );
  await chmod(join(remote, "hooks/post-receive"), 0o755);
  await writeFile(join(content, "about.md"), "# 关于我\n准备仓发布。\n");
  const workflow = await readFile(join(content, ".github/workflows/publish.yml"), "utf8");
  assert.match(workflow, /name: 发布网站/);
  assert.match(workflow, /workflow_dispatch:/);
  const { stdout } = await exec("npm", ["run", "publish", "--", "发布准备仓"], {
    cwd: content,
    encoding: "utf8",
    env: {
      ...dir.env,
      JASPER_PUBLISH_POLL_MS: "20",
      JASPER_PUBLISH_TIMEOUT_MS: "2000",
    },
  });
  assert.equal(await git(content, ["log", "-1", "--pretty=%s"]), "发布准备仓");
  assert.equal(
    await git(content, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    "about.md",
  );
  assert.match(stdout, /已上线 https:\/\/jasper0507\.me/);
  const latest = JSON.parse(await readFile(dir.statePath, "utf8")).runs.at(-1);
  assert.equal(latest.event, "push");
  assert.equal(latest.headSha, await git(content, ["rev-parse", "HEAD"]));
});

test("准备命令拒绝未知、重复和缺值参数，不写入工作区", async t => {
  const dir = await workspace(t);
  const output = join(dir.dir, "content");
  for (const args of [
    ["--repoo", "owner/content"],
    ["--repo", "owner/one", "--repo", "owner/two"],
    ["--repo"],
  ]) {
    const error = await expectFailure(
      exec(
        process.execPath,
        [
          join(root, "scripts/prepare-content-repo.mjs"),
          "--output",
          output,
          "--tarball-url",
          releaseUrl,
          ...args,
        ],
        { env: dir.env },
      ),
    );
    assert.match(error.stderr ?? "", /Unknown option|重复参数|argument missing/);
    await assert.rejects(readdir(output));
  }
});
