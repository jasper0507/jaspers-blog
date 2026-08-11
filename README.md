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
- [x] 响应式布局、键盘可访问导航及亮色/暗色主题
- [x] Pagefind 静态全文搜索
- [x] 文章标签、按年归档及自动目录
- [x] RSS、Sitemap、Canonical URL、Open Graph 与结构化数据
- [x] GFM、KaTeX 数学公式、提示块及 Shiki 代码高亮
- [x] 自托管中西文字体，不依赖运行时字体 CDN
- [x] 静态构建与 Cloudflare Pages 部署

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
├── tests/fixtures/         # 构建验收用内容
├── blog.config.ts          # 博客设置的唯一日常入口
├── astro.config.mjs        # Astro、Markdown 与代码高亮配置
├── package.json            # 依赖与命令
└── tsconfig.json           # TypeScript 严格模式
```

## 📖 文档

### 配置

个性化博客先打开根目录 [`blog.config.ts`](blog.config.ts)。它按博客身份中的站点信息、作者（作者显示名补全博客身份）、首页主视觉和页脚列出全部支持的博客设置、当前可运行值、可选值与中文说明；页面、RSS、Canonical URL、Open Graph、结构化数据和站点地图共用这份设置，不需要再修改页面源码。

不适合放进设置文件的内容使用固定位置：

- “关于我”正文：[`src/content/about.md`](src/content/about.md)，可以留空但不能删除。
- 本地主视觉和浏览器图标：[`public/images/`](public/images/)，在设置文件中填写以 `/images/` 开头的路径。

修改后运行 `npm run dev` 预览；发布前运行 `npm test`、`npm run build` 和 `npm run preview`。Git 提交与推送方式不变，Cloudflare Pages 仍使用 `npm run build` 和 `dist`，完整操作见 [Cloudflare Pages 部署与日常发布](docs/deployment.md)。第三方资源声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 添加文章

在 `src/content/posts/` 新建 Markdown 文件。文件名必须是小写英文、数字与短横线组成的 slug，例如 `my-first-post.md`；它会生成 `/posts/my-first-post/`，重命名会改变公开网址。

```md
---
title: "文章标题"
description: "用于列表、搜索与页面元信息的简短摘要。"
publishedAt: 2026-08-11T10:00:00+08:00
updatedAt: 2026-08-11T10:00:00+08:00
tags:
  - "Astro"
  - "前端开发"
draft: true
---

从这里开始写正文。
```

- `title`、`description`、`publishedAt`、`draft` 必填；`updatedAt` 可省略。
- `tags` 可省略或留空，标签不得重复，也不需要预先登记。
- `draft: true` 不进入公开页面；准备发布时改为 `false`。`publishedAt` 只用于显示和排序，不提供定时发布。
- 正文不能为空。文章图片使用外部图床，并以普通 Markdown 图片语法引用。
- 保存后运行 `npm run dev` 预览。发布前运行 `npm test` 和 `npm run build`；搜索需要构建索引，因此请用 `npm run preview` 验收完整搜索。

如需发布说说，运行 `npm run new:shuoshuo`，再编辑命令生成的 Markdown 文件。

## 💻 技术栈

| 用途           | 技术                                                        |
| :------------- | :---------------------------------------------------------- |
| 框架与静态生成 | [Astro](https://astro.build/)                               |
| 类型检查       | [TypeScript](https://www.typescriptlang.org/) + Astro Check |
| 内容           | Markdown + Astro Content Collections                        |
| Markdown 扩展  | GFM、Remark、Rehype、KaTeX、Shiki                           |
| 样式           | 原生 CSS 与 CSS Custom Properties                           |
| 搜索           | [Pagefind](https://pagefind.app/)                           |
| 格式化         | [Prettier](https://prettier.io/)                            |
| 验收           | Node.js 脚本 + Playwright Core                              |
| 部署           | [Cloudflare Pages](https://pages.cloudflare.com/)           |

## 👨🏻‍💻 本地运行

需要 Node.js `22.16.0`（最低 `22.12.0`）和 npm。首次运行：

```sh
git clone git@github.com:jasper0507/newblog.git
cd newblog
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

| 命令                   | 作用                                       |
| :--------------------- | :----------------------------------------- |
| `npm ci`               | 按 `package-lock.json` 安装依赖            |
| `npm run dev`          | 启动本地开发服务器                         |
| `npm run build`        | 构建静态站点并为技术文章生成 Pagefind 索引 |
| `npm run preview`      | 本地预览 `dist` 生产构建                   |
| `npm run check`        | 运行 Astro 与 TypeScript 检查              |
| `npm run format`       | 使用 Prettier 格式化项目文件               |
| `npm run format:check` | 检查项目文件格式，不修改文件               |
| `npm test`             | 运行格式、类型、脚本和站点验收             |
| `npm run new:shuoshuo` | 创建带上海时间稳定 ID 的说说 Markdown      |
| `npm run fonts:fetch`  | 下载 Noto 字体分包并更新字体 CSS           |

## ✨ Feedback & Suggestions

发现缺陷或希望提出功能建议，请在 [GitHub Issues](https://github.com/jasper0507/newblog/issues) 新建 Issue；内容相关反馈也可以发送邮件至 [jasper0507.self@gmail.com](mailto:jasper0507.self@gmail.com)。
