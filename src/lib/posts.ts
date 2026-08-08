import { getCollection } from "astro:content";
import { isPublished } from "./content";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeZone: "Asia/Shanghai",
});
const yearFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  timeZone: "Asia/Shanghai",
});

export async function getPublishedPosts() {
  const posts = await getCollection("posts");

  for (const post of posts) {
    if (!post.body?.trim()) throw new Error(`技术文章 ${post.id} 的正文不能为空`);
  }

  return posts
    .filter(isPublished)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
        left.id.localeCompare(right.id),
    );
}

export function formatPostDate(date: Date) {
  return dateFormatter.format(date);
}

/** 紧凑日期 YYYY.MM.DD（Asia/Shanghai）：首页信息流、单篇元信息等 */
export function formatPostDateCompact(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}.${value("month")}.${value("day")}`;
}

/** 归档时间轴：YYYY-MM-DD（Asia/Shanghai） */
export function formatPostDateIso(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getPostYear(date: Date) {
  return yearFormatter.format(date);
}
