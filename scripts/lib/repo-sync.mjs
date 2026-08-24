import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ERROR_CODE = {
  NOT_ON_MAIN: "NOT_ON_MAIN",
  NO_ORIGIN: "NO_ORIGIN",
  NETWORK: "NETWORK",
  DIVERGED: "DIVERGED",
  CONFLICT: "CONFLICT",
  NO_CHANGES: "NO_CHANGES",
  TEST_FAILED: "TEST_FAILED",
  PUSH_FAILED: "PUSH_FAILED",
};

const messages = {
  create: {
    NOT_ON_MAIN: "创建和发布只能在主线上进行。",
    NO_ORIGIN: "找不到网上的仓库。",
    NETWORK: "现在连不上网上的仓库，没有创建文件。",
    DIVERGED: "网上已有更新，没法自动接上。没有创建文件。",
    CONFLICT: "网上的更新和本地还没发布的文件撞车了。没有覆盖你的文件，也没有创建文件。",
  },
  publish: {
    NOT_ON_MAIN: "创建和发布只能在主线上进行。",
    NO_ORIGIN: "找不到网上的仓库。",
    NETWORK: "现在连不上网上的仓库，没有改动。",
    DIVERGED: "网上已有更新，没法自动接上。文件都还在，没有发布。",
    CONFLICT: "网上的更新和本地还没发布的文件撞车了。没有覆盖你的文件，也没有发布。",
    NO_CHANGES: "没有新内容可发布。",
    TEST_FAILED: "检查没通过，没有发布。",
    PUSH_FAILED: "没能发到网上。内容还在本地，可以改完再发布。",
  },
};

export function userMessage(purpose, code) {
  return messages[purpose][code];
}

export async function git(cwd, args) {
  return execFileAsync("git", args, { cwd, encoding: "utf8" });
}

export async function alignMain(cwd, purpose) {
  try {
    await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  } catch (error) {
    throw new Error(userMessage(purpose, ERROR_CODE.NO_ORIGIN), { cause: error });
  }

  const branch = (await git(cwd, ["branch", "--show-current"])).stdout.trim();
  if (branch !== "main") throw new Error(userMessage(purpose, ERROR_CODE.NOT_ON_MAIN));

  try {
    await git(cwd, ["remote", "get-url", "origin"]);
  } catch (error) {
    throw new Error(userMessage(purpose, ERROR_CODE.NO_ORIGIN), { cause: error });
  }

  try {
    await git(cwd, ["fetch", "-q", "origin"]);
  } catch (error) {
    throw new Error(userMessage(purpose, ERROR_CODE.NETWORK), { cause: error });
  }

  const head = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();
  let remote;
  try {
    remote = (await git(cwd, ["rev-parse", "origin/main"])).stdout.trim();
  } catch (error) {
    throw new Error(userMessage(purpose, ERROR_CODE.DIVERGED), { cause: error });
  }

  if (head === remote) return { status: "same", head };

  try {
    await git(cwd, ["merge", "--ff-only", "origin/main"]);
  } catch (error) {
    const code = (await workingTreeChanges(cwd)) ? ERROR_CODE.CONFLICT : ERROR_CODE.DIVERGED;
    throw new Error(userMessage(purpose, code), { cause: error });
  }

  const alignedHead = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();
  return alignedHead === head
    ? { status: "ahead", head }
    : { status: "fast-forwarded", head: alignedHead };
}

export async function workingTreeChanges(cwd) {
  return (await git(cwd, ["status", "--porcelain", "--untracked-files=all"])).stdout;
}

export async function commitAll(cwd, message) {
  const before = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();
  await git(cwd, ["add", "-A"]);
  await git(cwd, ["commit", "-m", message]);
  const after = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();
  return { before, after };
}

export async function pushMain(cwd) {
  await git(cwd, ["push", "origin", "main:main"]);
}

export async function undoCommitIf(cwd, before, after) {
  const head = (await git(cwd, ["rev-parse", "HEAD"])).stdout.trim();
  if (head !== after) return false;
  const parent = (await git(cwd, ["rev-parse", `${after}^`])).stdout.trim();
  if (parent !== before) return false;
  await git(cwd, ["reset", "--soft", before]);
  return true;
}
