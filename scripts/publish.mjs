import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runNpm(args, failureMessage) {
  try {
    const result = await execFileAsync(process.execPath, [process.env.npm_execpath, ...args], {
      maxBuffer: 10 * 1024 * 1024,
    });
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    process.stderr.write(error.stderr ?? "");
    throw new Error(failureMessage, { cause: error });
  }
}

const args = process.argv.slice(2);
if (args.length !== 1 || !args[0].trim()) {
  throw new Error('用法：npm run publish -- "<commit message>"');
}

const branch = (await execFileAsync("git", ["branch", "--show-current"])).stdout.trim();
if (branch !== "main") throw new Error(`站点发布只允许在 main 分支运行；当前分支：${branch}`);

try {
  await execFileAsync("git", ["remote", "get-url", "origin"]);
} catch (error) {
  throw new Error("找不到目标 remote：origin", { cause: error });
}

const changes = (await execFileAsync("git", ["status", "--porcelain", "--untracked-files=all"]))
  .stdout;
if (!changes) throw new Error("没有可提交的改动");

await runNpm(["test"], "完整校验失败；未创建发布提交");
await runNpm(["run", "build"], "生产构建失败；未创建发布提交");

await execFileAsync("git", ["add", "-A"]);
await execFileAsync("git", ["commit", "-m", args[0]]);
try {
  await execFileAsync("git", ["push", "origin", "main:main"]);
} catch (error) {
  process.stderr.write(error.stderr ?? "");
  throw new Error("推送到 origin/main 失败；本地发布提交已保留，请手动同步远程并处理冲突后再推送", {
    cause: error,
  });
}
console.log("已推送站点发布到 origin/main");
