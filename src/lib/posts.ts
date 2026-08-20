import { getCollection, render } from "astro:content";
import type { RenderResult } from "astro:content";
import { isPublished } from "./content";
import { POST_CONTENT_DIRECTORY, assertPostStableIds } from "./post-rules.js";
import { getTag } from "./tags";

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

export async function getPublishedPostCatalog() {
  const entries = await getCollection("posts");
  const tagHrefOwners = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.body?.trim()) throw new Error(`技术文章 ${entry.id} 的正文不能为空`);
    for (const tagName of entry.data.tags) {
      const { href } = getTag(tagName);
      const tagOwner = tagHrefOwners.get(href);
      if (tagOwner && tagOwner !== tagName) {
        throw new Error(`标签「${tagOwner}」与「${tagName}」生成了相同的网址：${href}`);
      }
      tagHrefOwners.set(href, tagName);
    }
  }

  await assertPostStableIds(
    process.env.POST_CONTENT_DIR ?? `./${POST_CONTENT_DIRECTORY}`,
    entries.map(entry => ({ filename: entry.id, id: entry.data.id })),
  );

  const posts: PublishedPost[] = entries
    .filter(isPublished)
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
