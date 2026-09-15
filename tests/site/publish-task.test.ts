import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatPublishResult,
  initialPublishResult,
  matchPublishRun,
  parsePublishResult,
  pinnedContentWarning,
  publishStageLines,
} from "../../packages/content-tools/publish-task.js";

test("收据不是对象时解析失败", () => {
  assert.throws(() => parsePublishResult("[]"), /发布结果无效/);
  assert.throws(() => parsePublishResult("null"), /发布结果无效/);
  assert.throws(() => parsePublishResult("{"), /JSON/);
});

test("收据格式化后再解析，保留内容提交、源码提交、阶段、状态、地址和错误", () => {
  const source = formatPublishResult({
    contentSha: "aa".repeat(20),
    sourceSha: "bb".repeat(20),
    stage: "build",
    status: "failure",
    error: "号码计数器无效",
  });
  assert.equal(source.endsWith("\n"), true);
  assert.deepEqual(parsePublishResult(source), {
    contentSha: "aa".repeat(20),
    sourceSha: "bb".repeat(20),
    stage: "build",
    status: "failure",
    error: "号码计数器无效",
  });
});

test("收据往返保留未识别字段", () => {
  const parsed = parsePublishResult(
    formatPublishResult({
      contentSha: "cc".repeat(20),
      sourceSha: "dd".repeat(20),
      stage: "deploy",
      status: "success",
      url: "https://jasper0507.me",
      extra: "keep",
    }),
  );
  assert.equal(parsed.extra, "keep");
  assert.equal(parsed.url, "https://jasper0507.me");
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

test("成功时校验、构建、部署都通过", () => {
  assert.deepEqual(publishStageLines({ stage: "deploy", status: "success" }), [
    "校验：通过",
    "构建：通过",
    "部署：通过",
  ]);
});

test("校验失败时只报告校验失败", () => {
  assert.deepEqual(publishStageLines({ stage: "validate", status: "failure" }), ["校验：失败"]);
});

test("构建失败时前面的校验通过", () => {
  assert.deepEqual(publishStageLines({ stage: "build", status: "failure" }), [
    "校验：通过",
    "构建：失败",
  ]);
});

test("因更新任务跳过部署时报告跳过", () => {
  assert.deepEqual(publishStageLines({ stage: "deploy", status: "skipped" }), [
    "校验：通过",
    "构建：通过",
    "部署：跳过",
  ]);
});

const pushRun = {
  event: "push",
  headSha: "11".repeat(20),
  displayTitle: `发布 ${"11".repeat(20)}`,
  status: "completed",
};
const retryRun = {
  event: "workflow_dispatch",
  headSha: "11".repeat(20),
  displayTitle: "发布 0f0f0f0f-aaaa-bbbb-cccc-ddddeeeeffff",
  status: "completed",
};

test("有推送时认领同一笔头提交触发的发布任务", () => {
  assert.equal(matchPublishRun([retryRun, pushRun], { pushedSha: "11".repeat(20) }), pushRun);
});

test("无推送时用请求编号认领发布任务", () => {
  assert.equal(
    matchPublishRun([pushRun, retryRun], { requestId: "0f0f0f0f-aaaa-bbbb-cccc-ddddeeeeffff" }),
    retryRun,
  );
});

test("请求编号认领不会选中同头提交、由推送触发的发布任务", () => {
  assert.equal(
    matchPublishRun([pushRun], { requestId: "0f0f0f0f-aaaa-bbbb-cccc-ddddeeeeffff" }),
    undefined,
  );
});

test("推送认领不会选中同头提交、由重试触发的发布任务", () => {
  assert.equal(matchPublishRun([retryRun], { pushedSha: "11".repeat(20) }), undefined);
});

test("两次重试按请求编号区分，不以头提交当主键", () => {
  const older = { ...retryRun, displayTitle: "发布 aaaa-1111" };
  const newer = { ...retryRun, displayTitle: "发布 bbbb-2222" };
  assert.equal(matchPublishRun([older, newer], { requestId: "bbbb-2222" }), newer);
  assert.equal(matchPublishRun([older, newer], { requestId: "aaaa-1111" }), older);
});

test("刚保存的内容提交与收据一致时不警告", () => {
  assert.equal(pinnedContentWarning("aa".repeat(20), { contentSha: "aa".repeat(20) }), undefined);
});

test("刚保存的内容提交与收据不同时警告", () => {
  const saved = "aa".repeat(20);
  const pinned = "cc".repeat(20);
  assert.equal(
    pinnedContentWarning(saved, { contentSha: pinned }),
    `刚保存的内容提交 ${saved} 与本次发布任务钉住的内容提交 ${pinned} 不同`,
  );
});

test("收据没有内容提交时不对齐也不警告", () => {
  assert.equal(pinnedContentWarning("aa".repeat(20), { status: "failure" }), undefined);
});
