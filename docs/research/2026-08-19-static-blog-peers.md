# 静态博客对照调研（2026-08-19）

单人中文技术博客，不是通用主题。对照目的是找**不推翻现有 ADR** 就能补上的能力缺口，而不是把本站做成 AstroPaper / Fuwari / Cactus 的复刻。

仓库元数据（star、最近推送）取自 2026-08-19 的 GitHub API；功能只记读到的源码或官方文档，读不到的标「未核实」。

## 1. 调研范围与方法

### 1.1 本仓库一手材料

读过：`CONTEXT.md`、`README.md`、`package.json`、`astro.config.mjs`、`blog.config.ts`、`src/content.config.ts`；`docs/adr/` 全部 22 篇（重点 0001、0003、0004、0006、0008、0009、0012、0016、0017、0018、0021）；`src/lib/`、`src/pages/`、`src/layouts/`、`src/components/`、`src/styles/`、`scripts/`、`tests/`、`docs/deployment.md`。

### 1.2 对照项目与筛选

| 项目               | 仓库                                                                                                                                   | 选入理由                                                                                      | 许可证            | Stars      | 最近 push              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------- | ---------- | ---------------------- |
| 本项目结构祖先     | [satnaing/astro-paper](https://github.com/satnaing/astro-paper)                                                                        | ADR-0001 / 0006 明确的信息架构来源                                                            | MIT               | 4971       | 2026-08-05             |
| 中文向 Astro 博客  | [saicaca/fuwari](https://github.com/saicaca/fuwari)                                                                                    | 中文作者、Pagefind、目录、阅读时间、说说式以外的「长文+组件」对照                             | MIT               | 4925       | 2026-03-10             |
| 官方 blog starter  | [withastro/astro](https://github.com/withastro/astro) 内 [`examples/blog`](https://github.com/withastro/astro/tree/main/examples/blog) | ADR-0021 / 0022 点名的官方基线                                                                | MIT（示例随框架） | 框架 61854 | 2026-08-19（框架主仓） |
| 同栈近亲           | [chrismwilliams/astro-theme-cactus](https://github.com/chrismwilliams/astro-theme-cactus)                                              | ADR-0022 点名；Sätteri + Pagefind 弹层 + notes 集合                                           | MIT               | 1712       | 2026-07-25             |
| 中文向、仍在活跃   | [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure)                                                                | 中文文档、CJK 阅读时间、Shiki 复制钮、标题锚点；**不当成栈建议**（它用 Vercel adapter + SSR） | Apache-2.0        | 1035       | 2026-08-18             |
| 迁出源（非 Astro） | [ppoffice/hexo-theme-icarus](https://github.com/ppoffice/hexo-theme-icarus)                                                            | ADR-0007 迁移前的 Hexo 主题，看功能差而不是劝退栈                                             | MIT               | 6656       | 2026-04-27             |

未选入但扫过：`adityatelange/hugo-PaperMod`（13845 stars，2026-08-02 push）功能面与 Icarus/AstroPaper 重叠，只在个别条目当旁证；`EveSunMaple/Frosti`（484 stars）体量不够；`withastro/starlight` 是文档站不是博客。

方法：`gh repo view` / `gh api` 拉 `package.json`、内容 schema、页面、布局、搜索与 Markdown 插件；功能以源码路径为准，不用博客评测文。Fuwari 主仓上次 push 已四个月，实现仍按当时 `main` 记录。

## 2. 本项目现状（基于代码）

> 本节是 2026-08-19 的代码快照。技术文章网址已改为 `/posts/<稳定ID>/`（ADR-0024）；下列 ASCII slug、网址跟随文件名、构建命令直调 Pagefind、以及「时间降序 + slug 升序」不再是现行规则。

### 2.1 信息架构

中文单语（ADR-0002）。两种内容：技术文章 `/posts/:slug/`、说说 `/shuoshuo/#稳定ID`（ADR-0003）。导航：文章（归档 / 标签）· 说说 · 关于 · 搜索放大镜。归档是完整时间索引，`/posts` 重定向到 `/archives`（ADR-0012，`astro.config.mjs` `redirects`）。搜索是居中弹层，没有 `/search/` 内容页。首页最近文章、最近说说各 1 条（ADR-0013，`src/pages/index.astro`）。

### 2.2 内容模型

`src/content.config.ts`：`posts`、`shuoshuo` 两个 collection，`z.object(...).strict()`。

- 技术文章：`title`、`description`、`publishedAt`（上海时间 `+08:00`）、`tags`（开放词表、不重复）、`draft`。文件名必须是小写 ASCII slug（`src/lib/post-rules.js`），网址跟随文件名（ADR-0015）。无 `updatedAt`。
- 说说：只有 `publishedAt`、`draft`。文件名即稳定 ID `YYYYMMDD-HHmmss`（`src/lib/shuoshuo-rules.js`）。
- 草稿也必须字段完整、正文非空；`draft` 是唯一公开开关，发布时间不做定时发布（ADR-0004 / 0018）。

发布层在 collection 之后、页面之前：

- `getPublishedPostCatalog()`（`src/lib/posts.ts`）：草稿过滤、时间降序 + slug 升序、归档按年、标签按篇数再 `zh-CN` 排序；不同标签生成相同 slug 时构建失败（含草稿）。投影不含 `CollectionEntry` / `draft`。
- `getPublishedShuoshuo()`（`src/lib/shuoshuo.ts`）：同样过滤与确定排序；摘要从正文第一行有效文字投影，纯图则 `N Image(s)`。

关于页不是 collection，是 `src/content/about.md` 直接 import（ADR-0010）。

### 2.3 构建 / 发布 / DX

- Astro 7.1.6，静态输出，`trailingSlash: "always"`。构建：`astro build --force && pagefind --site dist --glob "posts/**/*.html"`。
- 部署：Cloudflare Pages 读 `main` → `npm run build` → `dist`，无 adapter、无环境变量（`docs/deployment.md`）。
- 日常入口：`blog.config.ts`（身份、主视觉、页脚文本替换 `{year}` / `{author}`）。
- 命令：`new:post`、`new:shuoshuo`、`publish`（先 `npm test` 再 `git add -A` + commit + push `origin/main`）、`fonts:fetch`。
- 测试：`format:check` + `astro check` + 字体脚本 + 创建/发布命令演练 + Playwright（fixture 整站合同、标签冲突 guard、生产构建栏位）。

### 2.4 搜索 / SEO / Markdown / 样式

- Pagefind 1.5.2 + `@pagefind/component-ui` 弹层；`data-pagefind-body` 只在单篇技术文章；`pagefind-config no-worker lang="zh-cn"`。
- SEO：canonical、`og:type/locale/site_name/title/description/url`、JSON-LD（首页 `WebSite`，其它 `WebPage`，文章 `BlogPosting`）、`@astrojs/sitemap`（过滤 `/search/`）、`@astrojs/rss`（文章 + 说说摘要，排除草稿）。**没有** `robots.txt`、`<link rel="alternate" type="application/rss+xml">`、`<link rel="sitemap">`、`og:image`、`twitter:card`、`article:published_time`、`404.astro`。
- Markdown：Sätteri + 本地 KaTeX 插件 + GitHub 提示块插件（`src/lib/markdown-satteri.js`）。Shiki 自定义 Kraft 主题 + 文件名 / 行高亮 / diff。GFM 脚注中文标签。无标题悬停锚点、无代码复制钮、无 Mermaid / MDX（ADR-0008 / 0021）。
- 样式：Tailwind 4 token + 页面 scoped CSS + `markdown-body.css` 拥有 Kraft 正文。亮暗 `data-theme` + `light-dark()`，首次跟随系统，选择写入 `localStorage`。字体自托管（Source Serif 4 / IBM Plex / Noto Serif SC 分包）。目录仅 `≥80rem` 固定侧栏，滚动 `aria-current`（`src/components/PostToc.astro`）。

## 3. 对照项目一览

### 3.1 satnaing/astro-paper（v6.1.0）

- **栈**：Astro ^7.0.3、MDX、Tailwind 4、Pagefind、Satori+Sharp 动态 OG、`fontProviders.google()`。部署文档指向 Cloudflare Pages。
- **结构**：`astro-paper.config.ts` 用户配置 + `src/config.ts` 解析默认值；`src/content.config.ts` 有 `posts` 与 `pages`；`src/utils/` 过滤排序；`src/pages/posts/[...slug]/` 单篇与邻篇导航组件。
- **内容模型**：`pubDatetime` / 可选 `modDatetime`、`draft`、默认 tag `["others"]`、`featured`、`ogImage`、`canonicalURL`、可选时区。子目录进入 URL。`postFilter` 在生产排除未到点的预约稿（`scheduledPostMargin`）。
- **功能**：独立 `/search/` + `@pagefind/default-ui`（`showSubResults: true`，URL `?q=`）；文章列表分页（`perPage` 默认 4）；归档可关；上一篇/下一篇；分享链接；Edit on GitHub；动态 `/posts/.../index.png`；`robots.txt.ts` 指向 sitemap；RSS 只用 description；亮暗 + View Transitions `ClientRouter`；remark-toc 正文内可折叠目录，不是侧栏。
- **标签 slug**：`slugify.ts` 拉丁走 `slugify`，含非拉丁走 `lodash.kebabcase` 并保留原字；**按 slug 去重，不因碰撞失败**（同 slug 不同写法会静默合并）。

### 3.2 saicaca/fuwari

- **栈**：Astro 5.13.10、Svelte、Tailwind 3、`@swup/astro` 页面过渡、astro-expressive-code、Pagefind、KaTeX、PhotoSwipe。部署 Vercel。
- **结构**：`src/config.ts` 站点/导航/资料/许可证；`src/content/config.ts` `posts` + `spec`；`src/utils/content-utils.ts` 排序并**回写** `prev/next` 到 frontmatter 投影。
- **内容模型**：`published` / 可选 `updated`、可选 `description/image/tags/category/lang`、`draft` 默认 false。生产才滤草稿，开发可见草稿。有分类。
- **功能**：顶栏 Pagefind（桌面内联 + 移动面板；dev 用假结果）；侧栏 TOC（IntersectionObserver + 自定义元素）；阅读时间 `reading-time` + 词数；邻篇卡片；RSS 含 `sanitize-html` 后的正文；`pagefind.yml` **排除 `.katex`**；标题 `rehype-autolink-headings`；代码块复制钮 / 行号 / 折叠；图片灯箱。
- **创建命令**：`scripts/new-post.js` 只保证不覆盖，时间是本地日历日、无时区约束。

### 3.3 withastro/astro `examples/blog`（官方 starter）

- **栈**：Astro ^7.2.3、`@astrojs/mdx`、`@astrojs/rss`、`@astrojs/sitemap`、`sharp`、本地 Atkinson 字体（`fontProviders.local()`）。无搜索、无暗色、无标签。
- **结构**：`src/consts.ts` 只有标题和简介；`src/content.config.ts` 单一 `blog` collection；`src/layouts/BlogPost.astro` + `src/components/BaseHead.astro`。
- **内容模型**：`title`、`description`、`pubDate`、可选 `updatedDate`、`heroImage`（`image()`）。**无 draft**。MD + MDX。
- **功能**：`astro:assets` 的 `<Image>`；canonical + OG 图（缺省用 placeholder）；Twitter card；`<link rel="sitemap">` + RSS autodiscovery；列表页按 `pubDate` 降序；RSS 不过滤、无自定义 language 节点。这是官方「能跑的最小博客」，不是功能上限。

### 3.4 chrismwilliams/astro-theme-cactus（v8.2.0）

- **栈**：Astro 7.0.4、Sätteri、MDX、Tailwind 4、Pagefind component-ui、astro-expressive-code、Satori OG、webmanifest、robots-txt。静态输出。
- **结构**：内容在仓库根 `content/{posts,notes,tags}`；`src/data/post.ts` 过滤草稿；`src/pages/notes/` 独立短内容；笔记另有 `/notes/rss.xml`。
- **内容模型**：post 有 `publishDate`、可选 `updatedDate`、`draft`、`tags`（去重小写）、`pinned`、`coverImage`、`ogImage`；note 有 `title` + 带时区的 ISO `publishDate`（**有独立详情页**，和本站说说不同）；tag 可写介绍。
- **功能**：与本站同类的 `<pagefind-modal-trigger>`；`data-pagefind-body` 在文章和笔记；阅读时间；`<details>` 目录（手机也能用）；回到顶部；外链 `rel=noreferrer noopener` + `target=_blank`；标题整段包成锚点；webmentions（可选）；动态 OG。

### 3.5 cworld1/astro-theme-pure（v4.1.4）

- **栈**：Astro 6.2.1、`astro-pure` 包、UnoCSS、KaTeX、**`@astrojs/vercel` + `output: 'server'`**、Waline 评论。作中文实现参考，**不跟它的部署模型**。
- **值得看的实现**：自写 CJK 阅读时间（`packages/pure/utils/reading-time.ts`）；Shiki transformer `addCopyButton` / `addCollapse`；`rehypeAutolinkHeadings` 在标题后追加 `#`；`ArticleBottom.astro` 邻篇；`rehype-external-links`（作者注释里也提醒慎用 `target=_blank`）。

### 3.6 ppoffice/hexo-theme-icarus（v6.1.1）

- **栈**：Hexo 7、Inferno、Stylus、Bulma。插件型主题：评论 / 分享 / 搜索（Algolia、百度、Google CSE、Insight）/ 统计 / KaTeX·MathJax / 灯箱。
- **文章契约**（`include/schema/common/article.json` + `layout/common/article.jsx`）：默认显示阅读时间（字数按 CJK 单字 + 英文词，150 wpm）、更新时间、代码复制钮（`highlight.clipboard` 默认 true）、分类路径、标签 `#tag`、上一篇/下一篇、许可块、分享与打赏。
- **对本站的意义**：旧站功能面很宽，新站已经用 ADR 主动丢掉分类、评论、分享、CMS。对照时只回收「长文阅读辅助」（复制、邻篇、字数/时长、标题锚点），不要回收插件超市。

## 4. 分主题对照

### 4.1 结构与模块边界

|            | 本项目                                    | AstroPaper                             | Fuwari                                     | 官方 blog                | Cactus                            |
| ---------- | ----------------------------------------- | -------------------------------------- | ------------------------------------------ | ------------------------ | --------------------------------- |
| 配置入口   | `blog.config.ts` 窄身份字段               | 大而全 `astro-paper.config.ts`         | `src/config.ts` 含主题色相、banner、许可证 | 两个字符串常量           | `site.config.ts` + 菜单数组       |
| 数据层     | collection 后的 published snapshot        | utils 过滤，页面仍拿 `CollectionEntry` | utils 回写 prev/next 到 data               | 页面直接 `getCollection` | `getAllPosts()` 仍返回 entry      |
| 第二种内容 | 说说：无标题、无详情页、锚点分享          | 无                                     | 无（只有 posts）                           | 无                       | notes：有标题、有详情页、独立 RSS |
| 组件量     | 3 个（MarkdownBody / PostTags / PostToc） | 大量通用主题组件                       | Svelte + 侧栏小组件                        | 极少                     | 中等，含 webmentions              |

本项目的 seam（ADR-0017 / 0018）比主题型仓库更干净：页面不碰 `draft` 和 raw entry。这是不应跟风「把 prevSlug 写回 schema」的地方。

### 4.2 内容模型

- **草稿**：本项目最严——草稿也必须合法，且开发构建与生产同一套过滤（fixture / 生产测试都断言草稿不进任何公开面）。Fuwari / Cactus 开发可见草稿；官方 blog 没有 draft。
- **时间**：本项目强制引号 + `+08:00` + 往返校验（`src/lib/shanghai-time.js`）。AstroPaper 用 `z.date()` + 可选 timezone；官方 blog `z.coerce.date()`；Cactus note 用 `z.iso.datetime({ offset: true })`。本项目更不容易静默偏时区。
- **标签**：本项目开放词表 + slug 碰撞失败（`posts.ts` + `tests/site/guard/guard.setup.ts`）。AstroPaper 按 slug 去重不报错；Cactus 先 `toLowerCase` 去重。中文标签「Go」与「go」在 Cactus 会并，在本站是两个名字、两个 slug。
- **分类 / 更新时间 / 置顶 / 预约发布**：对照项目普遍有，本站 ADR 明确不要。
- **分页**：AstroPaper / Cactus / Pure / Icarus 都有列表分页。本站归档一页到底（当前约 15 篇正式文，合理）。

### 4.3 搜索

|          | 本项目                 | AstroPaper                       | Fuwari            | Cactus       | Pure                   | Icarus                         |
| -------- | ---------------------- | -------------------------------- | ----------------- | ------------ | ---------------------- | ------------------------------ |
| 引擎     | Pagefind               | Pagefind                         | Pagefind          | Pagefind     | Pagefind               | Algolia / 百度 / CSE / Insight |
| UI       | 官方 modal，`/` 快捷键 | 独立搜索页 + default-ui          | 自制 Svelte 面板  | 同一套 modal | default-ui 页面内      | 第三方                         |
| 范围     | 仅已发布技术文章       | 标了 `data-pagefind-body` 的文章 | 标题加权 + 正文   | 文章 + notes | 站点页                 | 视插件                         |
| 索引噪音 | 未排除公式             | 未在源码见 katex 排除            | **排除 `.katex`** | 未核实排除   | 未核实                 | n/a                            |
| 子结果   | `hide-sub-results`     | `showSubResults: true`           | 摘录              | 组件默认     | `showSubResults: true` | n/a                            |

本站搜索产品形态（弹层、只搜文章、暗色 token 对齐）已经对过 ADR-0013，不必改回独立搜索页。缺的是**索引质量**（论文笔记里大量 KaTeX 会被当正文）。

### 4.4 SEO

官方 blog `BaseHead.astro`、AstroPaper `Layout.astro` / `robots.txt.ts`、Cactus `BaseHead.astro` 的共同基线是：canonical、OG 文本、**OG 图**、**Twitter card**、**RSS autodiscovery**、**sitemap link**。AstroPaper 另有 `robots.txt` + `article:published_time` + JSON-LD `dateModified`。Icarus / PaperMod 还有关键词、站长验证、生产 `robots` meta。

本站已经有 canonical、OG 文本、JSON-LD、sitemap、RSS。缺的是爬虫/阅读器发现层（robots、autodiscovery）和链接预览图。ADR-0009 禁止的是可见分享模块和**逐篇动态 OG**，不是整站一张静态预览图。

### 4.5 Markdown

ADR-0008 已声明的能力：KaTeX、GFM、Shiki 文件名/行高亮/diff、提示块、**标题锚点**、自动目录、`<details>`。实现上：公式/提示块/脚注/代码附加都有 Playwright 合同（`tests/site/fixture/post.spec.ts`）；**标题锚点只有 id（供 TOC 用），标题本身不可点、无 `#` 链**。Sätteri 配置里没有 heading-id / autolink 插件（Cactus 的 `satteriHeadingIdsPlugin` + `satteriAutolinkHeadingsPlugin` 是对照）。

代码块：本站 Kraft 主题 + `data-title`，无复制、无折叠。Fuwari / Pure / Icarus 默认有复制；Pure 还有超过 15 行折叠。

RSS：本站文章只出 `description`，说说只出摘要且不含全文（ADR-0018）。Fuwari 文章 RSS 带消毒后的 HTML 正文。

### 4.6 样式 / 主题

对照主题多数是「一套可换皮的通用壳」。本站是分层：外壳 token（ADR-0020 暖纸）+ `.post-body` Kraft（ADR-0014）+ `global.css` 收窄所有权（ADR-0019）。亮暗持久化与 FOUC 预防已有，且**不会在系统偏好变化时覆盖用户手动选择**（AstroPaper `theme.ts` 会在 `prefers-color-scheme` 变化时 `persist()`，反而更吵）。

目录：本站桌面固定侧栏 + 滚动高亮，合同写死 `<1280px` 隐藏（ADR-0014）。Cactus 用 `<details>`，手机也能打开。Fuwari 是侧栏自定义元素。AstroPaper 是正文里的 remark-toc。长篇论文笔记在手机上目前没有页内目录入口。

### 4.7 DX / 发布

本站 `publish` 把校验、构建、提交、快进推送收成一条命令，且创建命令与 collection 共享规则文件——对照项目里几乎没有同等强度的发布闸门。Fuwari / Pure 有 `new-post`，但不校验上海时间、空正文或 slug 碰撞。AstroPaper 没有创建命令。Icarus 依赖 Hexo 脚手架。

官方 blog 用 `fontProviders.local()` 管字体；本站用 `scripts/fetch-fonts.mjs` 做 Noto 分包，更贴中文正文。不要为了「官方」改回 Google Fonts（AstroPaper 已用 `fontProviders.google()`，与 ADR-0013 冲突）。

### 4.8 测试

对照主题几乎没有整站验收。本站有：公开面合同（草稿排除、排序、RSS、sitemap、Pagefind 页数）、搜索键盘生命周期、正文渲染、WCAG 对比度、视觉截图、标签碰撞负例、创建/发布命令演练。改进应继续穿过 `dist` / Playwright，不要加「读 CSS 源文件」的测试（ADR-0019）。

## 5. 改进建议

### 5.1 已经做得好、不必跟风

- **独立实现 + 选择性复用**（ADR-0006）：不要引入 i18n、View Transitions、分享条、主题配置层。
- **两种内容、说说无详情页**（ADR-0003 / 0018）：不要做成 Cactus notes（有标题、有独立页、进搜索）。
- **归档 + 扁平标签，无分类**（ADR-0012）：Icarus / Fuwari 的 category 是旧债。
- **published snapshot**（ADR-0017）：不要把 `prevSlug` 写进 Zod schema（Fuwari 那样）。
- **draft 唯一开关、无预约发布**（ADR-0004）：不要抄 AstroPaper 的 `scheduledPostMargin`。
- **标签碰撞失败**：比 AstroPaper 静默合并更适合中文开放词表。
- **搜索是弹层不是页面**（ADR-0013）：不要回到 AstroPaper `/search/`。
- **无分享 UI、无逐篇动态 OG**（ADR-0009）。
- **官方 RSS / sitemap / Sätteri，正文自管 CSS**（ADR-0021）：不要为复制钮去上 Expressive Code 整套，除非现有 Shiki transformer 不够。
- **自托管字体、无第三方字体 CDN**。
- **发布闸门 + Playwright 合同**：对照主题普遍缺失，保持。
- **首页各 1 条、去栏目壳、暖纸北星**：视觉问题另票处理，不要夹在功能对照里换壳。

### 5.2 不推翻 ADR 即可做

优先级按「读者每天碰到的摩擦 × 改动面」。每条都绑定本仓库缺口 + 至少一个对照源码。

#### 高

**1. 补爬虫发现层：`robots.txt` + RSS / sitemap autodiscovery**

- **缺口**：`src/pages/` 无 `robots.txt.ts`；`BaseLayout.astro` 无 `<link rel="alternate" type="application/rss+xml">`、无 `<link rel="sitemap">`。订阅器和部分爬虫只能猜 `/rss.xml`。
- **对照**：AstroPaper `src/pages/robots.txt.ts` 输出 `Sitemap: …/sitemap-index.xml`；官方 blog `BaseHead.astro` 同时链 sitemap 与 RSS；Cactus `BaseHead.astro` 链 `/rss.xml` 与 `/notes/rss.xml`。
- **值得**：零 UI、符合 ADR-0009「基础 SEO」。
- **落地**：新增 `src/pages/robots.txt.ts`；在 `BaseLayout.astro` `<head>` 加两条 link。`tests/site/fixture/home.spec.ts` / `output-contract.spec.ts` 断言 head 与 `dist/robots.txt`。
- **风险**：极低。sitemap 过滤 `/search/` 的既有合同保持。

**2. 站点级静态 `og:image` + `twitter:card` + `article:published_time`**

- **缺口**：`BaseLayout.astro` 只有 OG 文本；文章 JSON-LD 有 `datePublished`，没有 `article:published_time`。聊天软件/Telegram 展开时无图。
- **对照**：官方 blog 用一张 FallbackImage 填 `og:image` + `twitter:card=summary_large_image`；Cactus `BaseHead.astro` 还有 `og:image:width/height` 和 `article:published_time`；AstroPaper `PostLayout.astro` 写 article 时间。
- **值得**：链接预览是元数据，不是分享按钮。用 `public/images/hero-light.svg`（或一张专用 1200×630 PNG）做**全站默认图**即可。
- **落地**：`blog.config.ts` 增加可选 `site.ogImage`；`BaseLayout` 输出 `og:image` / `twitter:*`；`src/pages/posts/[id].astro` 的 head 槽加 `article:published_time`。不引入 Satori，不按篇生成。
- **风险**：ADR-0009 措辞是「基础 Open Graph **文本**」且禁止「分享图片或逐篇文章的动态 OG」。全站一张静态图是灰区，但更接近「链接识别元数据」。若作者把「任何 og:image」都视为分享图，则降级为只加 `twitter:card=summary`（无图）和 `article:published_time`。
- **不要做**：AstroPaper / Cactus / Pure 的逐篇 Satori 图。

**3. 标题锚点（补齐 ADR-0008 已声明、未做完的能力）**

- **缺口**：正文 `h2–h6` 有 id（TOC 能链），但标题不可点、无可见 `#`。`markdown-satteri.js` 无 heading 插件。
- **对照**：Cactus `src/plugins/satteri.ts` 的 `satteriAutolinkHeadingsPlugin`（标题包 `<a href=#id>`）；Fuwari / Pure 用 `rehype-autolink-headings` 在标题后追加 `#`。
- **值得**：论文笔记章节多，复制「这一节的 URL」是刚需；ADR-0008 已写「标题锚点」。
- **落地**：在 `siteMarkdownProcessor()` 加一个 Sätteri hast 插件（与现有 alerts 插件同风格，保持 ADR-0021）。只处理 `h2–h6`，排除 `#footnote-label`。样式放 `markdown-body.css`，hover 才显示 `#`，`data-pagefind-ignore` 避免搜到井号。扩展 `tests/site/fixture/post.spec.ts`。
- **风险**：中文标题 slug 已存在；注意不要改变现有 id（TOC 合同依赖 `#第一节` 这类 slug）。

**4. 代码块复制按钮**

- **缺口**：`markdown-body.css` 的 `.astro-code` 只有文件名条和行高亮，没有复制控件。技术文章以代码和命令为主。
- **对照**：Icarus `article.highlight.clipboard` 默认 true；Pure `src/plugins/shiki-custom-transformers.ts` 的 `addCopyButton(2000)`；Fuwari `src/plugins/expressive-code/custom-copy-button.ts`。AstroPaper 未在本次读到的 Shiki transformer 里做复制。
- **值得**：比换 Expressive Code 便宜，也不碰 MDX。
- **落地**：优先在 `astro.config.mjs` 现有 transformers 旁加一个极小的 copy transformer（或 `MarkdownBody.astro` 里一段 inline script，只绑定 `.post-body pre.astro-code`）。按钮用 `aria-label="复制代码"`，成功态 2s，尊重 `navigator.clipboard` 失败。样式走 Kraft token。Playwright：点按钮后 `navigator.clipboard` mock 被调用。
- **风险**：低。不要为此引入 `astro-expressive-code`（会重画代码块视觉，冲 ADR-0014 / 0020）。

**5. Pagefind 排除 KaTeX**

- **缺口**：`package.json` 的 pagefind 只有 `--glob "posts/**/*.html"`；索引会吃进公式源与渲染字符。论文笔记（`transformer-paper-notes` 等）公式密度高。
- **对照**：Fuwari `pagefind.yml`：`exclude_selectors: ["span.katex", "span.katex-display", "[data-pagefind-ignore]", ...]`。
- **值得**：直接提高中文检索精度，不改 UI。
- **落地**：根目录加 `pagefind.yml`（或 CLI `--exclude-selectors`），排除 `.katex` / `.katex-display` / `.markdown-alert-title`（可选）。`output-contract.spec.ts` 现有 page_count 断言应仍成立；可加一条：索引 JSON 不含 `N=6` 这类纯公式碎片（按现有生产合同里的 annotation 谨慎取样）。
- **风险**：排除过度会导致「搜公式名词搜不到」。先只排除 `.katex*`。

#### 中

**6. 上一篇 / 下一篇（按发布时间，只在已发布快照上算）**

- **缺口**：单篇页渲染完就是正文 + TOC，没有时间线上的邻篇。长笔记之间只能回归档。
- **对照**：AstroPaper `AdjacentPostNav.astro` 在 `getStaticPaths` 里用排序后的 index±1；Fuwari `getSortedPosts()` 写 prev/next；Icarus `article.jsx` 底部 `page.prev/page.next`；Pure `ArticleBottom.astro`。
- **值得**：15 篇时收益中等，以后只增不减；实现可以完全待在 `posts.ts` 快照里，不改 schema。
- **落地**：`PublishedPost` 增加可选 `previous` / `next`（id、title、href），在 catalog 排序后一次填好。`src/pages/posts/[id].astro` 文末输出两个链，`data-pagefind-ignore`。样式用现有文字链，不要做成 Icarus 大卡片。合同：`visual` 的邻篇是 `alpha`（更新）和 `older`（更旧）。
- **风险**：低。不要按标签「相关文章」冒充邻篇（那是另一条）。排序必须复用 catalog 的「时间降序 + 稳定 ID 升序」。

**7. 中文阅读时间（可选展示，不进 frontmatter）**

- **缺口**：元信息行只有 `YYYY.MM.DD` 和 `#tag`（ADR-0014）。长篇论文笔记没有篇幅信号。
- **对照**：Icarus `getWordCount` 把 CJK 字和英文词分开算，150 wpm；Pure `packages/pure/utils/reading-time.ts` 显式扫 CJK 区段（针对 [issue #36](https://github.com/cworld1/astro-theme-pure/issues/36)）；Fuwari / Cactus 用 npm `reading-time`（英文词模型，中文会严重低估）。
- **值得**：本站正文以中文 + 公式为主，**不要**直接依赖 `reading-time`。
- **落地**：在 `posts.ts` 对 `entry.body` 做纯函数估算（CJK 字 + 拉丁词，公式/代码可按行或直接忽略），投影 `readingMinutes`。元信息行加「约 N 分钟」小号 muted 文本。阈值至少 1。测试用 fixture `visual.md` 钉一个下限而不是精确值。
- **风险**：ADR-0014 元信息「仅展示发布时间」——加时长是元信息行的增量，视觉上要克制。若作者认为破了「仅发布时间」，就挪到文末或放弃。数字对读者是估计，文案用「约」。

**8. 技术文章 RSS 带正文（说说仍只出摘要）**

- **缺口**：`src/pages/rss.xml.ts` 文章只有 `description`。订阅器里看不到笔记内容。
- **对照**：Fuwari `src/pages/rss.xml.ts` 用 markdown-it 渲染 + `sanitize-html`（允许 `img`），并剥非法 XML 字符。AstroPaper / Cactus / 官方 blog 仍只出 description。
- **值得**：读者若用 RSS 跟技术文章，正文比摘要有用；ADR-0018 只约束说说「RSS 不包含完整正文」。
- **落地**：仅对 posts 填 `content`。优先用已渲染 HTML（若 snapshot 不便拿 HTML，可在 rss 路由里 `render` 后序列化，或对 Markdown 做白名单消毒）。说说继续 `description: item.summary`。
- **风险**：外链图（ADR-0016）会进 RSS，这是预期。构建时间略增。消毒必须白名单，避免脚本。`output-contract.spec.ts` 现有「RSS 不含说说全文」断言要保留。

**9. 回到顶部（单篇长文）**

- **缺口**：长笔记只能靠浏览器手势回去。目录在手机上又是隐藏的。
- **对照**：Cactus `BlogPost.astro` 用 IntersectionObserver 看 hero 是否离开视口再显示圆钮；Fuwari / AstroPaper 也有 BackToTop。
- **值得**：实现小，和现有右下主题钮（`#theme-toggle`）不要抢位置。
- **落地**：只在 `src/pages/posts/[id].astro` 加，默认 `left` 或主题钮上方，`aria-label="回到顶部"`，`prefers-reduced-motion` 时瞬时滚动。观察 `.post-header`。
- **风险**：两个悬浮钮的视觉要一起验收（亮暗、375 / 1440）。不要做成全站组件。

**10. 外链 `rel`（默认不加 `target=_blank`）**

- **缺口**：正文外链只是普通 `<a>`。
- **对照**：Cactus `satteriExternalLinksPlugin` 给 http(s) 外链加 `rel=noreferrer noopener` 和 `target=_blank`；Pure 的 `rehype-external-links.ts` 注释明确写「likely not configure target」。
- **值得**：`rel` 是安全底线；本站读者在长文里被强制新标签页并不友好。
- **落地**：Sätteri hast 插件：仅当 `href` 可解析且 origin ≠ `blogSettings.site.url` 时加 `rel="noopener noreferrer"`。**不加** `target=_blank`，除非以后单独决定。
- **风险**：低。内链、锚点、`mailto:` 必须跳过。

#### 低

**11. `404.astro`**

- **缺口**：无自定义 404。Cloudflare Pages 对未知路径是平台默认页。
- **对照**：AstroPaper / Cactus / Pure / PaperMod 都有 `404`。
- **落地**：`src/pages/404.astro` 用 `BaseLayout`，一句话 + 回首页 / 归档。生产测试断言 `dist/404.html` 存在（Astro 静态 404 的文件名以构建产物为准）。
- **风险**：低。确认 Pages 会用该文件（官方 Astro Pages 指南）。

**12. 单篇 JSON-LD 补 `mainEntity` 以外的小字段**

- **缺口**：已有 `BlogPosting` + author Person，无 `image`、无 `keywords`（可用 tags）。
- **对照**：AstroPaper `PostLayout.astro` 的 `image`；Fuwari jsonLd 含 `keywords: tags`。
- **落地**：`keywords: post.tags.map(t => t.name)`；若做了站点 ogImage 则填 `image`。不要发明 `dateModified`。
- **风险**：极低。

**13. Pagefind 结果是否显示小节**

- **缺口**：`hide-sub-results`（ADR-0013 搜索面板验收）。长文搜不到节标题。
- **对照**：AstroPaper / Pure 开 `showSubResults`。
- **值得**：有了标题锚点之后更有用。
- **落地**：先观察索引体积；若开，只改 `BaseLayout.astro` 的 `<pagefind-results>`，补搜索测试。可能要重开 ADR-0013 的「关闭 sub-results」字面合同——若视为搜索面板实现细节而非产品禁令，可做；严格读 ADR 则放到 5.3。

**14. `theme-color` meta**

- **对照**：AstroPaper 运行时把计算后的背景写入 `<meta name="theme-color">`。
- **落地**：按当前 `data-theme` 写死两套纸色（`#f5f2ea` / `#272421`），不必动态读 computed style。
- **风险**：极低，移动浏览器工具栏颜色。

### 5.3 需重开 ADR 才讨论

这些对照项目都有，但和现行决定冲突。**不要当默认迭代。**

| 想法                                       | 冲突                                                                       | 对照                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 评论（Giscus / Waline / Disqus…）          | ADR-0021「不上评论」；ADR-0004 无后端                                      | Icarus 一排评论插件；Pure Waline；AstroPaper 文档教 Giscus               |
| MDX / 正文里写组件                         | ADR-0008 / 0021                                                            | 官方 blog、AstroPaper、Cactus、Pure                                      |
| 分类                                       | ADR-0012                                                                   | Fuwari `category`；Icarus categories                                     |
| CMS / 内容后台                             | ADR-0004                                                                   | 无（正是要避开的）                                                       |
| 分享按钮 / 分享面板 / 逐篇动态 OG          | ADR-0009                                                                   | AstroPaper `ShareLinks` + Satori；Cactus / Pure OG 端点；Icarus Share.js |
| View Transitions / Swup                    | ADR-0006 / 0021                                                            | AstroPaper `ClientRouter`；Fuwari `@swup/astro`                          |
| Cloudflare adapter / SSR                   | ADR-0021；部署文档是纯静态 Pages                                           | Pure `output: 'server'` + Vercel                                         |
| 多语言                                     | ADR-0002                                                                   | AstroPaper i18n；Fuwari 多份 `src/i18n/languages/*`                      |
| 主题色相选择器 / 自定义配色盘              | ADR-0001 修订后仍「只有亮暗」                                              | Fuwari hue picker                                                        |
| 预约发布（到点自动公开）                   | ADR-0004 / 0018「发布时间不做定时」                                        | AstroPaper `scheduledPostMargin`                                         |
| 独立 `/search/` 内容页                     | ADR-0013 / 0005                                                            | AstroPaper `search.astro`                                                |
| 说说改成有标题的 notes 详情页、并进搜索    | ADR-0003                                                                   | Cactus `content/notes`                                                   |
| 文章进仓库的本地图 + `astro:assets`        | ADR-0016 外部图床                                                          | 官方 blog `heroImage: image()`；Cactus `coverImage`                      |
| 手机 TOC / 文首 `<details>` 目录           | ADR-0014「目录仅 ≥1280px 显示」；ADR-0001 曾写「不增加折叠或页内替代入口」 | Cactus `<details>` TOC                                                   |
| 相关文章（按标签重叠）                     | 未写死禁止，但会在单篇页加一块发现模块，接近新 IA                          | PaperMod related；需另开决策                                             |
| 代码块改 Expressive Code                   | 会换掉 Kraft Shiki 视觉（ADR-0014 / 0020）                                 | Fuwari / Cactus                                                          |
| 分析脚本（GA / 百度 / Busuanzi）           | 无 ADR，但引入第三方追踪；Cactus README 明确主题不内置                     | Icarus 一排 analytics                                                    |
| 把本仓库做成通用主题 / 同步上游 AstroPaper | ADR-0006 / 0011 私有仓、独立实现                                           | 所有对照都是主题模板，本站不是                                           |

手机目录对论文笔记价值很高，但是否允许「桌面固定 TOC + 文首折叠 TOC」要先改 ADR-0014，不要夹在别的票里做。

## 6. 来源

### 6.1 本仓库

- `CONTEXT.md`、`README.md`、`package.json`、`astro.config.mjs`、`blog.config.ts`、`src/content.config.ts`
- `docs/adr/0001`–`0022`，尤其 0003、0004、0006、0008、0009、0012、0013、0014、0016、0017、0018、0021
- `src/lib/posts.ts`、`shuoshuo.ts`、`site.ts`、`content.ts`、`markdown-satteri.js`、`post-rules.js`、`shuoshuo-rules.js`、`tags.js`、`shanghai-time.js`
- `src/layouts/BaseLayout.astro`、`src/pages/**`、`src/components/{MarkdownBody,PostTags,PostToc}.astro`、`src/styles/*`
- `scripts/{new-post,new-shuoshuo,publish,check-*}.mjs`、`tests/site/**`、`docs/deployment.md`

### 6.2 对照仓库（均为 2026-08-19 读取的默认分支）

- https://github.com/satnaing/astro-paper — `package.json`、`astro.config.ts`、`astro-paper.config.ts`、`src/content.config.ts`、`src/utils/{postFilter,getSortedPosts,getUniqueTags,slugify,getPostPaths}.ts`、`src/pages/{rss.xml.ts,robots.txt.ts,search.astro,posts/[...page].astro,posts/[...slug]/index.astro,posts/[...slug]/_components/AdjacentPostNav.astro}`、`src/layouts/{Layout,PostLayout}.astro`、`src/scripts/theme.ts`、`README.md`
- https://github.com/saicaca/fuwari — `package.json`、`astro.config.mjs`、`src/config.ts`、`src/content/config.ts`、`src/utils/content-utils.ts`、`src/pages/{rss.xml.ts,posts/[...slug].astro}`、`src/components/{Search.svelte,widget/TOC.astro}`、`pagefind.yml`、`scripts/new-post.js`、`src/plugins/remark-reading-time.mjs`、`README.md`
- https://github.com/withastro/astro/tree/main/examples/blog — `package.json`、`astro.config.mjs`、`src/content.config.ts`、`src/consts.ts`、`src/components/BaseHead.astro`、`src/layouts/BlogPost.astro`、`src/pages/{rss.xml.js,blog/[...slug].astro,blog/index.astro}`、`README.md`
- https://github.com/chrismwilliams/astro-theme-cactus — `package.json`、`astro.config.ts`、`src/content.config.ts`、`src/site.config.ts`、`src/data/post.ts`、`src/components/{Search.astro,BaseHead.astro,blog/TOC.astro}`、`src/layouts/BlogPost.astro`、`src/plugins/satteri.ts`、`src/pages/{rss.xml.ts,notes/rss.xml.ts,404.astro}`、`README.md`
- https://github.com/cworld1/astro-theme-pure — `package.json`、`astro.config.ts`、`README-zh-CN.md`、`packages/pure/utils/reading-time.ts`、`packages/pure/components/pages/{ArticleBottom,PFSearch}.astro`、`packages/pure/plugins/rehype-external-links.ts`
- https://github.com/ppoffice/hexo-theme-icarus — `package.json`、`README.md`、`layout/common/article.jsx`、`include/schema/common/{article,plugins,search}.json`
- 旁证：https://github.com/adityatelange/hugo-PaperMod `README.md`、`theme.toml`、`layouts/single.html`、`layouts/_partials/{post_nav_links,head}.html`（复制钮、邻篇、相关文章、robots meta）

仓库统计：`gh repo view … --json stargazerCount,pushedAt,licenseInfo`（2026-08-19）。
