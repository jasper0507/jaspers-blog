# 构建期 Markdown 写作收成一个 module

技术文章与说说的 Markdown 能力（KaTeX、中文脚注、Kraft Shiki、代码文件名/高亮/diff）曾拆在处理器文件与 `astro.config.mjs`。站点装配因此必须知道 `--code-*` 与 Shiki transformer 名字。

module 只提供 `siteMarkdown()`，返回官方 `markdown` 配置。`--code-*` 仍由 `MarkdownBody` / `markdown-body.css` 拥有（ADR-0019），变量名是 Shiki 主题与视觉之间的 seam。验收继续穿过渲染后 DOM，不把 Sätteri 插件形状冻成测试。

2026-08-24 修订：按 ADR-0008 暂停无人使用的 GitHub Alert 扩展，`siteMarkdown()` 不再装配对应 HAST plugin。

2026-08-29 修订：Astro 7 会吞掉 Markdown processor 异常，因此暂时允许构建前检查通过第二个 interface `assertSiteMarkdown(source)` 重放公式校验。该例外只服务失败传播保护；上游恢复异常传播后删除，其他内容投影不得进入本 module 的 interface。
