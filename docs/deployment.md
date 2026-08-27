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

1. 在 Cloudflare **Workers & Pages** 中创建 Pages 项目，授权私有仓库 `jasper0507/jaspers-blog`。
2. 选择 `main`，填写上方构建配置并部署。
3. 在 **Custom domains** 中关联 `jasper0507.me`。若 DNS 不在同一 Cloudflare 账户，按[自定义域名指南](https://developers.cloudflare.com/pages/configuration/custom-domains/)配置 CNAME。
4. 域名变为 **Active** 后执行：

   ```sh
   curl --fail --silent --show-error --location https://jasper0507.me/
   curl --fail --silent --show-error https://jasper0507.me/rss.xml
   curl --fail --silent --show-error https://jasper0507.me/sitemap-index.xml
   curl --fail --silent --show-error https://jasper0507.me/pagefind/pagefind.js
   ```

仓库和构建不保存 Cloudflare 凭据；账户授权与域名由所有者在控制台维护。

## 创建内容

- 技术文章：`npm run new:post -- "<标题>"`。命令分配冻结的数字网址并更新 `src/content/post-next-id.json`；不要手改 `id` 或计数器。
- 说说：`npm run new:shuoshuo`。命令按上海时间创建稳定 ID。
- 两个创建命令只写本地文件，不访问 Git 或网络，也不覆盖已有内容。
- 技术文章图片依赖外部图床，仓库不校验图片是否存在或变化。

## 日常发布

普通文章或说说只运行生产构建：

```sh
npm run build
git status
git add -A
git commit -m "发布内容"
git push
```

修改页面、脚本或依赖时，在提交前额外运行 `npm test`。推送后在 Cloudflare Pages 确认部署成功；本地完整搜索需先 `npm run build`，再 `npm run preview`。

## 恢复

线上版本异常时，让 Git 继续作为唯一事实来源：

```sh
git revert <错误提交>
git push
```

Cloudflare 会从撤销提交重新构建。只有必须立即切回且来不及等待构建时，才使用 [Cloudflare Pages 历史部署回滚](https://developers.cloudflare.com/pages/configuration/rollbacks/)；随后仍需在 Git 中撤销错误提交，使代码与线上重新一致。

首次上线后实际演练一次 Git 回滚。外部可用性监控由站点所有者另行维护，不进入本仓库。

## 字体

Source Serif 4、IBM Plex Sans 和 IBM Plex Mono 的拉丁字形自托管于 `public/fonts/`；中文使用系统字体回退。构建产物不依赖 Google Fonts 等字体 CDN。
