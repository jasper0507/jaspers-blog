# 构建期 Markdown 写作收成一个 module

技术文章与说说的 Markdown 能力（KaTeX、中文脚注、`==高亮==`、Kraft Shiki、代码文件名/高亮/diff）曾拆在处理器文件与 `astro.config.mjs`。站点装配因此必须知道 `--code-*` 与 Shiki transformer 名字。

module 只提供 `siteMarkdown()`，返回官方 `markdown` 配置。`--code-*` 仍由 `MarkdownBody` / `markdown-body.css` 拥有（ADR-0019），变量名是 Shiki 主题与视觉之间的 seam。验收继续穿过渲染后 DOM，不把 Sätteri 插件形状冻成测试。

2026-08-24 修订：按 ADR-0008 暂停无人使用的 GitHub Alert 扩展，`siteMarkdown()` 不再装配对应 HAST plugin。

2026-08-29 修订：Astro 7 会吞掉 Markdown processor 异常，因此暂时允许构建前检查通过第二个 interface `assertSiteMarkdown(source)` 重放公式校验。该例外只服务失败传播保护；上游恢复异常传播后删除，其他内容投影不得进入本 module 的 interface。

2026-09-08 修订：高亮支持使正文与说说摘要需要共享语法知识，只导出 `stripInlineMarks` 仍要求说说发布 module 掌握 Markdown 解析与节点遍历。撤回上一修订禁止内容投影进入的限制，改由 `extractMarkdownContent(source)` 返回未截断、空白归一化后的 `{ text, imageCount }`；解析设置、节点处理与正文共用的高亮识别逻辑属于 Markdown module 的 implementation，不再导出高亮清理 helper。

空投影正常返回，解析错误直接传播；说说 module 继续负责空内容拒绝、80 个用户感知字符、图片数量标记、截断与折叠规则（ADR-0030）。正文渲染与内容提取是不同用途，不做可互换 adapter，也不增加 AST interface。验收通过提取结果及构建后的正文、摘要与 RSS，保留现有公式失败传播检查；语法与说说摘要行为不变。
