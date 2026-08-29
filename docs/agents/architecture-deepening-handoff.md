# 架构深化交接

状态：待用户选择候选后继续深入。基线为 `4f3dac4`，扫描日期为 2026-08-29。

## 目标

在不增加 hypothetical seam 的前提下，把一个现有浅 interface 收回真正拥有其知识的 module，提高 depth、leverage、locality 和可测试性。用户要求覆盖整个代码库，报告直接使用 Markdown；无需生成或打开 HTML。

下一会话开始时先核对当前代码、`CONTEXT.md`、相关 ADR 和工作区状态。若用户未指明候选，先让用户从下列三项中选择；选择后使用 `grilling` 明确约束，再讨论具体 interface。命名或澄清领域概念时使用 `domain-modeling`；需要比较多个 interface 时使用 `codebase-design` 的 design-it-twice 流程。

完成条件：选中候选的约束、seam、module ownership、保留的测试 surface 和 ADR 影响均已明确；用户要求实施时，再做最小改动与针对性验证。

## 扫描结论

只读扫描覆盖 `src/`、`scripts/`、`tests/`、构建配置、GitHub Actions、最近 80 次提交、`CONTEXT.md` 和相关 ADR。近期热点集中在站点设置、构建期 Markdown、说说发布和搜索索引。尚未设计新 interface，也未修改生产代码。

### 1. 加深博客设置 module

推荐强度：**Strong**；当前首选。

证据：

- [`src/lib/site.ts`](../../src/lib/site.ts) 同时维护手写 `BlogSettings`、同形 Zod schema、解析/规范化逻辑和已解析快照。
- [`blog.config.ts`](../../blog.config.ts) 通过 type-only import 依赖 `site.ts`，而 `site.ts` 在运行时反向读取配置；没有运行时循环，但 authoring shape 的 ownership 不清晰。
- [`scripts/check-site-config.mjs`](../../scripts/check-site-config.mjs) 是 `parseBlogSettings` 除 module 自身外的唯一调用方；页面只消费 `blogSettings`。
- [`ADR-0023`](../adr/0023-settings-empty-omit-and-local-files.md) 要求 TypeScript 检查字段结构，并允许 `URL`、文件系统或构建直接失败，不维护平行中文诊断矩阵；当前 Zod 错误聚合与该决定存在漂移。
- `site.ts` 是最近 80 次提交中的主要热点，重复知识已有实际维护成本。

删除测试：若移除重复结构声明和测试专用 surface，大部分复杂度会消失；HTTPS 根网址、本地资源存在、favicon 类型和页脚占位符等必要不变量仍应集中在设置 module 内，不得简化掉。

期望 ownership：配置作者面对一个 authoring shape；调用方只面对一个已解析快照；必要校验和派生值隐藏在同一 seam 后。具体 interface 尚未决定。

实施时至少核对 `npm run check`、`npm run test:config` 和 `npm run build`；按最终改动决定是否需要更高层入口。

### 2. 把说说摘要投影收回说说发布 module

推荐强度：**Strong**。

证据：

- [`src/lib/site-markdown.js`](../../src/lib/site-markdown.js) 同时拥有站点 Markdown 装配、原始 Markdown 公式断言，以及说说摘要、图片计数、80 字符截断和折叠条件。
- [`src/lib/shuoshuo.ts`](../../src/lib/shuoshuo.ts) 跨 seam 调用 `projectShuoshuoBody`，再形成已发布说说快照。
- [`scripts/check-post-stable-ids.mjs`](../../scripts/check-post-stable-ids.mjs) 直接测试摘要 implementation；理解说说摘要需跨说说发布、Markdown 和“稳定 ID”检查三处跳转。
- [`ADR-0018`](../adr/0018-share-shuoshuo-lifecycle-rules.md) 与 [`ADR-0030`](../adr/0030-shuoshuo-detail-permalinks.md) 把摘要定义为说说发布规则；[`ADR-0026`](../adr/0026-site-markdown-module.md) 原本要求 Markdown module 只提供 `siteMarkdown()`。

删除测试：删除公开摘要投影入口后，摘要复杂度可以集中到说说发布 module 的 implementation，不会散回首页、RSS、时间流和详情页。测试应穿过已发布说说 interface 或真正私有的 internal seam。

约束：`assertSiteMarkdown` 是 Astro 7 吞掉 processor 异常的已知 workaround，见 [`scripts/check-site-markdown.mjs`](../../scripts/check-site-markdown.mjs) 中的 `ponytail:` 注释。深化时保留该保护，并决定恢复 ADR-0026 的单一 interface，还是记录一个明确的临时例外；不要为了共享 parser 再造浅 module。

实施时至少核对 `npm run test:content-rules`、`npm run build` 和覆盖说说页面/RSS 的站点测试。

### 3. 删除搜索索引的测试专用计数 interface

推荐强度：**Worth exploring**。

证据：

- [`scripts/lib/index-published-posts.mjs`](../../scripts/lib/index-published-posts.mjs) 的 `countPublishedPostPages()` 只有测试调用方，interface 与一行 implementation 几乎等复杂。
- [`scripts/check-index-posts.mjs`](../../scripts/check-index-posts.mjs) 已运行真实索引事务，并从 `pagefind-entry.json` 验证 0、1、2 篇结果；直接计数断言没有增加可观察行为覆盖。
- 生产入口只调用完整索引事务；当前没有第二个 adapter，计数属于 hypothetical seam。

删除测试：移除计数入口及其三条断言后，生产路径不变，数字目录识别仍由真实 Pagefind 产物覆盖。

ADR 警告：该方向直接违反 [`ADR-0028`](../adr/0028-index-published-posts.md) 规定的“双入口”。当时“生产验收复用计数”的理由已经失效，但必须先明确重开 ADR；若不重开则跳过此项。

实施时至少核对 `npm run test:index-posts` 和 `npm run build`。

## 已排除方向

- `BaseLayout.astro` 虽长，但以很小的 interface 隐藏完整站点外壳 implementation，已有良好 depth；按行数拆分只会制造 hypothetical seam。
- 技术文章与说说保持两个独立 module 是 ADR-0017 的明确决定，不建立统一内容 seam。
- `MarkdownBody`、`PostTags` 和搜索索引事务都通过删除测试，已有实际 leverage。
- 页面局部 CSS 与 `global.css` 的 ownership 基本符合 ADR-0019；外观相似不足以建立共享 module。
- GitHub Actions 中少量 Node/npm 步骤重复不足以支撑复用 module。

## 工作区注意事项

扫描开始前 `THIRD_PARTY_NOTICES.md` 已处于删除状态，这是用户现有改动，不属于本次工作。继续时保留它，除非用户明确要求处理。
