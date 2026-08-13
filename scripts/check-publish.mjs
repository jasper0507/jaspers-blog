import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const publishScript = join(root, "scripts/publish.mjs");
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-publish-"));
const remoteDirectory = await mkdtemp(join(tmpdir(), "newblog-publish-remote-"));

function nodeEvalCommand(source) {
  return `${JSON.stringify(process.execPath)} -e ${JSON.stringify(source)}`;
}

async function git(...args) {
  return execFileAsync("git", args, { cwd: workingDirectory, encoding: "utf8" });
}

function publish(args = [], env = {}) {
  return execFileAsync("npm", ["run", "publish", "--", ...args], {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

try {
  await writeFile(
    join(workingDirectory, "package.json"),
    JSON.stringify({
      name: "publish-test",
      private: true,
      version: "1.0.0",
      scripts: {
        publish: `${JSON.stringify(process.execPath)} ${JSON.stringify(publishScript)}`,
        test: nodeEvalCommand(
          'if(process.env.CHECK_LOG)require("node:fs").appendFileSync(process.env.CHECK_LOG,"test\\n");process.exit(process.env.FAIL_TEST === "1" ? 1 : 0)',
        ),
        build: nodeEvalCommand(
          'if(process.env.CHECK_LOG)require("node:fs").appendFileSync(process.env.CHECK_LOG,"build\\n");process.exit(process.env.FAIL_BUILD === "1" ? 1 : 0)',
        ),
      },
    }),
  );
  await git("init", "--initial-branch=main");
  await git("config", "user.name", "Publish Test");
  await git("config", "user.email", "publish@example.com");
  await writeFile(join(workingDirectory, "initial.txt"), "initial\n");
  await writeFile(join(workingDirectory, "deleted.txt"), "delete me\n");
  await git("add", "-A");
  await git("commit", "-m", "initial");

  await assert.rejects(publish(), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /用法：npm run publish -- "<commit message>"/);
    return true;
  });
  await assert.rejects(publish(["   "]));
  await assert.rejects(publish(["one", "two"]));
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await git("switch", "-c", "draft");
  await assert.rejects(publish(["publish draft"]), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /站点发布只允许在 main 分支运行/);
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await git("switch", "main");
  await assert.rejects(publish(["publish without remote"]), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /找不到目标 remote：origin/);
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await execFileAsync("git", ["init", "--bare", "--initial-branch=main"], {
    cwd: remoteDirectory,
  });
  await git("remote", "add", "origin", remoteDirectory);
  await git("push", "origin", "main:main");
  await assert.rejects(publish(["publish nothing"]), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /没有可提交的改动/);
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await writeFile(join(workingDirectory, "new.txt"), "new\n");
  await assert.rejects(publish(["publish invalid site"], { FAIL_TEST: "1" }), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /完整校验失败；未创建发布提交/);
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");
  assert.equal(
    (await git("rev-parse", "origin/main")).stdout,
    (await git("rev-parse", "HEAD")).stdout,
  );

  await assert.rejects(publish(["publish broken build"], { FAIL_BUILD: "1" }), error => {
    assert.match(`${error.stdout}\n${error.stderr}`, /生产构建失败；未创建发布提交/);
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");
  assert.equal(
    (await git("rev-parse", "origin/main")).stdout,
    (await git("rev-parse", "HEAD")).stdout,
  );

  const message = "publish all changes\n\n完整提交信息";
  const checkLog = join(workingDirectory, ".git/publish-checks");
  await writeFile(join(workingDirectory, "initial.txt"), "changed\n");
  await rm(join(workingDirectory, "deleted.txt"));
  await publish([message], { CHECK_LOG: checkLog });
  assert.equal(await readFile(checkLog, "utf8"), "test\nbuild\n");
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "2");
  assert.equal(
    (await git("cat-file", "-p", "HEAD")).stdout.split("\n\n").slice(1).join("\n\n"),
    `${message}\n`,
  );
  assert.equal(
    (await git("rev-parse", "origin/main")).stdout,
    (await git("rev-parse", "HEAD")).stdout,
  );
  assert.equal((await git("status", "--porcelain")).stdout, "");
  assert.equal((await git("show", "HEAD:initial.txt")).stdout, "changed\n");
  assert.equal((await git("show", "HEAD:new.txt")).stdout, "new\n");
  await assert.rejects(git("cat-file", "-e", "HEAD:deleted.txt"));

  const remoteAuthorDirectory = await mkdtemp(join(tmpdir(), "newblog-publish-author-"));
  try {
    await execFileAsync("git", ["clone", remoteDirectory, remoteAuthorDirectory]);
    await execFileAsync("git", ["config", "user.name", "Remote Author"], {
      cwd: remoteAuthorDirectory,
    });
    await execFileAsync("git", ["config", "user.email", "remote@example.com"], {
      cwd: remoteAuthorDirectory,
    });
    await writeFile(join(remoteAuthorDirectory, "remote.txt"), "remote\n");
    await execFileAsync("git", ["add", "-A"], { cwd: remoteAuthorDirectory });
    await execFileAsync("git", ["commit", "-m", "remote ahead"], {
      cwd: remoteAuthorDirectory,
    });
    await execFileAsync("git", ["push", "origin", "main"], { cwd: remoteAuthorDirectory });

    const remoteHead = (
      await execFileAsync("git", ["--git-dir", remoteDirectory, "rev-parse", "main"])
    ).stdout;
    await writeFile(join(workingDirectory, "local.txt"), "local\n");
    await assert.rejects(publish(["local publish"]), error => {
      assert.match(
        `${error.stdout}\n${error.stderr}`,
        /推送到 origin\/main 失败；本地发布提交已保留，请手动同步远程并处理冲突后再推送/,
      );
      return true;
    });
    assert.equal((await git("log", "-1", "--format=%s")).stdout, "local publish\n");
    assert.equal(
      (await execFileAsync("git", ["--git-dir", remoteDirectory, "rev-parse", "main"])).stdout,
      remoteHead,
    );
  } finally {
    await rm(remoteAuthorDirectory, { recursive: true, force: true });
  }
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
  await rm(remoteDirectory, { recursive: true, force: true });
}

console.log("站点发布命令验收通过");
