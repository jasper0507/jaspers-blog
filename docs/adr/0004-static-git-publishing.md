# 通过 Git 发布静态内容

> **历史决策。** 发布入口、两仓边界、`src/content/**` 直推例外与「不再维护发布包装」已由
> [ADR-0034](0034-separate-content-repository.md) 取代。现行流程见[部署说明](../deployment.md)。
> 以下正文不再指导发布、bypass 或内容路径。

技术文章和说说都保存在仓库内，以 Markdown 编写并随 Git 推送触发 Cloudflare Pages 构建；不引入 CMS、数据库或管理后台。第一版默认在电脑端写作，通过一个最小命令生成带时间与稳定 ID 的说说文件，不建设手机发布桥梁。项目优先降低长期维护成本，让作者专注于内容，即使这意味着每次发布都需要提交代码仓库。

2026-08-27 修订：创建命令只负责在本地生成内容，不访问 Git 或网络。普通内容发布先运行 `npm run build`，再直接使用 `git add`、`git commit`、`git push`；修改页面、脚本或依赖时才运行精简后的 `npm test`。不再维护发布包装、Git 同步模块或 Git hook。线上错误默认通过 `git revert` 后推送恢复，Cloudflare 历史部署回滚只作紧急手段。

2026-08-28 修订：`main` 使用两套叠加的 GitHub ruleset。安全规则禁止删除和强推且不设置 bypass；变更流程规则要求 PR、`verify` 与 `browser-smoke` 成功并基于最新 `main`，审批数为 0，作者拥有 `always` bypass。普通代码、页面、脚本、配置、依赖与 CI 变更必须经 PR；bypass 只用于全部改动均位于 `src/content/**` 的内容发布。GitHub 不能按变更路径约束 bypass，因此该范围属于明确的维护约定；不为硬隔离增加内容分支、独立仓库或发布机器人。PR 中 `verify` 运行静态检查、领域测试、Chromium 完整场景与 Axe，`browser-smoke` 只运行 Firefox 核心场景；内容直推后由 `push main` 的无浏览器 `build` 复核。

技术文章和说说均可使用 `draft: true` 暂停生产发布；草稿必须同时从页面、搜索、RSS 和站点地图中排除。该字段只控制站点发布，不是访问控制：源码仓库公开（ADR-0029），任何人都能看到已提交的草稿，敏感内容不得进入仓库。
