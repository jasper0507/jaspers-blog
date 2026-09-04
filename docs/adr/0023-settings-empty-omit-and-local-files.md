# 博客设置只服务当前博客

2026-08-29 修订：`blog.config.ts` 仍是唯一设置入口，但不充当可复用主题配置。`headerTitle`、`favicon` 等当前字段都必须填写；不支持省略、空白回退或兼容旧配置形状。字段结构由 TypeScript 检查，设置值按原样使用，不统一裁剪。

2026-09-05 修订：首页照片不再作为设置字段。`darkImage` / `lightImage` 已删除；caption 与 alt 仍必须填写，照片由 `public/images/hero/` 目录扫描（ADR-0031）。

正式网址由原生 `URL` 解析并规范化，必须使用 HTTPS、根路径且不含查询或锚点；不额外限制账号、显式端口、IP、GitHub 或邮箱格式。本地图片和图标必须在 `public/` 中存在，浏览器图标只接受 SVG、PNG 或 ICO。设置错误允许 TypeScript、`URL`、文件系统或构建直接失败，不维护平行的中文诊断矩阵。页脚仍只替换 `{year}`、`{author}`；访客主题记忆继续使用 `theme`，并读取旧键 `jasper-theme`。
