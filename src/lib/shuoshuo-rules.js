import { formatShanghaiDateTime, isShanghaiDateTime, SHANGHAI_TIME_ZONE } from "./shanghai-time.js";

export const SHUOSHUO_CONTENT_DIRECTORY = "src/content/shuoshuo";
export { SHANGHAI_TIME_ZONE as SHUOSHUO_TIME_ZONE };

const stableIdPattern = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/;
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const publishedAtLinePattern = /^publishedAt:\s*(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/m;

export function createShuoshuoDraft() {
  const publishedAt = formatShanghaiDateTime(new Date());
  const id = publishedAt.replace(/[-:]/g, "").replace("T", "-").replace("+0800", "");
  const source = `---
publishedAt: "${publishedAt}"
draft: false
---
`;

  return { id, publishedAt, source };
}

export function isShuoshuoPublishedAt(value) {
  return isShanghaiDateTime(value);
}

export function hasValidShuoshuoPublishedAtSource(source) {
  const frontmatter = frontmatterPattern.exec(source)?.[1];
  const match = frontmatter && publishedAtLinePattern.exec(frontmatter);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return isShuoshuoPublishedAt(value);
}

export function isShuoshuoStableId(value) {
  const parts = stableIdPattern.exec(value);
  if (!parts) return false;
  const [, year, month, day, hour, minute, second] = parts;
  return isShuoshuoPublishedAt(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
}
