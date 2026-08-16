# 页脚左侧用生成的版权行，不用配置 Markdown

页脚左侧曾经是 `blog.config.ts` 里一段受限 Markdown，只为写出「© 年份 作者」。这会单独拉起 `@astrojs/markdown-remark`，和正文的 Sätteri 路径并列。版权行改为由作者显示名和上海年份生成，配置里不再接受 `footer`；联系方式仍用已有的 RSS / GitHub / 邮箱字段。不要把页脚接到正文 Markdown 处理器上。
