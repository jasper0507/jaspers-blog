import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function run(command, args, options) {
  try {
    const { stdout, stderr } = await exec(command, args, {
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
