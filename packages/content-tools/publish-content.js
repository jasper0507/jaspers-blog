import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { contentPaths } from "./content-paths.js";

const execFileAsync = promisify(execFile);
const DEFAULT_MESSAGE = "更新博客内容";
const WORKFLOW = "publish.yml";
const STAGES = [
  ["validate", "校验"],
  ["build", "构建"],
  ["deploy", "部署"],
];

function pollMs() {
  const value = Number(process.env.JASPER_PUBLISH_POLL_MS ?? 2000);
  return Number.isFinite(value) && value > 0 ? value : 2000;
}

function timeoutMs() {
  const value = Number(process.env.JASPER_PUBLISH_TIMEOUT_MS ?? 30 * 60 * 1000);
  return Number.isFinite(value) && value > 0 ? value : 30 * 60 * 1000;
}

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

function repoFromRemote(url) {
  const match = url.trim().match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (!match) throw new Error("无法从 origin 识别 GitHub 仓库");
  return `${match[1]}/${match[2]}`;
}

function unfinished() {
  console.log("内容已保存但未上线");
  process.exitCode = 1;
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
  const gh = ghArgs => run("gh", ghArgs, { cwd: directory, env: process.env });
  const fetchUrl = (await git(["remote", "get-url", "origin"])).stdout.trim();
  const repo = repoFromRemote(fetchUrl);
  const status = (await git(["status", "--short", "--", ...paths])).stdout.trim();
  if (status) {
    console.log("待提交：");
    console.log(status);
    await git(["add", "-A", "--", ...paths]);
    await git(["commit", "--only", "-m", message, "--", ...paths]);
  }
  const sha = (await git(["rev-parse", "HEAD"])).stdout.trim();
  const unpushedFiles = await unpushedWritingFiles(git, paths);
  let pushed = false;

  if (unpushedFiles === null || unpushedFiles.length > 0) {
    if (!status && unpushedFiles?.length) {
      console.log("待推送：");
      console.log(unpushedFiles.join("\n"));
    }
    try {
      const result = await git(["push", "-u", "origin", "HEAD"], { env: { LC_ALL: "C" } });
      pushed = !pushWasUpToDate(result);
    } catch (error) {
      console.log(describePushError(error));
      unfinished();
      return;
    }
  }
  if (pushed) console.log(`已推送 ${sha}`);
  else console.log("没有写作内容改动，重新触发发布");

  let runInfo;
  try {
    if (pushed) {
      runInfo = await waitForRun(gh, repo, item => item.event === "push" && item.headSha === sha, [
        "--commit",
        sha,
      ]);
    } else {
      const requestId = randomUUID();
      await gh(["workflow", "run", WORKFLOW, "-R", repo, "--field", `request_id=${requestId}`]);
      runInfo = await waitForRun(
        gh,
        repo,
        item => item.event === "workflow_dispatch" && item.displayTitle.includes(requestId),
      );
    }
  } catch {
    console.log("无法确认远端结果");
    unfinished();
    return;
  }

  console.log(`发布任务 ${runInfo.databaseId}`);
  let result;
  try {
    result = await downloadResult(gh, repo, runInfo.databaseId);
  } catch {
    console.log("无法确认远端结果");
    unfinished();
    return;
  }
  reportStages(result);
  if (result.contentSha) console.log(`内容提交 ${result.contentSha}`);
  if (result.sourceSha) console.log(`源码提交 ${result.sourceSha}`);
  if (result.status === "success" && result.url) {
    console.log(`已上线 ${result.url}`);
    return;
  }
  if (result.error) console.log(result.error);
  unfinished();
}

function reportStages(result) {
  if (result.status === "success") {
    for (const [, label] of STAGES) console.log(`${label}：通过`);
    return;
  }
  const stoppedAt = STAGES.findIndex(([id]) => id === result.stage);
  for (let index = 0; index < STAGES.length; index += 1) {
    const [, label] = STAGES[index];
    if (index < stoppedAt) console.log(`${label}：通过`);
    else if (index === stoppedAt) {
      console.log(`${label}：${result.status === "skipped" ? "跳过" : "失败"}`);
      break;
    }
  }
}

async function listRuns(gh, repo, extra = []) {
  const { stdout } = await gh([
    "run",
    "list",
    "-R",
    repo,
    "--workflow",
    WORKFLOW,
    "--json",
    "databaseId,displayTitle,event,headSha,status",
    ...extra,
  ]);
  return JSON.parse(stdout);
}

async function waitForRun(gh, repo, match, extra = []) {
  const deadline = Date.now() + timeoutMs();
  while (Date.now() < deadline) {
    const runs = await listRuns(gh, repo, extra);
    const found = runs.find(match);
    if (found?.status === "completed") return found;
    await delay(pollMs());
  }
  throw new Error("无法确认远端结果");
}

async function downloadResult(gh, repo, runId) {
  const directory = await mkdtemp(join(tmpdir(), "publish-result-"));
  try {
    await gh([
      "run",
      "download",
      String(runId),
      "-R",
      repo,
      "-n",
      "publish-result",
      "-D",
      directory,
    ]);
    return JSON.parse(await readFile(join(directory, "publish-result.json"), "utf8"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
