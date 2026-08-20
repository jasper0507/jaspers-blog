# 构建期 Markdown 写作收成一个 module

技术文章与说说的 Markdown 能力（KaTeX、中文脚注、提示块、Kraft Shiki、代码文件名/高亮/diff）曾拆在处理器文件与 `astro.config.mjs`。站点装配因此必须知道 `--code-*` 与 Shiki transformer 名字。

module 只提供 `siteMarkdown()`，返回官方 `markdown` 配置。`--code-*` 仍由 `MarkdownBody` / `markdown-body.css` 拥有（ADR-0019），变量名是 Shiki 主题与视觉之间的 seam。验收继续穿过渲染后 DOM，不把 Sätteri 插件形状冻成测试。
