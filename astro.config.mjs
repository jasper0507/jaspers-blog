import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { siteMarkdown } from "./src/lib/site-markdown.js";
import { blogSettings } from "./src/lib/site.ts";

export default defineConfig({
  site: blogSettings.site.url,
  trailingSlash: "always",
  // 验收场景用环境变量隔离产物和缓存；未设置时生产构建仍写 ./dist。
  outDir: process.env.JASPER_ACCEPTANCE_DIST ?? "./dist",
  cacheDir: process.env.JASPER_ACCEPTANCE_CACHE ?? "./node_modules/.astro",
  integrations: [
    sitemap({
      // 站点地图合同：搜索入口是弹层而非页面，即使将来出现 /search/ 路由也不收录。
      filter: page => !page.endsWith("/search/"),
    }),
  ],
  redirects: {
    "/posts": "/archives",
    "/search": "/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: siteMarkdown(),
});
