import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function git(cwd, args) {
  return execFileAsync("git", args, { cwd, encoding: "utf8" });
}

export async function initRepoWithOrigin(workingDirectory, name = "Test") {
  const remoteDirectory = await mkdtemp(join(tmpdir(), "newblog-remote-"));
  await execFileAsync("git", ["init", "--bare", "--initial-branch=main"], {
    cwd: remoteDirectory,
  });
  await git(workingDirectory, ["init", "--initial-branch=main"]);
  await git(workingDirectory, ["config", "user.name", name]);
  await git(workingDirectory, ["config", "user.email", "test@example.com"]);
  await writeFile(join(workingDirectory, ".keep"), "keep\n");
  await git(workingDirectory, ["add", "-A"]);
  await git(workingDirectory, ["commit", "-m", "initial"]);
  await git(workingDirectory, ["remote", "add", "origin", remoteDirectory]);
  await git(workingDirectory, ["push", "origin", "main:main"]);
  return { remoteDirectory };
}
