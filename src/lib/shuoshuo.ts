import { getCollection } from "astro:content";
import { isPublished } from "./content";

const stableIdPattern = /^\d{8}-\d{6}$/;
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeStyle: "short",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

export async function getPublishedShuoshuo() {
  const entries = await getCollection("shuoshuo");

  for (const entry of entries) {
    if (!stableIdPattern.test(entry.id)) {
      throw new Error(`说说 ${entry.id} 的文件名必须是 YYYYMMDD-HHmmss`);
    }
    if (!entry.body?.trim()) throw new Error(`说说 ${entry.id} 的正文不能为空`);
  }

  return entries
    .filter(isPublished)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
    );
}

export function formatShuoshuoDate(date: Date) {
  return dateTimeFormatter.format(date);
}

export function getShuoshuoLabel(date: Date) {
  return `说说 · ${formatShuoshuoDate(date)}`;
}
