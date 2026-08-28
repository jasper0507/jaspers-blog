import assert from "node:assert/strict";
import type { ExecFileException } from "node:child_process";
import { test } from "@playwright/test";
import {
  build,
  draftTagCollisionEnvironment,
  invalidMathEnvironment,
  tagCollisionEnvironment,
} from "../helpers.ts";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test("公开与草稿标签生成相同网址时都使构建失败", async () => {
  for (const environment of [tagCollisionEnvironment, draftTagCollisionEnvironment]) {
    let error: ExecFileException | undefined;
    try {
      await build(environment);
    } catch (caught) {
      error = caught as ExecFileException;
    }
    assert.ok(error, "标签网址冲突应使构建失败");
    assert.match(`${error.stdout ?? ""}${error.stderr ?? ""}`, /生成了相同的网址/);
  }
});

test("非法公式使构建失败", async () => {
  let error: ExecFileException | undefined;
  try {
    await build(invalidMathEnvironment);
  } catch (caught) {
    error = caught as ExecFileException;
  }
  assert.ok(error, "非法公式应使构建失败");
  assert.match(`${error.stdout ?? ""}${error.stderr ?? ""}`, /KaTeX parse error/);
});
