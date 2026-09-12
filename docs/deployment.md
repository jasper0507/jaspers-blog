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
