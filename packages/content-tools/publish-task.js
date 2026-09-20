/** 发布任务：一次将当时内容与实现送上公开网站的尝试；本 module 提供工作流常量与收据写入格式。 */

export const PUBLISH_WORKFLOW = "publish.yml";
export const PUBLISH_RESULT_ARTIFACT = "publish-result";
export const PUBLISH_REQUEST_ID_FIELD = "request_id";

export function formatPublishResult(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function initialPublishResult({ contentSha, sourceSha }) {
  return {
    contentSha,
    sourceSha,
    stage: "validate",
    status: "failure",
  };
}
