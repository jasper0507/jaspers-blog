# 构建后搜索索引收成一个 module

「搜索只覆盖已发布技术文章」曾拆在 `index-posts.mjs` 的数字目录正则和 `production.spec.ts` 的同一套 `readdir`，因此把目录选择与 Pagefind 调用收进同一 module。宿主标签和 `color-scheme` / live region 补丁仍留在外壳（ADR-0019）；`pagefind.yml` 仍由 Pagefind 读取，不收进 module。

2026-08-29 修订：module 只提供 `indexPublishedPosts(root, distDirectory)` 事务 interface；数字目录选择、空站陈旧索引清理和 Pagefind CLI glob 都属于 implementation。构建命令与临时 `dist` 验收穿过同一 interface，并从真实事务结果验证 0、1、2 篇技术文章；不再公开测试专用计数。
