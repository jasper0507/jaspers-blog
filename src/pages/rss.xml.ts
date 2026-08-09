import type { APIRoute } from "astro";
import { getPublishedPostCatalog } from "../lib/posts";
import { getPublishedShuoshuo, getShuoshuoLabel } from "../lib/shuoshuo";
import { escapeXml } from "../lib/xml";

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("缺少站点地址，无法生成 RSS。");

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
    ...shuoshuo.map(entry => ({
      title: getShuoshuoLabel(entry.data.publishedAt),
      description: entry.body!,
      publishedAt: entry.data.publishedAt,
      path: `/shuoshuo/#${entry.id}`,
    })),
  ].sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());

  const channelUrl = new URL("/rss.xml", site).href;
  const itemXml = items
    .map(item => {
      const url = new URL(item.path, site).href;
      return `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${item.publishedAt.toUTCString()}</pubDate><description>${escapeXml(item.description)}</description></item>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml("Jasper's Blog")}</title><link>${escapeXml(site.href)}</link><description>Jasper 的技术文章与说说。</description><language>zh-CN</language><atom:link href="${escapeXml(channelUrl)}" rel="self" type="application/rss+xml"/>${itemXml}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
};
