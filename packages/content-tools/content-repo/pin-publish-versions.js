import { execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);

async function mainSha(repo) {
  const { stdout } = await exec("gh", ["api", `repos/${repo}/commits/main`, "--jq", ".sha"], {
    encoding: "utf8",
    env: process.env,
  });
  const sha = stdout.trim();
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`${repo} 的 main 提交无效`);
  return sha;
}

const contentRepo = process.env.GITHUB_REPOSITORY?.trim();
const sourceRepo = process.env.SOURCE_REPO?.trim();
if (!contentRepo) throw new Error("需要 GITHUB_REPOSITORY");
if (!sourceRepo) throw new Error("需要 SOURCE_REPO");

const contentSha = await mainSha(contentRepo);
const sourceSha = await mainSha(sourceRepo);
const lines = `content_sha=${contentSha}\nsource_sha=${sourceSha}\n`;
process.stdout.write(lines);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lines);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, lines);
