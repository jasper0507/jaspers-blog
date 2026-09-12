import { getCollection, render } from "astro:content";
import { SHANGHAI_TIME_ZONE } from "./shanghai-time.js";
import { extractMarkdownContent } from "./site-markdown.js";
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeStyle: "short",
  hour12: false,
  timeZone: SHANGHAI_TIME_ZONE,
});
const compactDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const summarySegmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });

function projectShuoshuoBody(id: string, source: string) {
  let text: string;
  let imageCount: number;
  try {
    ({ text, imageCount } = extractMarkdownContent(source));
  } catch (error) {
    throw new Error(`说说 ${id} 摘要投影失败`, { cause: error });
  }
  if (!text && imageCount === 0) throw new Error(`说说 ${id} 没有可见文字或图片`);

  const marker = imageCount > 0 ? `[${imageCount} Image${imageCount === 1 ? "" : "s"}]` : "";
  const graphemes = [...summarySegmenter.segment(text)].map(segment => segment.segment);
  const markerLength = marker ? [...summarySegmenter.segment(marker)].length + 1 : 0;
  const textLimit = 80 - markerLength;
  const truncated = graphemes.length > textLimit;
  const projectedText = truncated
    ? `${graphemes
        .slice(0, textLimit - 1)
        .join("")
        .trimEnd()}…`
    : text;
  const summary = [projectedText, marker].filter(Boolean).join(" ");

  return { summary, collapsible: truncated || imageCount > 0 };
}

export async function getPublishedShuoshuo() {
  const entries = await getCollection("shuoshuo");
  const projected = entries.map(entry => ({
    entry,
    projection: projectShuoshuoBody(entry.id, entry.body ?? ""),
  }));

  return projected
    .filter(({ entry }) => !entry.data.draft)
    .sort(
      (left, right) =>
        right.entry.data.publishedAt.getTime() - left.entry.data.publishedAt.getTime() ||
        right.entry.id.localeCompare(left.entry.id),
    )
    .map(({ entry, projection }) => {
      const publishedAt = entry.data.publishedAt;
      const long = dateTimeFormatter.format(publishedAt);
      const label = `说说 · ${long}`;
      return {
        id: entry.id,
        href: `/shuoshuo/${entry.id}/`,
        label,
        permalinkLabel: `${label}的永久链接`,
        ...projection,
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
