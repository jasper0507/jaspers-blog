# 已有能力优先用官方集成，领域规则留在数据层

换皮之后，RSS、站点地图和 Markdown 处理器不再手写平行实现：用 `@astrojs/rss`、`@astrojs/sitemap`，Markdown 迁到 Astro 7 默认的 Sätteri。样式采用 Tailwind 4，正文用 `@tailwindcss/typography` 当引擎，以官方 `--tw-prose-*` 映射纸面 token，不上裸 `prose` 出厂默认。`prettier-plugin-tailwindcss` 随 Tailwind 一起加。

领域合同不随包装换掉：RSS 仍合并技术文章与说说并排除草稿；sitemap 仍排除 `/search/`、不含说说锚点；Sätteri 的 math / 提示块 / 中文脚注必须回归后再合入。Sätteri、官方 RSS/sitemap 与换皮分开交付。包管理器继续 npm（Cloudflare Pages 与发布命令的既有默认）。整站验收已迁到 `@playwright/test`，手写 `check-site.mjs` 已撤。不上 MDX、Cloudflare adapter、评论或 View Transitions。Pagefind、KaTeX、Shiki、自托管字体和自定义 content loader 留下。
