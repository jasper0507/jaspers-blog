import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const exec = promisify(execFile);
const token = process.env.CONTENT_DISPATCH_TOKEN?.trim();
const repo = process.env.CONTENT_REPO?.trim();

if (!token || !repo) {
  console.error("缺少跨仓发布配置：需要 CONTENT_DISPATCH_TOKEN 和 CONTENT_REPO");
  process.exit(1);
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
