# Jasper's Blog 📝

![Jasper's Blog](public/images/hero-light.svg)

[![Astro](https://img.shields.io/badge/Astro-7.1.6-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pagefind](https://img.shields.io/badge/Search-Pagefind-FFB400?style=for-the-badge)](https://pagefind.app/)

一个以技术文章为核心、以说说承载轻量表达的中文个人网站。项目使用 Astro 生成静态页面，内置全文搜索、标签、归档、RSS 与站点地图，可部署到 Cloudflare Pages。

访问 [Jasper's Blog](https://blog.jasper0507.cc.cd/)。

## 🔥 Features

- [x] 技术文章与说说两种内容类型
- [x] 基于 Astro Content Collections 的内容校验与草稿过滤
- [x] 集中配置博客身份、公开联系方式、首页主视觉、浏览器图标与页脚文本
- [x] 响应式布局、亮色/暗色主题，以及键盘可访问的导航与搜索
- [x] Pagefind 静态全文搜索
- [x] 文章标签、按年归档及自动目录
- [x] RSS、Sitemap、Canonical URL、Open Graph 与结构化数据
- [x] GFM、KaTeX 数学公式、提示块及 Shiki 代码高亮
- [x] 自托管中西文字体，不依赖运行时字体 CDN
- [x] 技术文章与说说创建命令，以及面向 Cloudflare Pages 的一键站点发布

## 🚀 项目结构

```text
/
├── docs/                   # 部署说明与架构决策记录
├── public/
│   ├── fonts/              # 自托管字体
│   └── images/             # 站点主视觉与现有图片
├── scripts/                # 内容创建、字体更新与验收脚本
├── src/
│   ├── components/         # 文章目录、标签等组件
│   ├── content/
│   │   ├── posts/          # 技术文章 Markdown
│   │   └── shuoshuo/       # 说说 Markdown
│   ├── layouts/            # 页面公共布局
│   ├── lib/                # 内容查询与领域规则
│   ├── pages/              # 页面与 XML 路由
│   ├── styles/             # 全局、文章与说说样式
│   └── content.config.ts   # Content Collections 数据结构
├── tests/
│   ├── fixtures/          # 构建验收用内容
│   └── site/              # Playwright 整站验收用例
├── blog.config.ts          # 博客设置的唯一日常入口
├── astro.config.mjs        # Astro、Markdown 与代码高亮配置
├── package.json            # 依赖与命令
└── tsconfig.json           # TypeScript 严格模式
```

## ✍️ 日常使用

### 通用流程

每次开始编辑前先同步正式分支；命令只接受快进，不会自动创建合并提交：

```sh
git switch main
git pull --ff-only origin main
```

1. 按下方说明创建技术文章、说说，或修改博客设置。
2. 运行 `npm run dev`，打开 `http://localhost:4321` 检查页面。验收完整搜索时先停止开发服务器，再运行 `npm run build` 和 `npm run preview`。
3. 确认内容的 `draft`：`false` 会出现在本地预览并随下一次站点发布公开，`true` 会从页面、搜索、RSS 和站点地图中排除；草稿仍须填写完整字段和正文。
4. 确认工作树中的全部改动都应该进入同一发布快照，然后运行 `npm run publish -- "<完整提交信息>"`。命令会自行完成校验、生产构建、提交和推送。

### 发布技术文章

运行项目命令创建技术文章；参数只写由小写 ASCII 字母、数字和短横线组成的路径名，不带扩展名：

```sh
npm run new:post -- my-first-post
```

命令会安全创建 `src/content/posts/my-first-post.md`，且不会覆盖同名文章或自动追加编号。文件名会生成 `/posts/my-first-post/`，手动重命名会改变公开网址。

```md
---
title: "文章标题"
description: "用于列表、搜索与页面元信息的简短摘要。"
publishedAt: "2026-08-11T10:00:00+08:00"
tags:
  - "Astro"
  - "前端开发"
draft: true
---

从这里开始写正文。
```

- 模板自动填写当前上海时间、`tags: []` 和 `draft: false`，标题、摘要与正文留空；补完这些内容前构建会失败。
- `title`、`description`、`publishedAt`、`draft` 必填；文章不维护更新时间，`updatedAt` 和其他未知字段会使构建失败。
- `tags` 可省略或留空，标签不得重复，也不需要预先登记。
- `publishedAt` 必须是加引号的有效上海时间字符串 `"YYYY-MM-DDTHH:mm:ss+08:00"`；未加引号的 YAML 日期值、UTC `Z` 和其他时区均无效。
- `draft: true` 不进入公开页面；准备发布时改为 `false`。发布时间只用于显示和排序，不提供定时发布。
- 正文不能为空。文章图片使用外部图床，并以普通 Markdown 图片语法引用。
- 保存后按通用流程预览；准备公开时确认 `draft: false`，再运行下方的站点发布命令。

### 发布说说

运行命令创建带上海时间稳定 ID 的说说：

```sh
npm run new:shuoshuo
```

命令会生成 `src/content/shuoshuo/YYYYMMDD-HHmmss.md`。文件名同时是 `/shuoshuo/#YYYYMMDD-HHmmss` 的稳定锚点，创建后不要重命名。编辑生成的文件：

```md
---
publishedAt: "2026-08-14T12:00:00+08:00"
draft: false
---

今天完成了博客的日常发布流程。
```

- 说说没有标题，可以只有文字、只有 Markdown 图片，或两者都有，但正文不能为空。
- `publishedAt` 和文件名由命令按当前上海时间生成；可修改发布时间，但不要修改稳定 ID。发布时间格式要求与技术文章相同。
- 想暂不公开时改为 `draft: true`；准备公开时恢复为 `false`，再按通用流程预览和发布。

### 更新博客设置

个性化博客只需打开根目录 [`blog.config.ts`](blog.config.ts)。页面、RSS、Canonical URL、Open Graph、结构化数据和站点地图共用这份博客设置，不需要再修改页面源码。

| 设置区      | 可配置内容                                                     |
| :---------- | :------------------------------------------------------------- |
| `site`      | 博客名称、可选页头短名称、正式网址、默认简介和可选浏览器图标   |
| `author`    | 作者显示名，以及页脚固定展示的 GitHub 个人主页和邮箱           |
| `home.hero` | 首页文案、必需的亮色主视觉、可选暗色主视觉和图片说明           |
| `footer`    | 左侧纯文本，可留空；支持 `{year}`、`{author}`，不支持 Markdown |

页脚右侧仍是固定的 RSS、GitHub 与邮箱。

设置文件通过 TypeScript 检查字段和类型，网址由原生 `URL` 解析；`npm run check` 或构建会直接报告这些原生错误，不再维护额外的自定义诊断矩阵。图片路径由作者维护，应指向 `public/images/` 中的现有文件。

不适合放进设置文件的内容使用固定位置：

- “关于我”正文：[`src/content/about.md`](src/content/about.md)，可以留空但不能删除。
- 本地主视觉和浏览器图标：[`public/images/`](public/images/)，在设置文件中填写以 `/images/` 开头的路径。浏览器图标必须为 1:1，优先使用方形 SVG，PNG/ICO 至少提供 32×32 表示；亮暗主视觉均使用 3:2，推荐 960×640 或更高且尺寸、主体位置一致，非 3:2 图片会居中裁切而不拉伸。

修改博客设置后按通用流程预览和发布。Cloudflare Pages 仍使用 `npm run build` 和 `dist`，完整操作见 [Cloudflare Pages 部署与日常发布](docs/deployment.md)。第三方资源声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 站点发布

在已检出的 `main` 分支准备好全部有意改动，然后提供非空的完整 Git 提交信息：

```sh
npm run publish -- "发布新的技术文章"
```

命令先运行包含生产构建的 `npm test`；成功后才会暂存全部 tracked 变更、删除及未忽略的新文件，创建一个提交并正常推送到 `origin/main`。技术文章、说说、博客设置和文档可进入同一站点发布快照，`draft` 仍是内容是否公开的唯一开关。命令不会自动格式化、同步分支、解决冲突、改写历史或直接调用 Cloudflare API。

若远程 `main` 已领先，正常推送会失败，本地发布提交会保留且远程不变。请手动同步 `origin/main`、处理冲突并验收后，再自行推送或重新执行发布命令；不要 force-push。

## 💻 技术栈

| 用途           | 技术                                                        |
| :------------- | :---------------------------------------------------------- |
| 框架与静态生成 | [Astro](https://astro.build/)                               |
| 类型检查       | [TypeScript](https://www.typescriptlang.org/) + Astro Check |
| 内容           | Markdown + Astro Content Collections                        |
| Markdown 扩展  | GFM、Remark、Rehype、KaTeX、Shiki                           |
| 样式           | Tailwind CSS 4、原生 CSS 与 CSS Custom Properties           |
| 搜索           | [Pagefind](https://pagefind.app/)                           |
| 格式化         | [Prettier](https://prettier.io/)                            |
| 验收           | [Playwright Test](https://playwright.dev/)                  |
| 部署           | [Cloudflare Pages](https://pages.cloudflare.com/)           |

## 👨🏻‍💻 本地运行

需要 Node.js `22.16.0`（最低 `22.12.0`）和 npm。首次运行：

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

## 🧞 Commands

所有命令均在项目根目录执行。

| 命令                          | 作用                                       |
| :---------------------------- | :----------------------------------------- |
| `npm ci`                      | 按 `package-lock.json` 安装依赖            |
| `npm run dev`                 | 启动本地开发服务器                         |
| `npm run build`               | 构建静态站点并为技术文章生成 Pagefind 索引 |
| `npm run preview`             | 本地预览 `dist` 生产构建                   |
| `npm run check`               | 运行 Astro 与 TypeScript 检查              |
| `npm run format`              | 使用 Prettier 格式化项目文件               |
| `npm run format:check`        | 检查项目文件格式，不修改文件               |
| `npm test`                    | 运行格式、类型、脚本和站点验收             |
| `npm run new:post -- <slug>`  | 创建带当前上海时间的技术文章 Markdown      |
| `npm run new:shuoshuo`        | 创建带上海时间稳定 ID 的说说 Markdown      |
| `npm run publish -- "<信息>"` | 验收、构建并发布全部改动到 `origin/main`   |
| `npm run fonts:fetch`         | 下载 Noto 字体分包并更新字体 CSS           |

## ✨ Feedback & Suggestions

发现缺陷或希望提出功能建议，请在 [GitHub Issues](https://github.com/jasper0507/jaspers-blog/issues) 新建 Issue；内容相关反馈也可以发送邮件至 [jasper0507.self@gmail.com](mailto:jasper0507.self@gmail.com)。
