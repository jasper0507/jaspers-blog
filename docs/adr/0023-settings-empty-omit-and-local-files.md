# 可选设置空串视为省略，本地身份资源必须存在

`blog.config.ts` 仍是唯一日常设置入口。可选项 `headerTitle`、`darkImage`、`favicon` 在省略、空字符串或只含空白时按省略处理（短名回退站名、暗图复用亮图、不输出图标标签）。`alt: ""` 仍表示装饰图；`footer.text` 空或空白仍不渲染左侧。公开快照只暴露替换后的 `footer.copyright`，不再带出原稿 `text`。必填项空值、主视觉/`favicon` 缺文件、以及 `src/content/about.md` 缺失，在 `src/lib/site.ts` 用中文失败。正式网址经原生 `URL.href` 规范化。不恢复 Zod 诊断矩阵，也不校验 GitHub 主页形态、邮箱格式、HTTPS 域名根或 16 字上限。

浏览器图标推荐站点根上的 `/favicon.svg`，并允许 `public/` 内现存的 svg/png/ico；`link` 的 `type` 按扩展名输出。主视觉仍只接受 `/images/` 下的本地文件。访客亮暗记忆的 localStorage 键为 `theme`，读取时兼容旧键 `jasper-theme`。
