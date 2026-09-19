# Jasper's Blog

![Jasper's Blog](public/images/hero/campus.jpg)

[![Astro](https://img.shields.io/badge/Astro-7.1.6-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pagefind](https://img.shields.io/badge/Search-Pagefind-FFB400?style=flat-square)](https://pagefind.app/)

Jasper 的中文技术博客，使用 Astro 静态生成并发布到
[jasper0507.me](https://jasper0507.me/)。网站提供技术文章、说说、标签、归档、全文搜索、
RSS 和站点地图，并完整支持键盘操作、亮暗主题和移动端布局。

## 仓库职责

博客分为两个仓库：

| 仓库                      | 可见性 | 负责内容                                         |
| ------------------------- | ------ | ------------------------------------------------ |
| `jasper0507/jaspers-blog` | 公开   | 页面、样式、配置、资源、测试、构建与内容工具源码 |
| `jasper0507/blog-content` | 私有   | 技术文章、说说、「关于我」和技术文章号码计数器   |

源码仓不读取私有仓凭据。开发、构建和 PR 验收使用 `tests/fixtures/content` 中的公开示例；
生产发布由私有内容仓统一取得两仓最新 `main`，构建后上传现有 Cloudflare Pages 项目。

## 本地开发

需要 Node.js 24（最低 `24.11.0`）。忘记命令时运行 `make`。

```sh
git clone git@github.com:jasper0507/jaspers-blog.git
cd jaspers-blog
make init
make dev
```

开发服务器默认运行在 `http://localhost:4321`。常用命令：

| 命令               | 用途                                       |
| ------------------ | ------------------------------------------ |
| `make dev`         | 使用公开示例启动开发服务器                 |
| `make build`       | 校验示例内容、构建站点并生成 Pagefind 索引 |
| `make preview`     | 预览最近一次生产构建                       |
| `make check`       | 运行 Astro 与 TypeScript 检查              |
| `make test`        | 运行格式、类型、领域规则和 Chromium 验收   |
| `make test-smoke`  | 运行 Firefox 核心场景                      |
| `make fonts-fetch` | 更新自托管 Noto Sans SC 中文字体分包       |

如需验证另一个完整内容目录，显式指定：

```sh
BLOG_CONTENT_DIR=/absolute/path/to/content npm run build:content
```

内容目录必须包含 `posts/`、`shuoshuo/`、`about.md` 和有效的
`post-next-id.json`；缺失或非法内容会直接失败，不会回退到示例。

## 修改与发布

源码仓的全部改动都通过 PR，合并前必须通过 `verify` 和 `browser-smoke`。合并到 `main`
后，源码仓通知私有内容仓执行生产发布。

创作只在私有内容仓进行：

```sh
make post t="文章标题"
make shuoshuo
make publish
make publish m="自定义提交说明"
```

发布命令先校验写作内容，再提交写作路径与号码计数器并推送；失败则中文报错且不提交。上线由远端工作流完成，命令不等待收据。草稿会保存到私有仓，
但从页面、搜索、RSS 和站点地图排除。完整格式与失败重试说明见
[内容仓 README](packages/content-tools/content-repo/README.md)。

生产发布、凭据、故障恢复和工具发行见[维护手册](docs/deployment.md)。架构边界见
[ADR-0034](docs/adr/0034-separate-content-repository.md)、
[ADR-0035](docs/adr/0035-creator-publish-ends-at-push.md)、
[ADR-0036](docs/adr/0036-make-as-daily-command-surface.md)、
[ADR-0037](docs/adr/0037-publish-validates-content-locally.md)。

## 站点能力

- 技术文章使用创建后不变的正整数网址 `/posts/:id/`，支持扁平标签和按年归档。
- 说说使用创建时冻结的上海时间 ID `/shuoshuo/:id/`，支持文字、外部图片和摘要折叠。
- `draft` 是唯一公开开关；发布时间只负责显示和排序，不负责定时发布。
- Markdown 支持 GFM、脚注、KaTeX、`==高亮==`、原生 `<details>` 和 Shiki 代码块。
- Pagefind 只索引已发布技术文章；没有公开技术文章时不生成搜索入口。
- RSS 同时包含文章摘要和说说摘要，站点地图只收录公开页面。
- Source Serif 4、IBM Plex Sans、IBM Plex Mono 和 Noto Sans SC 均由本站托管。

## 目录

```text
├── .github/workflows/       # PR 验证与跨仓发布通知
├── docs/                    # 维护手册、ADR 与调研记录
├── packages/content-tools/  # 可独立发行的内容创建与发布工具
├── public/                  # 字体、首页主视觉和浏览器图标
├── scripts/                 # 构建、发布、字体与内容工具维护脚本
├── src/                     # Astro 页面、组件、布局、样式和领域查询
└── tests/                   # 公开内容夹具、领域测试与浏览器验收
```

博客设置统一维护在 [`blog.config.ts`](blog.config.ts)。首页主视觉放在
[`public/images/hero/`](public/images/hero/)；只接受至少 960×640、3:2 的 JPG。正文图片继续使用
外部图床。

源码仓公开，内容仓私有；迁移前已经进入公开 Git 历史的内容仍可读取。原创源码与内容未授予
公共许可证，第三方代码和字体保留各自的许可证与署名。

## 反馈

问题与建议请提交 [GitHub Issue](https://github.com/jasper0507/jaspers-blog/issues)，内容相关反馈也可发送至
[jasper0507.self@gmail.com](mailto:jasper0507.self@gmail.com)。
