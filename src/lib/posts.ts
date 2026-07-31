import { getCollection } from "astro:content";
import { isPublished } from "./content";
import { tags } from "./tags";

export const POSTS_PER_PAGE = 10;

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

  return tags
    .map(tag => ({
      ...tag,
      posts: posts.filter(post => post.data.tags.includes(tag.name)),
    }))
    .filter(tag => tag.posts.length > 0);
}
