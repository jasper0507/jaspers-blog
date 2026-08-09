import { getCollection, render } from "astro:content";
import type { RenderResult } from "astro:content";
import { isPublished, projectContentDate } from "./content";
import { getTag } from "./tags";

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
  slug: string;
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
  modifiedAtIso: string;
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

  for (const entry of entries) {
    if (!entry.body?.trim()) throw new Error(`技术文章 ${entry.id} 的正文不能为空`);
  }

  const posts: PublishedPost[] = entries
    .filter(isPublished)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .map(entry => {
      const date = projectContentDate(entry.data.publishedAt);
      return {
        slug: entry.id,
        href: `/posts/${entry.id}/`,
        title: entry.data.title,
        description: entry.data.description,
        publishedAt: {
          value: entry.data.publishedAt,
          iso: entry.data.publishedAt.toISOString(),
          ...date,
          year: yearFormatter.format(entry.data.publishedAt),
        },
        modifiedAtIso: (entry.data.updatedAt ?? entry.data.publishedAt).toISOString(),
        tags: entry.data.tags.map(getTag),
        render: async () => {
          const { Content, headings } = await render(entry);
          return { Content, headings };
        },
      };
    });

  const archive: ArchiveGroup[] = [];
  const tagsByName = new Map<string, PublishedTagGroup>();
  const tagHrefOwners = new Map<string, string>();

  for (const post of posts) {
    const latestArchiveGroup = archive.at(-1);
    if (latestArchiveGroup?.year === post.publishedAt.year) latestArchiveGroup.posts.push(post);
    else archive.push({ year: post.publishedAt.year, posts: [post] });

    for (const tag of post.tags) {
      let group = tagsByName.get(tag.name);
      if (!group) {
        const owner = tagHrefOwners.get(tag.href);
        if (owner && owner !== tag.name) {
          throw new Error(`标签「${owner}」与「${tag.name}」生成了相同的网址：${tag.href}`);
        }
        tagHrefOwners.set(tag.href, tag.name);
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
