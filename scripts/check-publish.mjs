import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ERROR_CODE, userMessage } from "./lib/repo-sync.mjs";

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

function output(error) {
  return `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
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
    assert.match(output(error), /用法：npm run publish -- "<commit message>"/);
    return true;
  });
  await assert.rejects(publish(["   "]));
  await assert.rejects(publish(["one", "two"]));
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await execFileAsync("git", ["init", "--bare", "--initial-branch=main"], {
    cwd: remoteDirectory,
  });
  await git("remote", "add", "origin", remoteDirectory);
  await git("push", "origin", "main:main");
  await assert.rejects(publish(["publish nothing"]), error => {
    assert.ok(output(error).includes(userMessage("publish", ERROR_CODE.NO_CHANGES)));
    return true;
  });
  assert.equal((await git("rev-list", "--count", "HEAD")).stdout.trim(), "1");

  await writeFile(join(workingDirectory, "new.txt"), "new\n");
  await assert.rejects(publish(["publish invalid site"], { FAIL_TEST: "1" }), error => {
    assert.ok(output(error).includes(userMessage("publish", ERROR_CODE.TEST_FAILED)));
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
  const published = await publish([message], { CHECK_LOG: checkLog });
  assert.match(published.stdout, /已发布到网上/);
  assert.equal(await readFile(checkLog, "utf8"), "test\n");
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

  const hook = join(remoteDirectory, "hooks/pre-receive");
  await writeFile(hook, "#!/bin/sh\nexit 1\n");
  await chmod(hook, 0o755);
  const beforePush = (await git("rev-parse", "HEAD")).stdout;
  await writeFile(join(workingDirectory, "fail.txt"), "fail\n");
  await assert.rejects(publish(["rejected push"]), error => {
    assert.ok(output(error).includes(userMessage("publish", ERROR_CODE.PUSH_FAILED)));
    return true;
  });
  assert.equal((await git("rev-parse", "HEAD")).stdout, beforePush);
  assert.equal(await readFile(join(workingDirectory, "fail.txt"), "utf8"), "fail\n");
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
  await rm(remoteDirectory, { recursive: true, force: true });
}

console.log("站点发布命令验收通过");
