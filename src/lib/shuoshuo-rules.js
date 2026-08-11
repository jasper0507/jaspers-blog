export const SHUOSHUO_CONTENT_DIRECTORY = "src/content/shuoshuo";
export const SHUOSHUO_TIME_ZONE = "Asia/Shanghai";

const shanghaiDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHUOSHUO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const publishedAtPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
const stableIdPattern = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/;
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const publishedAtLinePattern = /^publishedAt:\s*(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/m;

function getShanghaiDateTime(date) {
  const parts = Object.fromEntries(
    shanghaiDateTimeFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return {
    id: `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`,
    publishedAt: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`,
  };
}

export function createShuoshuoDraft() {
  const { id, publishedAt } = getShanghaiDateTime(new Date());
  const source = `---
publishedAt: "${publishedAt}"
draft: false
---
`;

  return { id, publishedAt, source };
}

export function isShuoshuoPublishedAt(value) {
  if (typeof value !== "string" || !publishedAtPattern.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && getShanghaiDateTime(date).publishedAt === value;
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
