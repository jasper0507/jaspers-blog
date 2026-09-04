# Jasper's Blog 📝

![Jasper's Blog](public/images/hero-light.jpg)

[![Astro](https://img.shields.io/badge/Astro-7.1.6-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pagefind](https://img.shields.io/badge/Search-Pagefind-FFB400?style=for-the-badge)](https://pagefind.app/)

一个以技术文章为核心、以说说承载轻量表达的中文个人网站。项目使用 Astro 生成静态页面，内容随 Git 推送到 Cloudflare Pages；站内搜索、标签、归档、RSS 与站点地图都在构建时生成。

访问 [Jasper's Blog](https://jasper0507.me/)，或查看[更新日志](CHANGELOG.md)。

## 🔥 Features

- [x] 技术文章与说说两种内容类型；两者都使用创建后不变的独立详情页网址
- [x] 基于 Astro Content Collections 的内容校验与草稿过滤；`draft` 是唯一公开开关
- [x] 集中配置博客身份、公开联系方式、首页主视觉、浏览器图标与页脚文本
- [x] 响应式布局、亮色/暗色主题（首次跟随系统，选择写入本地），以及键盘可访问的导航与搜索
- [x] Pagefind 弹层搜索：`/` 打开，只索引已发布技术文章；没有技术文章时不生成索引或搜索界面
- [x] 文章标签、按年归档；宽屏文章目录，长文可回到顶部
- [x] RSS（技术文章摘要 + 说说摘要）、Sitemap、Canonical URL、Open Graph 文本与结构化数据
- [x] GFM、`==高亮==`、KaTeX、中文脚注，以及带文件名 / 行高亮 / diff 的 Shiki 代码块
- [x] 拉丁字体与中文思源黑自托管，不依赖运行时字体 CDN
- [x] 技术文章与说说创建命令；原始 Git 推送触发 Cloudflare Pages 发布
- [x] GitHub Actions：PR 运行完整 Chromium/Axe 验证与 Firefox/WebKit 冒烟，`main` 推送复核构建

## 🚀 项目结构

```text
/
├── docs/                   # 部署说明、架构决策记录与调研
├── public/
│   ├── fonts/              # 自托管拉丁字体与 Noto Sans SC 分包
│   └── images/             # 站点主视觉与现有图片
├── scripts/                # 内容创建、搜索索引与领域验收脚本
├── src/
│   ├── components/         # 正文、目录、标签与回到顶部
│   ├── content/
│   │   ├── about.md           # 「关于我」正文
│   │   ├── post-next-id.json  # 技术文章号码计数器（不要手改）
│   │   ├── posts/             # 技术文章 Markdown
│   │   └── shuoshuo/          # 说说 Markdown
│   ├── layouts/            # 页面公共布局
│   ├── lib/                # 内容查询与领域规则
│   ├── pages/              # 页面与 XML 路由
│   ├── styles/             # 全局、文章与说说样式
│   └── content.config.ts   # Content Collections 数据结构
├── tests/
│   ├── fixtures/           # 构建验收用内容
│   └── site/               # Playwright 整站验收用例
├── blog.config.ts          # 博客设置的唯一日常入口
├── astro.config.mjs        # Astro、Markdown 与代码高亮配置
├── pagefind.yml            # 搜索索引排除规则（公式）
├── playwright.config.ts    # 站点验收配置
├── playwright.smoke.config.ts # Firefox / WebKit 核心冒烟配置
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

## ✍️ 日常使用

### 通用流程

内容改动可以在 `main` 上创建并直接发布；源码、配置、依赖和 CI 改动必须使用 PR。

1. 按下方说明创建技术文章、说说，或修改博客设置。
2. 运行 `npm run dev`，打开 `http://localhost:4321` 检查页面。验收完整搜索时先停止开发服务器，再运行 `npm run build` 和 `npm run preview`；搜索入口是导航放大镜，焦点不在输入框时按 `/` 也可打开。
3. 确认内容的 `draft`：`false` 会出现在本地预览并随下一次站点发布公开，`true` 会从页面、搜索、RSS 和站点地图中排除；草稿仍须填写完整字段和正文。
4. 纯 `src/content/**` 改动运行 `npm run build` 后可直接推送；其他改动提交 PR，等待 `verify` 与 `browser-smoke` 通过后合并。

### 发布技术文章

运行项目命令创建技术文章；只提供标题（有空格时加引号）。公开网址由系统分配数字稳定 ID，不必也不允许指定号码：

```sh
npm run new:post -- "深度学习笔记"
```

命令会把标题写入模板，按标题生成 `src/content/posts/深度学习笔记.md`（去掉文件系统非法字符），并分配 `/posts/1/` 这类网址。同名文件不会被覆盖；创建失败时不会占用号码。改标题不会改文件名或网址。

```md
---
title: "深度学习笔记"
description: "用于列表、搜索与页面元信息的简短摘要。"
publishedAt: "2026-08-11T10:00:00+08:00"
tags:
  - "Astro"
  - "前端开发"
draft: true
# 禁止修改
id: 1
---

从这里开始写正文。
```

- 模板自动填写标题、当前上海时间、`tags: []`、`draft: false` 和系统分配的 `id`；摘要与正文留空，补完前构建会失败。
- `title`、`description`、`publishedAt`、`draft`、`id` 必填；文章不维护更新时间，`updatedAt` 和其他未知字段会使构建失败。
- `id` 是正整数稳定身份，由创建命令写入；模板在该字段上方注明「禁止修改」。计数器文件 `src/content/post-next-id.json` 也不要手改。
- `tags` 可省略或留空，同一篇文章内标签不得重复，也不需要预先登记。不同标签若生成相同网址，构建会失败（草稿也参与检查）。
- `publishedAt` 必须是加引号的有效上海时间字符串 `"YYYY-MM-DDTHH:mm:ss+08:00"`；未加引号的 YAML 日期值、UTC `Z` 和其他时区均无效。
- `draft: true` 不进入公开页面；准备发布时改为 `false`。发布时间只用于显示和排序，不提供定时发布。数字网址也不是发布时间顺序。
- 正文不能为空。文章图片使用外部图床，并以普通 Markdown 图片语法引用。
- 正文可用 GFM（表格、任务列表、删除线、自动链接、脚注）、`==高亮==`、`$...$` / `$$...$$` 公式和原生 `<details>`。代码块支持 `title="file.js"`、行高亮与 diff 标记。代码与行内代码中的 `==` 保持原样。
- 保存后按通用流程预览；准备公开时确认 `draft: false`，再构建并用原始 Git 命令发布。

### 发布说说

运行命令创建带上海时间稳定 ID 的说说：

```sh
npm run new:shuoshuo
```

命令会生成 `src/content/shuoshuo/YYYYMMDD-HHmmss.md`。文件名形成 `/shuoshuo/YYYYMMDD-HHmmss/` 独立详情页网址，创建后不要重命名。编辑生成的文件：

```md
---
publishedAt: "2026-08-14T12:00:00+08:00"
draft: false
---

今天完成了博客的日常发布流程。
```

- 说说没有作者标题；时间流保留摘要折叠，独立详情页始终显示完整 Markdown。
- 可以只有文字、只有 Markdown 图片，或两者都有。摘要从 Markdown AST 的普通文本和图片节点自动投影，最多 80 个用户感知字符；图片用 `[1 Image]`、`[N Images]` 计数并默认在折叠状态隐藏。
- 代码、公式和原生 HTML 不单独参与摘要投影；只有这些节点、且没有普通文本或图片的说说会使构建失败。
- 说说只允许 `publishedAt` 和 `draft` 两个字段；标题、摘要、标签等额外字段会使构建失败。
- `publishedAt` 和文件名由命令按当前上海时间生成；可修改发布时间，但不要修改稳定 ID。发布时间格式要求与技术文章相同。同一秒内重复创建会因文件已存在而失败，下一秒重试即可。
- 想暂不公开时改为 `draft: true`；准备公开时恢复为 `false`，再按通用流程预览和发布。
- RSS 收录说说摘要，不含完整正文；说说不进入站内搜索、标签或归档。

### 更新博客设置

个性化博客只需打开根目录 [`blog.config.ts`](blog.config.ts)。页面、RSS、Canonical URL、Open Graph、结构化数据和站点地图共用这份设置。

配置只服务当前博客：站点名称、页头短名、正式网址、简介、图标、作者联系方式、亮暗主视觉和页脚文本都必须填写。TypeScript 检查字段形状；正式网址必须是没有子路径、查询或锚点的 HTTPS 根地址，本地图片和图标必须存在，浏览器图标只支持 SVG、PNG 或 ICO。页脚文本只支持 `{year}`、`{author}` 两个替换符。设置值按填写内容使用，不自动裁剪；错误由 TypeScript、`URL`、文件系统或构建直接报告。

不适合放进设置文件的内容使用固定位置：

- “关于我”正文：[`src/content/about.md`](src/content/about.md)，可以留空但不能删除。
- 首页主视觉：[`public/images/`](public/images/)，在设置文件中填写以 `/images/` 开头的路径。亮暗主视觉均使用 3:2，推荐 960×640 或更高且尺寸、主体位置一致，非 3:2 图片会居中裁切而不拉伸。
- 浏览器图标：推荐 [`public/favicon.svg`](public/favicon.svg)；也可以指向 `public/` 内其它 svg、png、ico，并在设置文件填写对应根相对路径。必须为 1:1，优先方形 SVG，PNG/ICO 至少提供 32×32 表示。

修改博客设置后按通用流程预览并通过 PR 发布。Cloudflare Pages 使用 `npm run build` 和 `dist`，完整操作见 [Cloudflare Pages 部署与日常发布](docs/deployment.md)。

### 站点发布

纯内容改动在 `main` 上确认 `draft` 后，先构建，再使用原始 Git 命令发布：

```sh
npm run build
git status
git add -A
git commit -m "发布新的技术文章"
git push
```

普通内容发布只需生产构建，不运行 Playwright。修改页面、脚本、配置、依赖或 CI 时在分支上提交 PR；GitHub Actions 自动运行 `verify` 与 `browser-smoke`。推送或合并到 `main` 后，`build` 工作流与 Cloudflare Pages 都会构建；若线上版本有问题，执行 `git revert <错误提交>` 再推送。

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

开发服务器默认位于 `http://localhost:4321`。要检查生产构建和完整搜索：

```sh
npm run build
npm run preview
```

源码与内容仓库公开；`draft` 不是保密机制，敏感内容不得提交。构建产物不得依赖 Google Fonts 等第三方字体 CDN。

## 🧞 Commands

所有命令均在项目根目录执行。

| 命令                           | 作用                                               |
| :----------------------------- | :------------------------------------------------- |
| `npm ci`                       | 按 `package-lock.json` 安装依赖                    |
| `npm run dev`                  | 启动本地开发服务器                                 |
| `npm run build`                | 构建静态站点，并为已发布技术文章生成 Pagefind 索引 |
| `npm run preview`              | 本地预览 `dist` 生产构建                           |
| `npm run check`                | 运行 Astro 与 TypeScript 检查                      |
| `npm run format`               | 使用 Prettier 格式化项目文件                       |
| `npm run format:check`         | 检查项目文件格式，不修改文件                       |
| `npm test`                     | 运行格式、类型、领域不变量和 Chromium 高层验收     |
| `npm run test:browser-smoke`   | 运行 Firefox 与 WebKit 核心交互冒烟                |
| `npm run new:post -- "<标题>"` | 按标题创建技术文章 Markdown，并分配数字网址        |
| `npm run new:shuoshuo`         | 创建带上海时间稳定 ID 的说说 Markdown              |

## ✨ Feedback & Suggestions

发现缺陷或希望提出功能建议，请在 [GitHub Issues](https://github.com/jasper0507/jaspers-blog/issues) 新建 Issue；内容相关反馈也可以发送邮件至 [jasper0507.self@gmail.com](mailto:jasper0507.self@gmail.com)。
