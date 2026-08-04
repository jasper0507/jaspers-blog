import type { APIRoute } from "astro";
import { getPublishedPosts } from "../lib/posts";
import { getTagSlug } from "../lib/tags";
import { escapeXml } from "../lib/xml";

const staticRoutes = ["/", "/shuoshuo/", "/tags/", "/archives/", "/about/"];

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("缺少站点地址，无法生成 sitemap。");

  const posts = await getPublishedPosts();
  const postRoutes = posts.map(post => `/posts/${post.id}/`);
  const tagRoutes = [...new Set(posts.flatMap(post => post.data.tags.map(getTagSlug)))].map(
    slug => `/tags/${slug}/`,
  );
  const routes = [...staticRoutes, ...postRoutes, ...tagRoutes];
  const urls = routes
    .map(route => `<url><loc>${escapeXml(new URL(route, site).href)}</loc></url>`)
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
