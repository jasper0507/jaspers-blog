import { execFile } from "node:child_process";
import { relative } from "node:path";
import { promisify } from "node:util";
import { contentPaths } from "./content-paths.js";

const execFileAsync = promisify(execFile);
const DEFAULT_MESSAGE = "更新博客内容";
const NOTHING_TO_PUBLISH = "没有新的写作要提交";

function writingPaths(directory) {
  const { root, ...paths } = contentPaths(directory);
  return Object.values(paths).map(path => relative(root, path));
}

/** @returns {Promise<string[] | null>} 相对上游的未推送写作文件；无法判断上游时返回 null */
async function unpushedWritingFiles(git, paths) {
  for (const rev of ["@{upstream}", "origin/main"]) {
    try {
      const { stdout } = await git(["diff", "--name-only", `${rev}..HEAD`, "--", ...paths]);
      return stdout.trim() ? stdout.trim().split("\n") : [];
    } catch {
      continue;
    }
  }
  return null;
}

function pushWasUpToDate(result) {
  return /up-to-date/i.test(`${result.stdout}\n${result.stderr}`);
}

async function run(command, args, options) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      encoding: "utf8",
      ...options,
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (error) {
    throw new Error(`${error.stdout ?? ""}${error.stderr ?? error.message}`.trim(), {
      cause: error,
    });
  }
}

function describePushError(error) {
  const text = error instanceof Error ? error.message : String(error);
  if (/non-fast-forward|fetch first|remote contains work that you do/i.test(text)) {
    return "远端内容超前，无法推送";
  }
  return `推送失败：${text}`;
}

/** @param {string} directory @param {string[]} args */
export async function publishContent(directory, args) {
  if (args.length > 1) {
    throw new Error('用法：jasper-content publish 或 jasper-content publish "说明"');
  }
  const message = args[0]?.trim() || DEFAULT_MESSAGE;
  const paths = writingPaths(directory);
  const git = (gitArgs, extra = {}) =>
    run("git", gitArgs, {
      cwd: directory,
      ...extra,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        ...(extra.env ?? {}),
      },
    });
  const status = (await git(["status", "--short", "--", ...paths])).stdout.trim();
  if (status) {
    console.log("待提交：");
    console.log(status);
    await git(["add", "-A", "--", ...paths]);
    await git(["commit", "--only", "-m", message, "--", ...paths]);
  }
  const sha = (await git(["rev-parse", "HEAD"])).stdout.trim();
  const unpushedFiles = await unpushedWritingFiles(git, paths);
  if (unpushedFiles !== null && unpushedFiles.length === 0) {
    console.log(NOTHING_TO_PUBLISH);
    return;
  }
  if (!status && unpushedFiles?.length) {
    console.log("待推送：");
    console.log(unpushedFiles.join("\n"));
  }
  try {
    const result = await git(["push", "-u", "origin", "HEAD"], { env: { LC_ALL: "C" } });
    if (pushWasUpToDate(result)) {
      console.log(NOTHING_TO_PUBLISH);
      return;
    }
  } catch (error) {
    console.log(describePushError(error));
    process.exitCode = 1;
    return;
  }
  console.log(`已推送 ${sha}`);
}
