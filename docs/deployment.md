# 发布与维护

## 正式发布入口

私有内容仓 `jasper0507/blog-content` 的 `.github/workflows/publish.yml` 是唯一生产发布入口：

- 内容仓 `main` 推送直接触发。
- 源码仓 `main` 更新通过 `repository_dispatch` 触发。
- `npm run publish` 在没有写作改动时使用 `workflow_dispatch` 重试。

工作流开始时固定两仓最新 `main` 提交，以该版本组合完成内容校验、Astro 构建和 Pagefind
索引，最后通过 Wrangler 上传现有 Cloudflare Pages 项目 `jasper-blog`。并发组
`site-publish` 会取消旧任务，部署前也会跳过已落后于更新任务的结果。

Cloudflare Pages 的自动生产和预览 Git 部署均保持关闭。项目继续使用 `main` 生产分支，保留
`jasper0507.me`、`blog.jasper0507.cc.cd` 和 `newblog-8ki.pages.dev`。不要重新启用 Git
部署，否则会产生第二个生产入口。

## 仓库配置

凭据只保存在 GitHub Actions Secrets，不进入仓库、本地工作区或 artifact。

| 仓库   | 名称                     | 类型     | 值或权限                            |
| ------ | ------------------------ | -------- | ----------------------------------- |
| 内容仓 | `SOURCE_REPO`            | variable | `jasper0507/jaspers-blog`           |
| 内容仓 | `PAGES_PROJECT`          | variable | `jasper-blog`                       |
| 内容仓 | `SITE_URL`               | variable | `https://jasper0507.me`             |
| 内容仓 | `CLOUDFLARE_ACCOUNT_ID`  | secret   | Pages 项目所属账户                  |
| 内容仓 | `CLOUDFLARE_API_TOKEN`   | secret   | Cloudflare Pages Edit               |
| 源码仓 | `CONTENT_REPO`           | variable | `jasper0507/blog-content`           |
| 源码仓 | `CONTENT_DISPATCH_TOKEN` | secret   | 仅限内容仓，Contents Read and write |

内容仓工作流的 `GITHUB_TOKEN` 使用 `contents: read` 和 `actions: write`。源码仓默认令牌不能
访问私有仓，因此跨仓通知使用单独的细粒度令牌。通知配置缺失会失败，避免源码已合并却被误报为
已经上线。

轮换令牌时先写入新 Secret，再手动触发一次对应流程验证。不要在日志或 Issue 中粘贴令牌值。

## 源码维护

源码仓的开发、构建和 CI 固定使用 `tests/fixtures/content`，不访问真实内容或私有仓凭据。
所有源码变更通过 PR，等待 `verify` 与 `browser-smoke` 成功后合并。合并后确认：

1. 源码仓的“通知内容仓发布”任务成功。
2. 内容仓出现 `repository_dispatch` 发布任务。
3. 该任务的校验、构建和部署均成功。
4. `publish-result` 中的 `sourceSha` 与合并提交一致。

## 内容发布

创作者只在私有内容仓运行：

```sh
npm run publish
npm run publish -- "自定义提交说明"
```

命令只提交 `posts/`、`shuoshuo/`、`about.md` 和 `post-next-id.json`。推送成功表示内容已保存；
推送失败时远端没有该提交。只有关联任务的校验、构建和部署全部成功才表示上线。完整创作规则见内容仓 README。

每个 `publish-result` 记录：

| 字段         | 含义                              |
| ------------ | --------------------------------- |
| `contentSha` | 本次内容仓提交                    |
| `sourceSha`  | 本次源码仓提交                    |
| `stage`      | `validate`、`build` 或 `deploy`   |
| `status`     | `success`、`failure` 或 `skipped` |
| `url`        | 仅部署成功时的网站地址            |
| `error`      | 失败或跳过原因                    |

若初始化、依赖安装或必要配置读取失败，artifact 可能尚未生成；以私有工作流状态和日志为准。

## 故障恢复

- 校验、构建或部署失败：保留提交和上一个成功站点，修复后重新运行 `npm run publish`。
- 没有新内容需要重试：直接运行 `npm run publish`，命令不会创建空提交，而是按仓库里此刻的内容和网站再开一次发布任务。
- 内容错误：在内容仓 `git revert <提交>`，再运行发布命令。
- 源码错误：创建 revert PR，通过检查后合并。
- 紧急恢复：可在 Cloudflare Pages 回滚到已知成功部署，随后仍须修正 Git 并重新发布。

发布失败时不强推、不自动撤销内容、不自动解决冲突。若必须临时恢复 Pages Git 部署，先停用内容仓
工作流，确认源码提交含有完整生产内容，并取得单独授权；恢复后只能保留一个正式入口。

## 内容工具发行

`packages/content-tools` 是无运行时依赖的创建与发布工具。发布新版本时：

1. 更新 `packages/content-tools/package.json` 的版本和对应说明。
2. 运行工具与发布测试。
3. 执行 `node scripts/release-content-tools.mjs` 创建不可覆盖的 GitHub Release 资源。
4. 在内容仓更新固定资源 URL 和 lockfile，运行 `npm ci` 验证。
5. 提交内容仓维护文件；创作者随后重新运行 `npm ci`。

普通网站更新不要求升级内容工具。源码仓中的 `packages/content-tools/content-repo/` 保存内容仓维护
文件的参考版本；同步时只修改维护文件，不覆盖写作内容或号码计数器。

## 发布后检查

涉及内容规则、路由或发布流程的变更至少检查：

- `https://jasper0507.me/`
- 一篇代表性技术文章和一条说说的稳定网址
- `/about/`、`/rss.xml`、`/sitemap-index.xml`
- 存在公开技术文章时的 Pagefind 搜索
- 草稿不出现在页面、搜索、RSS 和站点地图

生产环境不为验收创建测试草稿；草稿隔离使用公开示例内容验证。
