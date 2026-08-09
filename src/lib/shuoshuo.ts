import { getCollection, render } from "astro:content";
import { isPublished } from "./content";
import { SHUOSHUO_TIME_ZONE } from "./shuoshuo-rules.js";

// ponytail: cover inline/reference Markdown images; use an AST if nested URLs or raw HTML images become authoring needs.
const markdownImagePattern = /!\[[^\]]*\](?:\((?:\\.|[^)])*\)|\[[^\]]*\])?/g;
const markdownReferenceDefinitionPattern = /^\[[^\]]+\]:\s*\S+/;
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeStyle: "short",
  hour12: false,
  timeZone: SHUOSHUO_TIME_ZONE,
});
const compactDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHUOSHUO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export async function getPublishedShuoshuo() {
  const entries = await getCollection("shuoshuo");

  for (const entry of entries) {
    if (!entry.body?.trim()) throw new Error(`说说 ${entry.id} 的正文不能为空`);
  }

  return entries
    .filter(isPublished)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
        right.id.localeCompare(left.id),
    )
    .map(entry => {
      const publishedAt = entry.data.publishedAt;
      const long = dateTimeFormatter.format(publishedAt);
      const label = `说说 · ${long}`;
      return {
        id: entry.id,
        href: `/shuoshuo/#${entry.id}`,
        label,
        permalinkLabel: `${label}的永久链接`,
        summary: getShuoshuoSummary(entry.body!),
        publishedAt: {
          value: publishedAt,
          iso: publishedAt.toISOString(),
          compact: compactDateFormatter.format(publishedAt).replaceAll("-", "."),
          long,
        },
        render: async () => {
          const { Content } = await render(entry);
          return { Content };
        },
      };
    });
}

function getShuoshuoSummary(body: string) {
  const imageCount = body.match(markdownImagePattern)?.length ?? 0;
  const line = body
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map(raw => {
      const text = raw.trim();
      if (markdownReferenceDefinitionPattern.test(text)) return "";
      return text
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(markdownImagePattern, "")
        .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1");
    })
    .find(text => text.length > 0);
  return line ?? `${imageCount} Image${imageCount === 1 ? "" : "s"}`;
}
