# Jasper's Blog 📝

![Jasper's Blog](public/images/hero/campus.jpg)

[![Astro](https://img.shields.io/badge/Astro-7.1.6-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pagefind](https://img.shields.io/badge/Search-Pagefind-FFB400?style=for-the-badge)](https://pagefind.app/)

一个以技术文章为核心、以说说承载轻量表达的中文个人网站。项目使用 Astro 生成静态页面，私有内容仓统一构建并上传现有 Cloudflare Pages 项目；站内搜索、标签、归档、RSS 与站点地图都在构建时生成。

访问 [Jasper's Blog](https://jasper0507.me/)。

## 🔥 Features

- [x] 技术文章与说说两种内容类型；两者都使用创建后不变的独立详情页网址
- [x] 基于 Astro Content Collections 的内容校验与草稿过滤；`draft` 是唯一公开开关
- [x] 集中配置博客身份、公开联系方式、首页主句、浏览器图标与页脚文本；主视觉照片放在固定目录
- [x] 响应式布局、亮色/暗色主题（首次跟随系统，选择写入本地），以及键盘可访问的导航与搜索
- [x] Pagefind 弹层搜索：`/` 打开，只索引已发布技术文章；没有技术文章时不生成索引或搜索界面
- [x] 文章标签、按年归档；宽屏文章目录，长文可回到顶部
- [x] RSS（技术文章摘要 + 说说摘要）、Sitemap、Canonical URL、Open Graph 文本与结构化数据
- [x] GFM、`==高亮==`、KaTeX、中文脚注，以及带文件名 / 行高亮 / diff 的 Shiki 代码块
- [x] 拉丁字体与中文思源黑自托管，不依赖运行时字体 CDN
- [x] 轻量创建与发布工具；内容推送与源码合并均触发内容仓统一发布
- [x] GitHub Actions：PR 运行完整 Chromium/Axe 验证与 Firefox 冒烟，`main` 推送复核构建

## 🚀 项目结构

```text
/
├── docs/                   # 部署说明、架构决策记录与调研
├── public/
│   ├── fonts/              # 自托管拉丁字体与 Noto Sans SC 分包
│   └── images/hero/        # 首页主视觉照片，丢入 jpg 即可
├── packages/
│   └── content-tools/      # 可独立安装的内容创建与发布工具、工作流模板及共享领域规则
├── scripts/                # 工具发行、发布编排、搜索索引与领域验收脚本
├── src/
│   ├── components/         # 正文、标签、搜索与技术文章阅读
│   ├── layouts/            # 页面公共布局
│   ├── lib/                # 内容查询与网站侧规则
│   ├── pages/              # 页面与 XML 路由
│   ├── styles/             # 全局、文章、说说与搜索样式
│   └── content.config.ts   # Content Collections 数据结构
├── tests/
│   ├── fixtures/           # 公开示例内容（含关于我与计数器）
│   └── site/               # 站点验收用例
├── blog.config.ts          # 博客设置的唯一日常入口
├── astro.config.mjs        # Astro、Markdown 与代码高亮配置
├── pagefind.yml            # 搜索索引排除规则（公式）
├── playwright.config.ts    # 站点验收配置
├── playwright.smoke.config.ts # Firefox 核心冒烟配置
├── package.json            # 依赖与命令
└── tsconfig.json           # TypeScript 严格模式
```

### 公开页面

| 路径             | 内容                                           |
| :--------------- | :--------------------------------------------- |
| `/`              | 首页：主视觉、最近 1 篇技术文章、最近 1 条说说 |
| `/archives/`     | 按年归档全部已发布技术文章                     |
| `/tags/`         | 标签云                                         |
| `/tags/:slug/`   | 该标签下的技术文章                             |
| `/posts/:id/`    | 技术文章正文，`:id` 为创建时分配的稳定数字     |
| `/shuoshuo/`     | 说说时间流                                     |
| `/shuoshuo/:id/` | 单条说说详情页，`:id` 为创建时冻结的稳定 ID    |
| `/about/`        | 关于我                                         |
| `/rss.xml`       | RSS：技术文章摘要与说说摘要，不含草稿          |

`/posts` 重定向到归档；旧搜索页 `/search` 重定向到首页。导航是「文章」（归档 / 标签）· 说说 · 关于 · 搜索放大镜。

## ✍️ 写作与网站维护

技术文章、说说、「关于我」正文和号码计数器由私有内容仓维护。创作者只需克隆内容仓、`npm ci` 安装锁定工具，并使用创建与发布命令；详见[创作者说明](packages/content-tools/content-repo/README.md)。网站升级不要求创作者同步源码或更新工具。

源码仓维护网站与工具，开发、默认构建和 CI 均使用公开示例内容。修改后提交 PR，等待 `verify` 与 `browser-smoke` 通过再合并；源码主分支更新通知私有内容仓发布。正式部署由内容仓统一执行，切换步骤及实际状态见[部署说明](docs/deployment.md)。

### 更新博客设置

个性化博客只需打开根目录 [`blog.config.ts`](blog.config.ts)。页面、RSS、Canonical URL、Open Graph、结构化数据和站点地图共用这份设置。

配置只服务当前博客：站点名称、页头短名、正式网址、简介、图标、作者联系方式、首页主句、主视觉替代文本和页脚文本都必须填写。TypeScript 检查字段形状；正式网址必须是没有子路径、查询或锚点的 HTTPS 根地址，本地图标必须存在，浏览器图标只支持 SVG、PNG 或 ICO。页脚文本只支持 `{year}`、`{author}` 两个替换符。设置值按填写内容使用，不自动裁剪；错误由 TypeScript、`URL`、文件系统或构建直接报告。

不适合放进设置文件的内容使用固定位置：

- “关于我”正文：私有内容仓的 `about.md`，可以留空但不能删除。
- 首页主视觉照片：[`public/images/hero/`](public/images/hero/)。只接受 `.jpg`，必须是 3:2（允许 1 像素误差）且至少 960×640；空目录、其它扩展名或不合格尺寸会使构建失败。增删就是加减文件。亮暗主题共用这一池，首页每次刷新随机展示一张；无脚本时使用文件名排序后的第一张。
- 浏览器图标：推荐 [`public/favicon.svg`](public/favicon.svg)；也可以指向 `public/` 内其它 svg、png、ico，并在设置文件填写对应根相对路径。必须为 1:1，优先方形 SVG，PNG/ICO 至少提供 32×32 表示。

修改博客设置后本地预览并通过 PR 发布，完整操作见[部署说明](docs/deployment.md)。

## 💻 技术栈

| 用途           | 技术                                                                                 |
| :------------- | :----------------------------------------------------------------------------------- |
| 框架与静态生成 | [Astro](https://astro.build/) 7，静态输出                                            |
| 类型检查       | [TypeScript](https://www.typescriptlang.org/) + Astro Check                          |
| 内容           | Markdown + Astro Content Collections                                                 |
| Markdown       | [Sätteri](https://docs.astro.build/en/guides/markdown-content/)（GFM、KaTeX）+ Shiki |
| 样式           | Tailwind CSS 4、原生 CSS 与 CSS Custom Properties                                    |
| 搜索           | [Pagefind](https://pagefind.app/) 弹层，仅已发布技术文章                             |
| 格式化         | [Prettier](https://prettier.io/)                                                     |
| 验收           | [Playwright Test](https://playwright.dev/)                                           |
| 部署           | [Cloudflare Pages](https://pages.cloudflare.com/)                                    |

## 👨🏻‍💻 本地运行

需要 Node.js `24.19.0`（最低 `24.11.0`）和 npm。首次运行：

```sh
git clone git@github.com:jasper0507/jaspers-blog.git
cd jaspers-blog
npm ci
npm run dev
```

开发、默认构建均使用 `tests/fixtures/content`，无需私有仓读取凭据。开发服务器默认位于 `http://localhost:4321`。要检查生产构建和完整搜索：

```sh
npm run build
npm run preview
```

源码仓公开、内容仓私有；原公开 Git 历史仍可读取。`draft` 控制网站发布，已公开页面仍可访问。构建产物不得依赖 Google Fonts 等第三方字体 CDN。

## 🧞 Commands

所有命令均在项目根目录执行。

| 命令                         | 作用                                               |
| :--------------------------- | :------------------------------------------------- |
| `npm ci`                     | 按 `package-lock.json` 安装依赖                    |
| `npm run dev`                | 启动本地开发服务器                                 |
| `npm run build`              | 构建静态站点，并为已发布技术文章生成 Pagefind 索引 |
| `npm run preview`            | 本地预览 `dist` 生产构建                           |
| `npm run check`              | 运行 Astro 与 TypeScript 检查                      |
| `npm run format`             | 使用 Prettier 格式化项目文件                       |
| `npm run format:check`       | 检查项目文件格式，不修改文件                       |
| `npm test`                   | 运行格式、类型、领域不变量和 Chromium 高层验收     |
| `npm run test:browser-smoke` | 运行 Firefox 核心交互冒烟                          |

## ✨ Feedback & Suggestions

发现缺陷或希望提出功能建议，请在 [GitHub Issues](https://github.com/jasper0507/jaspers-blog/issues) 新建 Issue；内容相关反馈也可以发送邮件至 [jasper0507.self@gmail.com](mailto:jasper0507.self@gmail.com)。

## 独立内容来源

网站通过 `BLOG_CONTENT_DIR` 选择包含 `posts/`、`shuoshuo/`、`about.md` 和 `post-next-id.json` 的完整内容目录。内容子目录可以为空，关于我可以为空但必须存在，号码计数器必须大于所有既有文章 ID。

`npm run dev`、`npm run build`、类型检查与公开 CI 固定使用公开示例。生产工作流显式选择私有内容仓并运行 `scripts/publish-site.mjs`，来源缺失直接失败。维护者若需要单独验证一个完整目录，可运行：

```sh
BLOG_CONTENT_DIR=/absolute/path/to/content npm run build:content
```

真实内容不再由源码仓跟踪。旧工作区可能仍有被忽略的 `src/content/` 副本；它不参与构建，也不是写作入口。迁移保留稳定 ID 和计数器，不改写历史。工具发行与部署配置见[维护说明](docs/deployment.md)。
