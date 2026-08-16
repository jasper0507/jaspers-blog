# 页脚左侧是纯文本，不用 Markdown

成熟 Astro 博客主题（官方 blog starter、AstroPaper、Fuwari、Cactus）用身份字段和组件模板拼版权行，不为页脚单独开 Markdown 处理器。本站允许在 `blog.config.ts` 用 `footer.text` 改左侧文案，只做 `{year}` / `{author}` 替换并当普通文本输出；留空则不渲染左侧。联系方式仍用 RSS / GitHub / 邮箱字段。不要把页脚接到正文 Sätteri，也不要为这一行再引入 unified。
