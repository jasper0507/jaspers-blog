import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublishedPostCatalog } from "../lib/posts";
import { blogSettings } from "../lib/site";
import { getPublishedShuoshuo } from "../lib/shuoshuo";

export const GET: APIRoute = async () => {
  const { title, url, description } = blogSettings.site;
  const [{ posts }, shuoshuo] = await Promise.all([
    getPublishedPostCatalog(),
    getPublishedShuoshuo(),
  ]);
  const items = [
    ...posts.map(post => ({
      title: post.title,
      description: post.description,
      pubDate: post.publishedAt.value,
      link: new URL(post.href, url).href,
    })),
    ...shuoshuo.map(item => ({
      title: item.label,
      description: item.summary,
      pubDate: item.publishedAt.value,
      link: new URL(item.href, url).href,
    })),
  ].sort((left, right) => right.pubDate.getTime() - left.pubDate.getTime());

  return rss({
    title,
    description,
    site: url,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>zh-CN</language><atom:link href="${new URL("/rss.xml", new URL(url).origin).href}" rel="self" type="application/rss+xml"/>`,
    items,
  });
};
