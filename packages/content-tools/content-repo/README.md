# 内容仓发布接入

本目录是私有内容仓的最小模板，复制到内容仓根目录：

- `package.json`、`.gitignore`
- `pin-publish-versions.js`
- `.github/workflows/publish.yml`
- 本说明

本任务不创建真实私有仓、不写入生产凭据、不启用正式触发，也不关闭现有 Pages 自动 Git 部署。

## 创作者命令

工具依赖由开发者在建仓时写入 `package.json` 并生成 lockfile。创作者随后：

```sh
npm ci
npm run new:post -- "文章标题"
npm run new:shuoshuo
npm run publish
npm run publish -- "发布 Go 并发笔记"
```

`publish` 只提交写作内容与号码计数器，然后等待内容仓的 `发布网站` 工作流。已有未推送内容提交会继续推送；无新改动时重新触发同一工作流。推送失败或远端超前时保留本地提交，不强推。远端任务结果在 artifact `publish-result` 中，字段为：

| 字段         | 含义                              |
| ------------ | --------------------------------- |
| `contentSha` | 本次固定的内容仓提交              |
| `sourceSha`  | 本次固定的源码仓提交              |
| `stage`      | `validate`、`build` 或 `deploy`   |
| `status`     | `success`、`failure` 或 `skipped` |
| `url`        | 仅部署成功时的网站地址            |
| `error`      | 失败或跳过原因                    |

工作流 `run-name` 为 `发布 <request_id 或内容提交>`。CLI 用它关联本次推送或重试，不把同提交上的历史成功任务当作本次结果。

## 内容仓标识与凭据

在私有内容仓配置：

| 名称                    | 类型     | 用途                                       |
| ----------------------- | -------- | ------------------------------------------ |
| `SOURCE_REPO`           | variable | 公开源码仓，形如 `jasper0507/jaspers-blog` |
| `PAGES_PROJECT`         | variable | 现有 Cloudflare Pages 项目名               |
| `SITE_URL`              | variable | 正式网站地址，现为 `https://jasper0507.me` |
| `CLOUDFLARE_API_TOKEN`  | secret   | 仅部署步骤使用，需 Pages 上传权限          |
| `CLOUDFLARE_ACCOUNT_ID` | secret   | Cloudflare 账户                            |

内容仓工作流权限为 `contents: read` 与 `actions: write`（列出本仓任务、上传结果 artifact）。默认 `GITHUB_TOKEN` 可读取公开源码仓。跨仓通知令牌不放在内容仓。

工作流在开始时用 `gh api repos/<仓>/commits/main` 固定两仓最新主分支提交，后续检出、校验、构建和上传都使用这一对提交。并发组 `site-publish` 取消未完成的旧任务；若仍有更新任务，构建成功也不会上传。

## 源码仓标识与凭据

在公开源码仓配置，供 `notify-content-publish.yml` 使用：

| 名称                     | 类型     | 用途                                                 |
| ------------------------ | -------- | ---------------------------------------------------- |
| `CONTENT_REPO`           | variable | 私有内容仓，形如 `owner/blog-content`                |
| `CONTENT_DISPATCH_TOKEN` | secret   | 对内容仓有 `actions:write` 的 PAT 或 GitHub App 令牌 |

源码仓默认 `GITHUB_TOKEN` 不能访问私有内容仓。未配置上述两项时通知步骤跳过，公开 CI 仍只使用示例内容，也不读取私有文章。

## 部署边界

- 校验与构建使用 `BLOG_CONTENT_DIR` 指向内容仓；缺少 `about.md`、内容子目录或有效号码计数器时失败，不回退到公开示例。
- 只有校验和构建成功才调用 Wrangler 上传现有 Pages 项目；失败不覆盖上一次成功网站。
- Cloudflare 凭据只出现在执行部署的内容仓作业环境，不写入仓库或结果 artifact。
- 正式切换生产时再写入上述标识与凭据，并关闭 Pages 自动 Git 部署；在此之前保持现有发布入口。
