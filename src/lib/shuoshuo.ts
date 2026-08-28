import { getCollection, render } from "astro:content";
import { isPublished } from "./content";
import { SHUOSHUO_TIME_ZONE } from "./shuoshuo-rules.js";
import { projectShuoshuoBody } from "./site-markdown.js";
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
