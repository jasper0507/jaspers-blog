import { getCollection, render } from "astro:content";
import type { CollectionEntry, RenderResult } from "astro:content";
import { assertPostStableIds } from "../../packages/content-tools/post-rules.js";
import { findTagUrlConflicts } from "../../packages/content-tools/post-writing-rules.js";
import { getTag } from "../../packages/content-tools/tag-rules.js";
import { contentSource } from "./content-source.js";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const yearFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  timeZone: "Asia/Shanghai",
});

export interface PublishedTag {
  name: string;
  slug: string;
  href: string;
}

export interface PublishedPost {
  id: number;
  href: string;
  title: string;
  description: string;
  publishedAt: {
    value: Date;
    iso: string;
    date: string;
    compact: string;
    year: string;
  };
  tags: PublishedTag[];
  render(): Promise<Pick<RenderResult, "Content" | "headings">>;
}

interface ArchiveGroup {
  year: string;
  posts: PublishedPost[];
}

interface PublishedTagGroup extends PublishedTag {
  posts: PublishedPost[];
}

interface PublishedCatalog {
  posts: PublishedPost[];
  archive: ArchiveGroup[];
  tags: PublishedTagGroup[];
}

let snapshot: { key: string; catalog: PublishedCatalog } | undefined;

function publishedCatalogKey(entries: CollectionEntry<"posts">[]) {
  return [
    contentSource().posts,
    ...[...entries]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(entry =>
        [
          entry.id,
          entry.data.id,
          entry.data.draft ? "1" : "0",
          entry.data.publishedAt.toISOString(),
          entry.data.title,
          entry.data.description,
          entry.data.tags.join("\u001f"),
          entry.body ?? "",
        ].join("\0"),
      ),
  ].join("\n");
}

export async function getPublishedPostCatalog() {
  const entries = await getCollection("posts");
  // 计数器不属于 collection；即使命中投影快照，也必须重新断言身份状态。
  await assertPostStableIds(
    contentSource().posts,
    entries.map(entry => ({ filename: entry.id, id: entry.data.id })),
  );
  const key = publishedCatalogKey(entries);
  if (snapshot?.key === key) return snapshot.catalog;
  snapshot = { key, catalog: createPublishedCatalog(entries) };
  return snapshot.catalog;
}

function createPublishedCatalog(entries: CollectionEntry<"posts">[]): PublishedCatalog {
  const conflicts = findTagUrlConflicts(
    entries.map(entry => ({ id: entry.id, tags: entry.data.tags })),
  );
  if (conflicts[0]) throw new Error(conflicts[0].message);

  for (const entry of entries) {
    if (!entry.body?.trim()) throw new Error(`技术文章 ${entry.id} 的正文不能为空`);
  }

  const posts: PublishedPost[] = entries
    .filter(entry => !entry.data.draft)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
        left.data.id - right.data.id,
    )
    .map(entry => {
      const date = isoDateFormatter.format(entry.data.publishedAt);
      return {
        id: entry.data.id,
        href: `/posts/${entry.data.id}/`,
        title: entry.data.title,
        description: entry.data.description,
        publishedAt: {
          value: entry.data.publishedAt,
          iso: entry.data.publishedAt.toISOString(),
          date,
          compact: date.replaceAll("-", "."),
          year: yearFormatter.format(entry.data.publishedAt),
        },
        tags: entry.data.tags.map(getTag),
        render: async () => {
          const { Content, headings } = await render(entry);
          return { Content, headings };
        },
      };
    });

  const archive: ArchiveGroup[] = [];
  const tagsByName = new Map<string, PublishedTagGroup>();

  for (const post of posts) {
    const latestArchiveGroup = archive.at(-1);
    if (latestArchiveGroup?.year === post.publishedAt.year) latestArchiveGroup.posts.push(post);
    else archive.push({ year: post.publishedAt.year, posts: [post] });

    for (const tag of post.tags) {
      let group = tagsByName.get(tag.name);
      if (!group) {
        group = { ...tag, posts: [] };
        tagsByName.set(tag.name, group);
      }
      group.posts.push(post);
    }
  }

  const tags = [...tagsByName.values()].sort(
    (left, right) =>
      right.posts.length - left.posts.length || left.name.localeCompare(right.name, "zh-CN"),
  );

  return { posts, archive, tags };
}
