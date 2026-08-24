import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  ERROR_CODE,
  alignMain,
  commitAll,
  pushMain,
  undoCommitIf,
  userMessage,
  workingTreeChanges,
} from "./lib/repo-sync.mjs";

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

const cwd = process.cwd();
const aligned = await alignMain(cwd, "publish");
if (aligned.status === "fast-forwarded") console.log("已与网上对齐");

if (!(await workingTreeChanges(cwd))) {
  throw new Error(userMessage("publish", ERROR_CODE.NO_CHANGES));
}

await runNpm(["test"], userMessage("publish", ERROR_CODE.TEST_FAILED));

const { before, after } = await commitAll(cwd, args[0]);
try {
  await pushMain(cwd);
} catch (error) {
  process.stderr.write(error.stderr ?? "");
  await undoCommitIf(cwd, before, after);
  throw new Error(userMessage("publish", ERROR_CODE.PUSH_FAILED), { cause: error });
}
console.log("已发布到网上");
