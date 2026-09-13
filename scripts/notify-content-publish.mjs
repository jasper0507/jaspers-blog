import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const exec = promisify(execFile);
const token = process.env.CONTENT_DISPATCH_TOKEN?.trim();
const repo = process.env.CONTENT_REPO?.trim();

if (!token || !repo) {
  console.log("未配置 CONTENT_DISPATCH_TOKEN 或 CONTENT_REPO，跳过跨仓通知（尚未启用正式触发）");
  process.exit(0);
}

const requestId = randomUUID();
await exec(
  "gh",
  [
    "api",
    `repos/${repo}/dispatches`,
    "-f",
    "event_type=source-updated",
    "-f",
    `client_payload[request_id]=${requestId}`,
  ],
  {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: token },
  },
);
console.log(`已通知 ${repo} 发布 ${requestId}`);
