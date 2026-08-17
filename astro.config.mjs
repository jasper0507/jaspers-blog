import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import { siteMarkdownProcessor } from "./src/lib/markdown-satteri.js";
import { blogSettings } from "./src/lib/site.ts";

const kraftPaperTheme = {
  name: "kraft-paper",
  type: "light",
  colors: {
    "editor.background": "var(--code-background)",
    "editor.foreground": "var(--code-foreground)",
  },
  settings: [
    {
      settings: {
        background: "var(--code-background)",
        foreground: "var(--code-foreground)",
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "var(--code-constant)" },
    },
    {
      scope: ["keyword", "storage"],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "var(--code-function)" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "var(--code-parameter)" },
    },
  ],
};

const transformerCodeTitle = {
  name: "kraft-code-title",
  pre(node) {
    const title = this.options.meta?.__raw?.match(/(?:^|\s)title=["']([^"']+)["']/)?.[1];
    if (title) node.properties["data-title"] = title;
  },
};

export default defineConfig({
  site: blogSettings.site.url,
  trailingSlash: "always",
  integrations: [
    sitemap({
      // 站点地图合同：搜索入口是弹层而非页面，即使将来出现 /search/ 路由也不收录。
      filter: page => !page.endsWith("/search/"),
    }),
  ],
  redirects: {
    "/posts": "/archives",
    "/posts/2": "/archives",
    "/search": "/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: siteMarkdownProcessor(),
    shikiConfig: {
      theme: kraftPaperTheme,
      wrap: false,
      transformers: [
        transformerCodeTitle,
        transformerMetaHighlight(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
      ],
    },
  },
});
