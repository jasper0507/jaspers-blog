import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatPublishResult,
  initialPublishResult,
} from "../../packages/content-tools/publish-task.js";

test("收据格式化后再解析，保留内容提交、源码提交、阶段、状态、地址和错误", () => {
  const source = formatPublishResult({
    contentSha: "aa".repeat(20),
    sourceSha: "bb".repeat(20),
    stage: "build",
    status: "failure",
    error: "号码计数器无效",
  });
  assert.equal(source.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(source), {
    contentSha: "aa".repeat(20),
    sourceSha: "bb".repeat(20),
    stage: "build",
    status: "failure",
    error: "号码计数器无效",
  });
});

test("新发布任务从校验失败开始，并钉住两笔提交", () => {
  assert.deepEqual(
    initialPublishResult({ contentSha: "aa".repeat(20), sourceSha: "bb".repeat(20) }),
    {
      contentSha: "aa".repeat(20),
      sourceSha: "bb".repeat(20),
      stage: "validate",
      status: "failure",
    },
  );
});
