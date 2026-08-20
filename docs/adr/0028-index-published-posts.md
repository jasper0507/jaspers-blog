# 构建后搜索索引收成一个 module

「搜索只覆盖已发布技术文章」曾拆在 `index-posts.mjs` 的数字目录正则、空站种子和 `production.spec.ts` 的同一套 `readdir`。module 提供计数与「计数 → 种子 → Pagefind CLI → 清种子」两笔入口；构建命令只调用后者。生产验收用同一计数对照 `pagefind-entry.json`；空站种子在临时 `dist` 直打事务。宿主标签和 `color-scheme` / live region 补丁仍留在外壳（ADR-0019）。`pagefind.yml` 仍由 Pagefind 读取，不收进 module。
