# 技术文章稳定 ID 的创建与断言共用一个 module

技术文章稳定 ID 的发放曾拆在纯 JSON helper、创建命令的写盘回滚、以及公开快照里的再读与唯一性检查。创建失败不得占用号码（ADR-0024），所以写 Markdown 与改 next 必须是一笔事务；手写 Markdown 合法，所以公开快照必须再断言已用 id 唯一且小于 next。

module 只提供 `createPost` 与 `assertPostStableIds`，调用方传入技术文章目录。创建命令在 git 对齐之后调用前者；`getPublishedPostCatalog` 在 intake 之后调用后者，传入已扫到的文件名与稳定 ID。不把创建命令和 collection 做成可互换 adapter，不从 schema 读取计数器文件，不把 permalink 收进身份 module。`isPostFilename` 仍给 intake 用。

测试切开：命令穿过 CLI 与 git；身份不变量在临时目录直打 module；intake 失败仍走构建。
