# 内容仓统一发布与网站维护

## 职责与入口

公开源码仓 `jasper0507/jaspers-blog` 维护网站、博客设置、首页主视觉、字体、依赖与实际工具实现。私有内容仓 `jasper0507/blog-content` 维护 `posts/`、`shuoshuo/`、`about.md` 和 `post-next-id.json`；正文图片继续使用现有图床。

切换后，内容仓 `.github/workflows/publish.yml` 是唯一正式发布执行入口：内容主分支推送、源码主分支更新的 `source-updated` 通知、无改动时的手动重试都进入该流程。开始时固定两仓最新 `main` 的准确提交，校验并构建，再用 Wrangler 上传现有 Pages 项目、`main` 分支和 `dist` 静态产物，保留 `https://jasper0507.me`。

创作者只克隆内容仓、安装轻量工具，不需要源码副本、Astro、本地构建或新的 GitHub 登录流程。日常命令、格式、草稿保存和失败重试见[创作者说明](../packages/content-tools/content-repo/README.md)。

## 源码维护

`npm run dev`、`npm run build`、类型检查和 CI 固定使用 `tests/fixtures/content`。生产工作流显式设置 `BLOG_CONTENT_DIR`，缺少必要内容或计数器时失败，不回退到示例。真实内容和生产日志留在私有仓工作流。

源码所有变更通过 PR，等待 `verify`（静态检查、领域测试、Chromium 和 Axe）与 `browser-smoke`（Firefox）成功且基于最新 `main` 后合并。源码主分支通知内容仓发布，无需等待下一次文章推送。公开 `build` 仅复核示例构建，不部署。源码不再有内容直推 bypass 例外。

## 远端配置

凭据仅通过 GitHub Secrets 写入，不提交到两仓或创作者工作区。配置值由维护者管理。

| 仓库   | 名称                     | 类型     | 用途                                      |
| ------ | ------------------------ | -------- | ----------------------------------------- |
| 内容仓 | `SOURCE_REPO`            | variable | `jasper0507/jaspers-blog`                 |
| 内容仓 | `PAGES_PROJECT`          | variable | 从现有 Pages 项目核实的名称，不创建新项目 |
| 内容仓 | `SITE_URL`               | variable | `https://jasper0507.me`                   |
| 内容仓 | `CLOUDFLARE_ACCOUNT_ID`  | secret   | 现有项目所属账户                          |
| 内容仓 | `CLOUDFLARE_API_TOKEN`   | secret   | 该账户的 Pages 上传权限                   |
| 源码仓 | `CONTENT_REPO`           | variable | `jasper0507/blog-content`                 |
| 源码仓 | `CONTENT_DISPATCH_TOKEN` | secret   | 限定内容仓的 GitHub App 令牌或 PAT        |

跨仓通知调用 `repository_dispatch`。细粒度令牌需要目标内容仓的 **Contents: write** 权限（仅 Actions: write 不足），见 [GitHub API 权限说明](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)。源码默认 `GITHUB_TOKEN` 不能跨仓读取私有内容。缺少通知令牌或目标标识会明确失败，不能将未发布误报为成功。

内容仓工作流的 `GITHUB_TOKEN` 使用 `contents: read` 和 `actions: write` 读取版本并查询任务。部署凭据仅注入部署步骤。工作流模板和 `pin-publish-versions.js` 由源码仓维护，改动后由维护者同步到内容仓；不会随工具升级自动覆盖。

## 首次切换顺序

这是 #55 的待执行方案。外部配置、推送、合并和生产部署须先取得授权；在完成以下步骤前，不能把本地实现视为线上切换成功。

1. 暂停两仓写作与合并，检查两仓工作区、暂存区及远端最新主分支。逐文件核对当前正文、文件名、文章和说说稳定 ID、计数器。以准备阶段快照为基线检查后续增量；两边都改过时先解决冲突，保护未提交文件，不用旧快照覆盖新内容。同步时保持内容仓 Actions 关闭。
2. 核实现有 Cloudflare Pages 项目、账户、域名、当前部署和 Git 构建设置，记录恢复所需的原值。配置上表变量与 Secrets，内容仓仍不启用发布。将本次创作者说明同步到内容仓；内容没有增量时不制造空内容提交。
3. 推送源码分支并创建 PR，等待 `verify` 与 `browser-smoke` 成功。先关闭现有 Pages 的自动生产分支部署和预览分支部署，并确认没有旧 Git 构建仍会上传。然后合并源码 PR；此时内容仓 Actions 仍关闭，首次通知可能失败，启用后必须重试并确认成功。务必在移除真实内容的源码进入 `main` 前关闭 Pages 自动 Git 部署，避免示例构建成为生产版本。
4. 启用内容仓 Actions。在内容仓推送本次创作者说明更新，验证一次 `push` 发布；再重跑源码合并对应的通知任务，验证一次 `repository_dispatch` 发布。两次都记录实际两仓提交、任务链接和结果。第二次验证应在没有新的内容推送时成功，证明源码更新能独立上线。
5. 核对正式域名、代表性技术文章和说说稳定网址、「关于我」、RSS、站点地图及有公开文章时的搜索。核对草稿 URL 不可访问且不进入页面、RSS、搜索和站点地图。确认旧 Git 自动部署关闭、两个触发都只通过内容仓上传后恢复写作。

Cloudflare 支持停用 Git 自动部署并保留现有项目进行 Wrangler 上传；不新建或迁移项目类型。设置入口及生产/预览开关见 [Git 集成说明](https://developers.cloudflare.com/pages/configuration/git-integration/)和[分支部署控制](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)。

## 发布结果与恢复

版本固定成功后在私有工作流记录两仓提交，发布脚本写入的 artifact `publish-result` 包含 `contentSha`、`sourceSha`、`stage`（`validate` / `build` / `deploy`）、`status`（`success` / `failure` / `skipped`）、失败原因及仅成功时提供的 `url`。初始化、依赖安装或进入部署前缺配置等失败应查看私有任务日志；artifact 可能缺失或仍是前一阶段的结果，最终上线结论必须结合本次工作流成功状态。不要把私有生产日志复制到公开源码 CI 或 PR。

并发组 `site-publish` 取消旧任务，上传前检查更新任务并跳过旧结果；保持现有基本串行机制，不保证每个中间提交都上线。发布命令通过请求 ID 或内容提交关联本次任务，不把历史成功误认为本次成功。

推送成功仅代表内容保存；校验、构建或部署失败时保留提交和上次成功站点，不自动撤销。修复后再次运行 `npm run publish`；没有新改动时重试工作流，不制造空提交。源码通知失败可重跑对应 Actions 任务。

确需撤销内容时，由作者在内容仓 `git revert` 后发布；源码撤销走 PR。紧急情况下可由维护者回滚 Pages 到已知成功部署，之后修正 Git。若首次切换失败，保持新流程为唯一入口并修复重试；恢复旧 Git 部署必须先停用新发布、恢复仍包含真实内容的源码版本并取得批准，不能从已隔离源码的示例构建恢复生产。

## 工具发行

内容仓锁定 `@jasper-blog/content-tools@0.1.0`，发行地址为 `https://github.com/jasper0507/jaspers-blog/releases/download/content-tools-v0.1.0/jasper-blog-content-tools-0.1.0.tgz`。锁定安装使用 `npm ci`，普通网站升级不要求更新该包。

工具升级时，开发者先更改版本并运行 `node scripts/release-content-tools.mjs`，经授权上传新 Release；同版本拒绝覆盖。再更新内容仓依赖与 lockfile，创作者重新 `npm ci`。`prepare-content-repo.mjs` 仅用于从显式 `--content` 指定的快照初始化新的空目录和仓库，不用于覆盖既有内容仓或同步增量。

## #55 执行记录

2026-09-14 本地准备检查：两仓工作区起始干净；内容仓为私有、默认分支 `main`，本地与远端均为 `3be83f63865614d1ce259a02efaa854ae3aed4d2`。33 个写作文件逐字节一致，包括关于我、所有稳定 ID 和号码计数器，无需同步增量。源码起始提交为 `8622854e69d6e0fc0eeebbf917f70c392c90d4b3`。真实文件仅停止 Git 跟踪，本机旧副本保留并忽略；切换执行前必须重新核对是否有新写作改动。

只读查询确认内容仓 Actions 关闭，两仓均未配置发布变量和 Secrets。现有 Pages 项目名、账户、自动部署开关尚未核实；远端 PR、凭据配置和两次实际发布尚未执行。实际发布结果和私有日志保存在内容仓，源码记录仅记验收结论。旧公开 Git 历史仍可读取；本次不改写历史或迁移历史提交。

本地验收在不含 `src/content/`、不含私有仓副本的临时源码目录完成（仅复用本机已安装依赖）：`npm test` 的格式、类型、字体、配置、领域和 Markdown 检查通过；受沙箱限制的浏览器与进程测试获批后单独重跑，Chromium 13 项、发布及保护场景 45 项通过。保护场景有 1 项曾因并行构建的 Astro 临时文件缺失失败，停止其他构建后仅重跑该场景通过。另行 `npm run build` 与 Firefox 冒烟 1 项通过。code-review：Standards 无发现；Spec 的 1 项结果文件说明已修正，生产验收仍待执行。

## 字体维护

字体资源仍由源码仓自托管。运行 `npm run fonts:fetch` 更新中文分包期间暂停其他字体更新和构建；`npm run test:fonts` 验证已提交资源与更新事务。普通构建不访问字体下载网络。
