# 已有能力优先用官方集成，领域规则留在数据层

换皮之后，RSS、站点地图和 Markdown 处理器不再手写平行实现：用 `@astrojs/rss`、`@astrojs/sitemap`，Markdown 迁到 Astro 7 默认的 Sätteri。样式采用 Tailwind 4。2026-08-27 删除只负责 class 排序的 `prettier-plugin-tailwindcss`；class 顺序不是产品合同。

2026-08-17 修订：正文已有本地 CSS 覆盖全部实际元素，继续保留 `@tailwindcss/typography` 只会叠加一套被覆盖的基线。正文改由 `markdown-body.css` 直接拥有排版与 Kraft token，显式恢复 Tailwind Preflight 清除的列表标记；删除 Typography 插件、`prose` class 和 `--tw-prose-*` 桥。Tailwind 仍负责全站 token、Preflight 和工具类，不扩大为移除 Tailwind。

领域合同不随包装换掉：RSS 仍合并技术文章与说说并排除草稿；sitemap 仍排除 `/search/`、不含说说锚点；Sätteri 的 math / 提示块 / 中文脚注必须回归后再合入。Sätteri、官方 RSS/sitemap 与换皮分开交付。包管理器继续 npm。整站高层交互使用 `@playwright/test`，普通内容发布只运行构建。不上 MDX、Cloudflare adapter、评论或 View Transitions。Pagefind、KaTeX、Shiki、自托管拉丁字体和 Astro Content Collections 留下。
