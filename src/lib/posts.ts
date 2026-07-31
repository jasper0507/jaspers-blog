import { getCollection } from "astro:content";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "long",
  timeZone: "Asia/Shanghai",
});

export async function getPublishedPosts() {
  const posts = await getCollection("posts");

  for (const post of posts) {
    if (!post.body?.trim()) throw new Error(`技术文章 ${post.id} 的正文不能为空`);
  }

  return posts
    .filter(post => !post.data.draft)
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
    );
}

export function formatPostDate(date: Date) {
  return dateFormatter.format(date);
}
