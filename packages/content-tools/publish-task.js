/** 发布任务：一次将当时内容与实现送上公开网站的尝试；本 module 拥有收据与认领。 */

export const PUBLISH_WORKFLOW = "publish.yml";
export const PUBLISH_RESULT_ARTIFACT = "publish-result";
export const PUBLISH_REQUEST_ID_FIELD = "request_id";

const STAGES = [
  ["validate", "校验"],
  ["build", "构建"],
  ["deploy", "部署"],
];

export function formatPublishResult(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function parsePublishResult(source) {
  const data = JSON.parse(source);
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("发布结果无效");
  }
  return data;
}

export function initialPublishResult({ contentSha, sourceSha }) {
  return {
    contentSha,
    sourceSha,
    stage: "validate",
    status: "failure",
  };
}

export function publishStageLines(result) {
  if (result.status === "success") {
    return STAGES.map(([, label]) => `${label}：通过`);
  }
  const stoppedAt = STAGES.findIndex(([id]) => id === result.stage);
  const lines = [];
  for (let index = 0; index < STAGES.length; index += 1) {
    const [, label] = STAGES[index];
    if (index < stoppedAt) lines.push(`${label}：通过`);
    else if (index === stoppedAt) {
      lines.push(`${label}：${result.status === "skipped" ? "跳过" : "失败"}`);
      break;
    }
  }
  return lines;
}

export function matchPublishRun(runs, claim) {
  if (claim?.pushedSha) {
    return runs.find(item => item.event === "push" && item.headSha === claim.pushedSha);
  }
  if (claim?.requestId) {
    return runs.find(
      item =>
        item.event === "workflow_dispatch" &&
        String(item.displayTitle ?? "").includes(claim.requestId),
    );
  }
}

export function pinnedContentWarning(savedContentSha, result) {
  const pinned = result?.contentSha;
  if (!savedContentSha || !pinned || savedContentSha === pinned) return;
  return `刚保存的内容提交 ${savedContentSha} 与本次发布任务钉住的内容提交 ${pinned} 不同`;
}
