import { getCollection, render } from "astro:content";
import { isPublished } from "./content";
import { extractMarkdownContent } from "./site-markdown.js";
import { SHUOSHUO_TIME_ZONE } from "./shuoshuo-rules.js";
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
const summarySegmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });

function projectShuoshuoBody(source: string) {
  const { text, imageCount } = extractMarkdownContent(source);
  if (!text && imageCount === 0) throw new Error("说说没有可见文字或图片");

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
    projection: projectShuoshuoBody(entry.body ?? ""),
  }));

  return projected
    .filter(({ entry }) => isPublished(entry))
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
