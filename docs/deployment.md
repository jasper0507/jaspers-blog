# Cloudflare Pages 部署与日常发布

## 构建配置

- 正式分支：`main`
- 根目录：仓库根目录
- Node.js `24.19.0`（由 `.node-version` 固定）
- 包管理器：`npm`（使用仓库内 `package-lock.json`）
- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：无
- 正式域名：`https://jasper0507.me`

这些值遵循 Cloudflare 的 [Astro Pages 配置](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)；Node 版本由 Pages 支持的 [`.node-version`](https://developers.cloudflare.com/pages/configuration/build-image/) 文件读取。

## 所有者首次上线清单

1. 在 Cloudflare 控制台进入 **Workers & Pages**，创建 Pages 项目并授权读取私有 GitHub 仓库 `jasper0507/jaspers-blog`。
2. 选择 `main` 为正式分支，按上方配置保存并部署；构建日志应显示 Astro 静态构建成功，随后 Pagefind 索引数量与当前公开技术文章数量一致。
3. 在项目的 **Custom domains** 中选择 **Set up a domain**，输入 `jasper0507.me` 并激活。必须先在 Pages 项目中关联域名；若 DNS 不在同一 Cloudflare 账户，再按向导添加指向项目 `<project>.pages.dev` 地址的 CNAME。详见 [Cloudflare 自定义域名文档](https://developers.cloudflare.com/pages/configuration/custom-domains/)。
4. 等待域名状态变为 **Active**，然后执行：

   ```sh
   curl --fail --silent --show-error --location https://jasper0507.me/
   curl --fail --silent --show-error https://jasper0507.me/rss.xml
   curl --fail --silent --show-error https://jasper0507.me/sitemap-index.xml
   curl --fail --silent --show-error https://jasper0507.me/pagefind/pagefind.js
   ```

本仓库和构建不需要 Cloudflare 凭据；账户授权与域名激活仅由所有者在控制台完成。

## 日常发布

- 技术文章：运行 `npm run new:post -- <slug>` 创建 Markdown；路径名只使用小写 ASCII 字母、数字与短横线且不带扩展名。命令不会覆盖同名文章；文件名直接决定公开网址，重命名不会保留旧网址或重定向。
- 文章时间：创建命令自动填写当前上海时间；`publishedAt` 只接受加引号的完整字符串 `"YYYY-MM-DDTHH:mm:ss+08:00"`，文章不维护 `updatedAt`。标题、摘要或正文未完成时构建失败。
- 设置图片：浏览器图标必须为 1:1，优先方形 SVG，PNG/ICO 至少提供 32×32 表示；亮暗主视觉均为 3:2，推荐 960×640 或更高且尺寸、主体位置一致，非 3:2 图片居中裁切且不拉伸。
- 图片：技术文章图片使用外部图床；仓库不校验图片是否存在或内容是否变化。
- 说说：运行 `npm run new:shuoshuo`，再编辑生成的 Markdown。
- 发布：在 `main` 上运行 `npm run publish -- "<commit message>"`；提交信息必填且会原样作为完整 Git commit message。创建和发布命令都会先快进对齐 `origin/main`。
- 发布顺序：对齐 → 完整 `npm test` → `git add -A` 并创建单个提交 → 推送到 `origin/main`。推送失败则软撤本次提交。格式检查不会改写文件。
- 发布快照：tracked 修改与删除、未忽略的新文件都会进入同一提交，因此技术文章、说说、博客设置和文档可一并发布；`draft` 是内容是否进入公开站点的唯一开关。
- 失败处理：参数为空、分支不是 `main`、没有改动或缺少 `origin` 时命令不推送；校验或构建失败时也不创建提交。命令只允许快进拉取，不会 merge、rebase、stash、force-push 或调用 Cloudflare API。
- 远程冲突：若历史分叉或快进会覆盖未保存文件，命令停下且不创建提交。若检查通过但推送失败，撤掉刚才那一次提交，文件仍在本地，可再发布。
- 本地验收搜索：须先 `npm run build`（生成 Pagefind 索引），再 `npm run preview`；`npm run dev` 下索引可能不完整。
- 字体：Noto / Source Serif / IBM Plex 均自托管于 `public/fonts/`，构建产物不得依赖 Google Fonts 等 CDN。若需更新 Noto 分包，运行 `npm run fonts:fetch` 后提交生成的 woff2 与 `src/styles/fonts.css`。
