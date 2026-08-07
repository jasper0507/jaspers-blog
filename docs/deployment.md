# Cloudflare Pages 部署与日常发布

## 构建配置

- 正式分支：`main`
- 根目录：仓库根目录
- Node.js `22.16.0`（由 `.node-version` 固定）
- 包管理器：`npm`（使用仓库内 `package-lock.json`）
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：无
- 正式域名：`https://blog.jasper0507.cc.cd`

这些值遵循 Cloudflare 的 [Astro Pages 配置](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)；Node 版本由 Pages 支持的 [`.node-version`](https://developers.cloudflare.com/pages/configuration/build-image/) 文件读取。

## 所有者首次上线清单

1. 在 Cloudflare 控制台进入 **Workers & Pages**，创建 Pages 项目并授权读取私有 GitHub 仓库 `jasper0507/newblog`。
2. 选择 `main` 为正式分支，按上方配置保存并部署；构建日志应显示 Astro 静态构建成功，随后 Pagefind 索引数量与当前公开技术文章数量一致。
3. 在项目的 **Custom domains** 中选择 **Set up a domain**，输入 `blog.jasper0507.cc.cd` 并激活。必须先在 Pages 项目中关联域名；若 DNS 不在同一 Cloudflare 账户，再按向导添加指向项目 `<project>.pages.dev` 地址的 CNAME。详见 [Cloudflare 自定义域名文档](https://developers.cloudflare.com/pages/configuration/custom-domains/)。
4. 等待域名状态变为 **Active**，然后执行：

   ```sh
   curl --fail --silent --show-error --location https://blog.jasper0507.cc.cd/
   curl --fail --silent --show-error https://blog.jasper0507.cc.cd/rss.xml
   curl --fail --silent --show-error https://blog.jasper0507.cc.cd/sitemap.xml
   curl --fail --silent --show-error https://blog.jasper0507.cc.cd/pagefind/pagefind.js
   ```

本仓库和构建不需要 Cloudflare 凭据；账户授权与域名激活仅由所有者在控制台完成。

## 日常发布

- 技术文章：在 `src/content/posts/<ascii-slug>.md` 创建或编辑 Markdown；文件名只使用小写英文、数字与短横线，并直接决定公开网址。重命名会改变网址，不保留旧网址或重定向。
- 图片：技术文章图片使用外部图床；仓库不校验图片是否存在或内容是否变化。
- 说说：运行 `npm run new:shuoshuo`，再编辑生成的 Markdown。
- 发布：运行 `npm run build`，然后提交并推送到 `main`。
- 本地验收搜索：须先 `npm run build`（生成 Pagefind 索引），再 `npm run preview`；`npm run dev` 下索引可能不完整。
- 字体：Noto / Source Serif / IBM Plex 均自托管于 `public/fonts/`，构建产物不得依赖 Google Fonts 等 CDN。若需更新 Noto 分包，运行 `npm run fonts:fetch` 后提交生成的 woff2 与 `src/styles/fonts.css`。
