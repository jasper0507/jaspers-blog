import { getCollection } from "astro:content";
import { isPublished } from "./content";
import { getTagSlug } from "./tags";

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

export function getPostYear(date: Date) {
  return yearFormatter.format(date);
}

export async function getPublishedPostTags() {
  const posts = await getPublishedPosts();
  const byName = new Map<string, { name: string; slug: string; posts: typeof posts }>();
  const slugOwners = new Map<string, string>();

  for (const post of posts) {
    for (const name of post.data.tags) {
      let entry = byName.get(name);
      if (!entry) {
        const slug = getTagSlug(name);
        const owner = slugOwners.get(slug);
        if (owner && owner !== name) {
          throw new Error(`标签「${owner}」与「${name}」生成了相同的 URL slug：${slug}`);
        }
        slugOwners.set(slug, name);
        entry = { name, slug, posts: [] };
        byName.set(name, entry);
      }
      entry.posts.push(post);
    }
  }

  return [...byName.values()].sort(
    (left, right) =>
      right.posts.length - left.posts.length || left.name.localeCompare(right.name, "zh-CN"),
  );
}
