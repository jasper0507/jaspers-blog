import assert from "node:assert/strict";
import type { ExecFileException } from "node:child_process";
import { test } from "@playwright/test";
import { build, productionEnvironment, tagCollisionEnvironment } from "../helpers.ts";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test("重复 tag 生成相同网址时应使构建失败", async () => {
  let error: ExecFileException | undefined;
  try {
    await build(tagCollisionEnvironment);
  } catch (caught) {
    error = caught as ExecFileException;
  }
  assert.ok(error, "无效技术文章应使构建失败");
  assert.match(`${error.stdout ?? ""}${error.stderr ?? ""}`, /生成了相同的网址/);
});

test("生产内容构建成功", async () => {
  await build(productionEnvironment);
});
