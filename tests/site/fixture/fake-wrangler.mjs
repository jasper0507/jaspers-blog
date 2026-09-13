#!/usr/bin/env node
import { appendFileSync } from "node:fs";

const logPath = process.env.FAKE_WRANGLER_LOG;
if (!logPath) {
  console.error("FAKE_WRANGLER_LOG 未设置");
  process.exit(1);
}

const token = process.env.CLOUDFLARE_API_TOKEN ?? "";
appendFileSync(
  logPath,
  `${JSON.stringify({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    project: process.argv.includes("--project-name")
      ? process.argv[process.argv.indexOf("--project-name") + 1]
      : undefined,
    tokenSet: Boolean(token),
  })}\n`,
);

if (process.env.FAKE_WRANGLER_FAIL) {
  console.error("模拟 Wrangler 上传失败");
  process.exit(1);
}

console.log("Uploaded");
