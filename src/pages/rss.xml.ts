import type { APIRoute } from "astro";
import { getPublishedPostCatalog } from "../lib/posts";
import { blogSettings } from "../lib/site";
import { getPublishedShuoshuo } from "../lib/shuoshuo";
import { escapeXml } from "../lib/xml";

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
      publishedAt: post.publishedAt.value,
      path: post.href,
    })),
    ...shuoshuo.map(item => ({
      title: item.label,
      description: item.summary,
      publishedAt: item.publishedAt.value,
      path: item.href,
    })),
  ].sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());

  const channelUrl = new URL("/rss.xml", url).href;
  const itemXml = items
    .map(item => {
      const itemUrl = new URL(item.path, url).href;
      return `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(itemUrl)}</link><guid isPermaLink="true">${escapeXml(itemUrl)}</guid><pubDate>${item.publishedAt.toUTCString()}</pubDate><description>${escapeXml(item.description)}</description></item>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(title)}</title><link>${escapeXml(url)}</link><description>${escapeXml(description)}</description><language>zh-CN</language><atom:link href="${escapeXml(channelUrl)}" rel="self" type="application/rss+xml"/>${itemXml}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
};
