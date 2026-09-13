import { createContent } from "../packages/content-tools/create-content.js";

// 生产迁移前保留源码仓创建入口；独立发行包使用当前内容仓目录。
await createContent("src/content", ["new:post", ...process.argv.slice(2)]);
