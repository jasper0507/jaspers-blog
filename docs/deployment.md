# Cloudflare Pages 部署与日常发布

## 构建配置

- 正式分支：`main`
- 根目录：仓库根目录
- Node.js：`.node-version` 中的 `24.19.0`
- 安装：`npm ci`
- 构建：`npm run build`
- 输出目录：`dist`
- 环境变量：无
- 正式域名：`https://jasper0507.me`

配置方式见 Cloudflare 的 [Astro Pages 指南](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)；Node 版本由 [Pages 构建镜像](https://developers.cloudflare.com/pages/configuration/build-image/)读取。

## 首次上线

1. 在 Cloudflare **Workers & Pages** 中创建 Pages 项目，连接公开仓库 `jasper0507/jaspers-blog`。
2. 选择 `main`，填写上方构建配置并部署。
3. 在 **Custom domains** 中关联 `jasper0507.me`。若 DNS 不在同一 Cloudflare 账户，按[自定义域名指南](https://developers.cloudflare.com/pages/configuration/custom-domains/)配置 CNAME。
4. 域名变为 **Active** 后执行：

   ```sh
   curl --fail --silent --show-error --location https://jasper0507.me/
   curl --fail --silent --show-error https://jasper0507.me/rss.xml
   curl --fail --silent --show-error https://jasper0507.me/sitemap-index.xml
   ```

   只有存在已发布技术文章时才额外检查 `https://jasper0507.me/pagefind/pagefind.js`；零文章时搜索入口和索引都不会生成。

仓库和构建不保存 Cloudflare 凭据；账户授权与域名由所有者在控制台维护。

## 创建内容

- 技术文章：`npm run new:post -- "<标题>"`。命令分配冻结的数字网址并更新 `src/content/post-next-id.json`；不要手改 `id` 或计数器。
- 说说：`npm run new:shuoshuo`。命令按上海时间创建稳定 ID。
- 两个创建命令只写本地文件，不访问 Git 或网络，也不覆盖已有内容。
- 技术文章图片依赖外部图床，仓库不校验图片是否存在或变化。

## 统一发布流程（尚未切换生产）

私有内容仓将是唯一正式发布执行位置。内容仓 `main` 推送、源码仓 `main` 更新发出的跨仓通知，以及无新内容时的 `workflow_dispatch` 重试，都进入同一条工作流：开始时固定两仓最新主分支提交，用该版本组合校验并构建，成功后由 Wrangler 上传现有 Cloudflare Pages 项目。

当前生产仍由本仓库的 Pages 自动 Git 部署提供。准备阶段可以创建私有内容仓并上传工具发行包，但不要写入生产凭据、启用正式触发或关闭该自动部署。公开源码 CI 继续只使用 `tests/fixtures/content`。创作者说明见 `packages/content-tools/content-repo/README.md`。

创作者在内容仓使用：

```sh
npm run publish
npm run publish -- "发布 Go 并发笔记"
```

推送成功不等于上线。校验或构建失败时内容已保存在内容仓，网站保留上一次成功版本；修复后可再次 `publish`，没有新改动也不会制造空提交。工作流 `run-name` 为 `发布 <request_id 或内容提交>`。CLI 用它关联本次推送或重试，不把同提交上的历史成功任务当作本次结果。远端任务结果在 artifact `publish-result` 中，字段为：

| 字段         | 含义                              |
| ------------ | --------------------------------- |
| `contentSha` | 本次固定的内容仓提交              |
| `sourceSha`  | 本次固定的源码仓提交              |
| `stage`      | `validate`、`build` 或 `deploy`   |
| `status`     | `success`、`failure` 或 `skipped` |
| `url`        | 仅部署成功时的网站地址            |
| `error`      | 失败或跳过原因                    |

### 内容仓标识与凭据

在私有内容仓配置：

| 名称                    | 类型     | 用途                                       |
| ----------------------- | -------- | ------------------------------------------ |
| `SOURCE_REPO`           | variable | 公开源码仓，形如 `jasper0507/jaspers-blog` |
| `PAGES_PROJECT`         | variable | 现有 Cloudflare Pages 项目名               |
| `SITE_URL`              | variable | 正式网站地址，现为 `https://jasper0507.me` |
| `CLOUDFLARE_API_TOKEN`  | secret   | 仅部署步骤使用，需 Pages 上传权限          |
| `CLOUDFLARE_ACCOUNT_ID` | secret   | Cloudflare 账户                            |

内容仓工作流权限为 `contents: read` 与 `actions: write`。默认 `GITHUB_TOKEN` 可读取公开源码仓。跨仓通知令牌不放在内容仓。工作流在开始时用 `gh api repos/<仓>/commits/main` 固定两仓最新主分支提交。并发组 `site-publish` 取消未完成的旧任务；若仍有更新任务，构建成功也不会上传。

### 源码仓标识与凭据

在公开源码仓配置，供 `notify-content-publish.yml` 使用：

| 名称                     | 类型     | 用途                                                 |
| ------------------------ | -------- | ---------------------------------------------------- |
| `CONTENT_REPO`           | variable | 私有内容仓，形如 `jasper0507/blog-content`           |
| `CONTENT_DISPATCH_TOKEN` | secret   | 对内容仓有 `actions:write` 的 PAT 或 GitHub App 令牌 |

源码仓默认 `GITHUB_TOKEN` 不能访问私有内容仓。未配置上述两项时通知步骤跳过，公开 CI 仍只使用示例内容。

### 部署边界

- 校验与构建使用 `BLOG_CONTENT_DIR` 指向内容仓；缺少 `about.md`、内容子目录或有效号码计数器时失败，不回退到公开示例。
- 只有校验和构建成功才调用 Wrangler 上传现有 Pages 项目；失败不覆盖上一次成功网站。
- Cloudflare 凭据只出现在执行部署的内容仓作业环境，不写入仓库或结果 artifact。
- 正式切换生产时再写入上述标识与凭据，并关闭 Pages 自动 Git 部署；在此之前保持现有发布入口。

### 准备阶段交接

| 项           | 值                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 源码仓       | `jasper0507/jaspers-blog`                                                                                               |
| 私有内容仓   | `jasper0507/blog-content`                                                                                               |
| 工具包       | `@jasper-blog/content-tools@0.1.0`                                                                                      |
| 发行标签     | `content-tools-v0.1.0`                                                                                                  |
| 发行资源     | `https://github.com/jasper0507/jaspers-blog/releases/download/content-tools-v0.1.0/jasper-blog-content-tools-0.1.0.tgz` |
| 内容仓工作流 | 内容仓 `.github/workflows/publish.yml`（模板：`packages/content-tools/content-repo/`）                                  |
| 源码仓通知   | `.github/workflows/notify-content-publish.yml`                                                                          |
| 版本固定     | 内容仓 `pin-publish-versions.js`                                                                                        |

以下是待授权执行的准备配置，并非已完成的远端交付记录。开发者取得 Release 上传和私有建仓授权后，在源码仓执行：

```sh
node scripts/release-content-tools.mjs
node scripts/prepare-content-repo.mjs --content src/content --output ../blog-content --tarball-url https://github.com/jasper0507/jaspers-blog/releases/download/content-tools-v0.1.0/jasper-blog-content-tools-0.1.0.tgz --repo jasper0507/blog-content --apply
```

同版本发行包已存在时拒绝覆盖。准备脚本以当前文件快照复制技术文章、说说、「关于我」和号码计数器，不提取旧 Git 历史、不改写源码仓。依赖直接从固定发行地址安装并生成 lockfile；下载失败则报错，不回退到本地包。输出目录必须为空，避免覆盖已有写作改动。准备阶段关闭内容仓 Actions，不写入生产凭据。切换前若源码仓又有内容改动，必须再同步快照；生产凭据、旧入口关闭与最终同步留给切换任务。

## 日常发布

全部改动都在 `src/content/**` 时，作者使用 GitHub ruleset 的 bypass 直接发布：

```sh
npm run build
git status
git add -A
git commit -m "发布内容"
git push
```

修改页面、脚本、配置、依赖或 CI 时使用分支和 PR，不直接推送 `main`。PR 自动运行 `verify`（静态检查、领域测试、Chromium 完整场景和 Axe）与 `browser-smoke`（Firefox 核心场景），两项成功且分支基于最新 `main` 后才能合并。`main` 推送另运行不安装浏览器的 `build`。本地完整搜索需先 `npm run build`，再 `npm run preview`。

## 恢复

纯内容发布异常时，让 Git 继续作为唯一事实来源：

```sh
git revert <错误提交>
git push
```

Cloudflare 会从撤销提交重新构建。只有必须立即切回且来不及等待构建时，才使用 [Cloudflare Pages 历史部署回滚](https://developers.cloudflare.com/pages/configuration/rollbacks/)；随后仍需在 Git 中撤销错误提交，使代码与线上重新一致。

源码、配置、依赖或 CI 的撤销同样先创建 `git revert`，但必须通过 PR 合并，不使用内容发布 bypass。

首次上线后实际演练一次 Git 回滚。外部可用性监控由站点所有者另行维护，不进入本仓库。

## 字体

Source Serif 4、IBM Plex Sans、IBM Plex Mono 的拉丁字形与 Noto Sans SC 的中文分包自托管于 `public/fonts/`。构建产物不依赖 Google Fonts 等字体 CDN；维护时用 `npm run fonts:fetch` 重生中文分包。

字体更新期间暂停其他字体更新和站点构建。下载与校验完成后，命令成套替换中文分包与字体样式；普通错误会尝试恢复旧资源，回滚失败时保留并打印恢复目录。强杀进程或机器断电后的恢复由维护者结合 Git 与保留文件人工完成。新资源安装成功后若临时文件清理失败，命令仍视为成功并打印告警。

`npm run test:fonts` 同时检查已提交的字体资源和更新事务。事务测试使用真实临时目录与可控网络响应，覆盖成功更新、下载失败、替换失败和回滚失败，不访问字体下载网络。
