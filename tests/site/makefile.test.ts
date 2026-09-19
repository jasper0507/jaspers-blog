import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const contentRepo = fileURLToPath(
  new URL("../../packages/content-tools/content-repo", import.meta.url),
);

async function expectFailure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as { stdout?: string; stderr?: string; code?: number };
  }
  throw new Error("应当失败");
}

test("内容仓 make 只打印四条可复制命令", async () => {
  const { stdout } = await exec("make", ["-s"], { cwd: contentRepo, encoding: "utf8" });
  assert.equal(stdout, 'make init\nmake post t="标题"\nmake shuoshuo\nmake publish m="说明"\n');
});

test("内容仓 make post 缺标题时打印 Make 用法", async () => {
  const error = await expectFailure(
    exec("make", ["-s", "post"], { cwd: contentRepo, encoding: "utf8" }),
  );
  assert.match(`${error.stdout ?? ""}\n${error.stderr ?? ""}`, /make post t="标题"/);
});

test("源码仓 make 只打印日用命令行", async () => {
  const { stdout } = await exec("make", ["-s"], { cwd: root, encoding: "utf8" });
  assert.equal(
    stdout,
    "make init\nmake dev\nmake build\nmake preview\nmake check\nmake test\nmake test-smoke\nmake fonts-fetch\n",
  );
});
