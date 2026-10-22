import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { resolve, sep } from "node:path";
import { siteMarkdown } from "./src/lib/site-markdown.js";
import { blogSettings } from "./src/lib/site.ts";

const outDir = process.env.JASPER_ACCEPTANCE_DIST ?? "./dist";
// Astro 只在 outDir 位于 cwd 之下时把预渲染中间产物放进 outDir/.prerender；
// 否则全部构建共用 <cwd>/.astro/.prerender，并行构建会互删 chunk，跨盘时 rename 还会 EXDEV。
if (!resolve(outDir).startsWith(process.cwd() + sep)) {
  throw new Error(`outDir 必须位于 ${process.cwd()} 之下：${outDir}`);
}

export default defineConfig({
  site: blogSettings.site.url,
  trailingSlash: "always",
  // 验收场景用环境变量隔离产物和缓存；未设置时生产构建仍写 ./dist。
  outDir,
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
