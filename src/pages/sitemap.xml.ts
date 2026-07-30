import type { APIRoute } from "astro";

const routes = [
  "/",
  "/posts/",
  "/shuoshuo/",
  "/tags/",
  "/archives/",
  "/about/",
  "/search/",
];

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("缺少站点地址，无法生成 sitemap。");

  const urls = routes
    .map(route => `<url><loc>${new URL(route, site)}</loc></url>`)
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
