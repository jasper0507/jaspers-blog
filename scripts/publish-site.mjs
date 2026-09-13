import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { indexPublishedPosts } from "./lib/index-published-posts.mjs";

const execFileAsync = promisify(execFile);
const sourceDir = fileURLToPath(new URL("..", import.meta.url));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少 ${name}`);
  return value;
}

async function run(command, args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (error) {
    throw new Error(`${error.stdout ?? ""}${error.stderr ?? error.message}`.trim(), {
      cause: error,
    });
  }
}

async function writeResult(path, result) {
  await writeFile(path, `${JSON.stringify(result, null, 2)}\n`);
}

async function newerRunExists(runId, repo, workflow) {
  if (!runId || !repo) return false;
  const { stdout } = await run(
    "gh",
    ["run", "list", "-R", repo, "--workflow", workflow, "--json", "databaseId"],
    { env: process.env },
  );
  const runs = JSON.parse(stdout);
  return runs.some(item => Number(item.databaseId) > Number(runId));
}

async function validateAndBuild(result, resultPath, dist) {
  const contentDir = resolve(required("BLOG_CONTENT_DIR"));
  const env = { ...process.env, BLOG_CONTENT_DIR: contentDir };
  await writeResult(resultPath, result);
  try {
    await run(process.execPath, [join(sourceDir, "scripts/check-site-markdown.mjs")], {
      cwd: sourceDir,
      env,
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    await writeResult(resultPath, result);
    throw error;
  }

  result.stage = "build";
  await writeResult(resultPath, result);
  try {
    await run(
      process.execPath,
      [join(sourceDir, "node_modules/astro/bin/astro.mjs"), "build", "--force"],
      { cwd: sourceDir, env },
    );
    await indexPublishedPosts(sourceDir, dist);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    await writeResult(resultPath, result);
    throw error;
  }
}

async function deploy(result, resultPath, dist) {
  const siteUrl = required("PUBLISH_SITE_URL");
  const project = required("PAGES_PROJECT");
  const wrangler = process.env.PUBLISH_WRANGLER?.trim() || "wrangler";
  const workflow = process.env.PUBLISH_WORKFLOW?.trim() || "publish.yml";
  const runId = process.env.GITHUB_RUN_ID?.trim();
  const repo = process.env.GITHUB_REPOSITORY?.trim();
  result.stage = "deploy";
  await writeResult(resultPath, result);
  if (await newerRunExists(runId, repo, workflow)) {
    result.status = "skipped";
    result.error = "已有更新的发布任务，跳过上传以免覆盖";
    await writeResult(resultPath, result);
    console.log(result.error);
    return result;
  }

  try {
    await run(
      wrangler,
      [
        "pages",
        "deploy",
        dist,
        "--project-name",
        project,
        "--branch",
        "main",
        "--commit-hash",
        result.contentSha,
        "--commit-message",
        `content:${result.contentSha} source:${result.sourceSha}`,
      ],
      { cwd: sourceDir, env: process.env },
    );
  } catch (error) {
    result.status = "failure";
    result.error = error instanceof Error ? error.message : String(error);
    await writeResult(resultPath, result);
    throw error;
  }

  result.status = "success";
  result.url = siteUrl;
  delete result.error;
  await writeResult(resultPath, result);
  console.log(`已上传 ${siteUrl}`);
  console.log(`内容提交 ${result.contentSha}`);
  console.log(`源码提交 ${result.sourceSha}`);
  return result;
}

export async function publishSite(phase = "all") {
  if (!["all", "build", "deploy"].includes(phase)) {
    throw new Error("用法：publish-site.mjs [build|deploy]");
  }
  const contentSha = required("PUBLISH_CONTENT_SHA");
  const sourceSha = required("PUBLISH_SOURCE_SHA");
  const resultPath =
    process.env.PUBLISH_RESULT_PATH?.trim() || join(sourceDir, "publish-result.json");
  const dist = process.env.JASPER_ACCEPTANCE_DIST?.trim() || join(sourceDir, "dist");
  const result = {
    contentSha,
    sourceSha,
    stage: "validate",
    status: "failure",
  };

  if (phase !== "deploy") await validateAndBuild(result, resultPath, dist);
  if (phase === "build") {
    result.status = "success";
    delete result.error;
    await writeResult(resultPath, result);
    return result;
  }
  return deploy(result, resultPath, dist);
}

if (import.meta.main) {
  publishSite(process.argv[2] ?? "all").catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
