import type { APIRoute } from "astro";
import { getPublishedPostCatalog } from "../lib/posts";
import { blogSettings } from "../lib/site";
import { escapeXml } from "../lib/xml";

const staticRoutes = ["/", "/shuoshuo/", "/tags/", "/archives/", "/about/"];

export const GET: APIRoute = async () => {
  const { url } = blogSettings.site;
  const { posts, tags } = await getPublishedPostCatalog();
  const postRoutes = posts.map(post => post.href);
  const tagRoutes = tags.map(tag => tag.href);
  const routes = [...staticRoutes, ...postRoutes, ...tagRoutes];
  const urls = routes
    .map(route => `<url><loc>${escapeXml(new URL(route, url).href)}</loc></url>`)
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
