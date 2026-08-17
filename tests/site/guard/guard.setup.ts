import assert from "node:assert/strict";
import type { ExecFileException } from "node:child_process";
import { test } from "@playwright/test";
import { build, draftTagCollisionEnvironment, tagCollisionEnvironment } from "../helpers.ts";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

for (const [name, environment] of [
  ["不同标签生成相同网址时应使构建失败", tagCollisionEnvironment],
  ["草稿中的不同标签生成相同网址时也应使构建失败", draftTagCollisionEnvironment],
] as const) {
  test(name, async () => {
    let error: ExecFileException | undefined;
    try {
      await build(environment);
    } catch (caught) {
      error = caught as ExecFileException;
    }
    assert.ok(error, "标签网址冲突应使构建失败");
    assert.match(`${error.stdout ?? ""}${error.stderr ?? ""}`, /生成了相同的网址/);
  });
}
