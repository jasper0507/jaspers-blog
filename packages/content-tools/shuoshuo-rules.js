import { formatShanghaiDateTime, isShanghaiDateTime } from "./shanghai-time.js";

const stableIdPattern = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/;

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

export function isShuoshuoStableId(value) {
  const parts = stableIdPattern.exec(value);
  if (!parts) return false;
  const [, year, month, day, hour, minute, second] = parts;
  return isShanghaiDateTime(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`);
}
