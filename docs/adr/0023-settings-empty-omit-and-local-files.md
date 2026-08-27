# 站点设置只服务当前博客

2026-08-27 修订：`blog.config.ts` 仍是唯一设置入口，但不再充当可复用主题配置。`headerTitle`、`darkImage`、`favicon` 等当前字段都必须填写；不支持省略、空白回退、任意子路径网址或兼容旧配置形状。字段结构由 TypeScript 检查，正式网址直接交给原生 `URL` 解析，本地图片和图标必须在 `public/` 中存在。浏览器图标只接受 SVG、PNG 或 ICO。

设置错误允许 TypeScript、`URL`、文件系统或构建直接失败，不维护一套平行的中文诊断矩阵。页脚仍只替换 `{year}`、`{author}`；访客主题记忆继续使用 `theme`，并读取旧键 `jasper-theme`。
