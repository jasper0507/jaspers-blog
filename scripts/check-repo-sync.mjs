import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { ERROR_CODE, alignMain, userMessage } from "./lib/repo-sync.mjs";
import { git, initRepoWithOrigin } from "./lib/test-git.mjs";

const execFileAsync = promisify(execFile);
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-sync-"));
const { remoteDirectory } = await initRepoWithOrigin(workingDirectory);

async function cloneAuthor() {
  const directory = await mkdtemp(join(tmpdir(), "newblog-sync-author-"));
  await git(workingDirectory, ["clone", remoteDirectory, directory]);
  await git(directory, ["config", "user.name", "Remote Author"]);
  await git(directory, ["config", "user.email", "remote@example.com"]);
  return directory;
}

async function withNonEnglishGit(run) {
  const bin = await mkdtemp(join(tmpdir(), "newblog-git-lang-"));
  const realGit = (await execFileAsync("sh", ["-c", "command -v git"])).stdout.trim();
  await writeFile(
    join(bin, "git"),
    `#!/bin/sh
if [ "$1" = "merge" ]; then
  stdout=$(mktemp)
  stderr=$(mktemp)
  ${JSON.stringify(realGit)} "$@" >"$stdout" 2>"$stderr"
  status=$?
  cat "$stdout"
  sed -e 's/would be overwritten/将被覆盖/g' \\
      -e 's/uncommitted changes/尚未提交的改动/g' \\
      -e 's/local changes/工作区改动/g' "$stderr" >&2
  rm -f "$stdout" "$stderr"
  exit $status
fi
exec ${JSON.stringify(realGit)} "$@"
`,
  );
  await chmod(join(bin, "git"), 0o755);
  const previousPath = process.env.PATH;
  process.env.PATH = `${bin}${delimiter}${previousPath}`;
  try {
    await run();
  } finally {
    process.env.PATH = previousPath;
    await rm(bin, { recursive: true, force: true });
  }
}

try {
  const same = await alignMain(workingDirectory, "publish");
  assert.equal(same.status, "same");

  const author = await cloneAuthor();
  try {
    await writeFile(join(author, "remote-only.txt"), "remote\n");
    await git(author, ["add", "-A"]);
    await git(author, ["commit", "-m", "remote ahead"]);
    await git(author, ["push", "origin", "main"]);

    await writeFile(join(workingDirectory, "local-only.txt"), "local\n");
    const forwarded = await alignMain(workingDirectory, "publish");
    assert.equal(forwarded.status, "fast-forwarded");
    assert.equal(await readFile(join(workingDirectory, "remote-only.txt"), "utf8"), "remote\n");
    assert.equal(await readFile(join(workingDirectory, "local-only.txt"), "utf8"), "local\n");
  } finally {
    await rm(author, { recursive: true, force: true });
  }

  const overlapAuthor = await cloneAuthor();
  try {
    await writeFile(join(overlapAuthor, ".keep"), "remote keep\n");
    await git(overlapAuthor, ["add", "-A"]);
    await git(overlapAuthor, ["commit", "-m", "change keep"]);
    await git(overlapAuthor, ["push", "origin", "main"]);

    await writeFile(join(workingDirectory, ".keep"), "local keep\n");
    await assert.rejects(alignMain(workingDirectory, "publish"), error => {
      assert.equal(error.code, ERROR_CODE.CONFLICT);
      assert.equal(error.message, userMessage("publish", ERROR_CODE.CONFLICT));
      return true;
    });
    assert.equal(await readFile(join(workingDirectory, ".keep"), "utf8"), "local keep\n");
    await git(workingDirectory, ["checkout", "--", ".keep"]);
    await git(workingDirectory, ["merge", "--ff-only", "origin/main"]);
  } finally {
    await rm(overlapAuthor, { recursive: true, force: true });
  }

  const translatedAuthor = await cloneAuthor();
  try {
    await writeFile(join(translatedAuthor, ".keep"), "remote keep translated\n");
    await git(translatedAuthor, ["add", "-A"]);
    await git(translatedAuthor, ["commit", "-m", "change keep again"]);
    await git(translatedAuthor, ["push", "origin", "main"]);

    await writeFile(join(workingDirectory, ".keep"), "local keep translated\n");
    await withNonEnglishGit(async () => {
      await assert.rejects(alignMain(workingDirectory, "publish"), error => {
        assert.equal(error.code, ERROR_CODE.CONFLICT, "git 非英文时未保存文件冲突仍应报文件撞车");
        assert.equal(error.message, userMessage("publish", ERROR_CODE.CONFLICT));
        return true;
      });
    });
    assert.equal(
      await readFile(join(workingDirectory, ".keep"), "utf8"),
      "local keep translated\n",
    );
    await git(workingDirectory, ["checkout", "--", ".keep"]);
    await git(workingDirectory, ["merge", "--ff-only", "origin/main"]);
  } finally {
    await rm(translatedAuthor, { recursive: true, force: true });
  }

  await writeFile(join(workingDirectory, "ahead.txt"), "ahead\n");
  await git(workingDirectory, ["add", "-A"]);
  await git(workingDirectory, ["commit", "-m", "local ahead"]);
  const ahead = await alignMain(workingDirectory, "create");
  assert.equal(ahead.status, "ahead");

  const divergeAuthor = await cloneAuthor();
  try {
    await writeFile(join(divergeAuthor, "other.txt"), "other\n");
    await git(divergeAuthor, ["add", "-A"]);
    await git(divergeAuthor, ["commit", "-m", "remote diverge"]);
    await git(divergeAuthor, ["push", "origin", "main"]);
    await assert.rejects(alignMain(workingDirectory, "publish"), error => {
      assert.equal(error.code, ERROR_CODE.DIVERGED);
      assert.equal(error.message, userMessage("publish", ERROR_CODE.DIVERGED));
      return true;
    });
    assert.equal(
      (await git(workingDirectory, ["log", "-1", "--format=%s"])).stdout,
      "local ahead\n",
    );
  } finally {
    await rm(divergeAuthor, { recursive: true, force: true });
  }

  await git(workingDirectory, ["switch", "-c", "side"]);
  await assert.rejects(alignMain(workingDirectory, "create"), error => {
    assert.equal(error.code, ERROR_CODE.NOT_ON_MAIN);
    assert.equal(error.message, userMessage("create", ERROR_CODE.NOT_ON_MAIN));
    return true;
  });
  await git(workingDirectory, ["switch", "main"]);

  await git(workingDirectory, ["remote", "remove", "origin"]);
  await assert.rejects(alignMain(workingDirectory, "publish"), error => {
    assert.equal(error.code, ERROR_CODE.NO_ORIGIN);
    assert.equal(error.message, userMessage("publish", ERROR_CODE.NO_ORIGIN));
    return true;
  });
  await git(workingDirectory, ["remote", "add", "origin", remoteDirectory]);

  await git(workingDirectory, [
    "remote",
    "set-url",
    "origin",
    join(tmpdir(), "missing-origin.git"),
  ]);
  await assert.rejects(alignMain(workingDirectory, "create"), error => {
    assert.equal(error.code, ERROR_CODE.NETWORK);
    assert.equal(error.message, userMessage("create", ERROR_CODE.NETWORK));
    return true;
  });
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
  await rm(remoteDirectory, { recursive: true, force: true });
}

console.log("仓库对齐命令验收通过");
