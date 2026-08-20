---
title: "如何新增博客内容？（现行站点）"
description: "这是一篇基于现行 Astro 站点的内容发布教程，覆盖技术文章、说说、本地预览与一键发布。"
publishedAt: "2026-08-20T09:37:39+08:00"
tags:
  - "工程实践"
  - "站点与博客"
  - "教程"
  - "Markdown"
  - "Astro"
draft: false
---

本文介绍现行站点新增内容的全流程：从创建文件、填写头部字段、编写 Markdown，到本地预览和推送到线上。站点只分两种内容：技术文章（有标题、摘要、标签）和说说（无标题的短内容）。旧版 Hexo + Icarus 的 `hexo n`、分类、评论框在本站都不适用，请按下面的命令操作。

Markdown 基础语法可另见 [Markdown快速上手语法](/posts/markdown-quick-start/)。

## 一、核心操作流程（从创建到发布）

日常只记两条命令：创建、发布。创建和发布会先自行对齐网上的版本，不必先手动 `git pull`。必须在仓库根目录、主线（`main`）上操作。

### 步骤 1：终端创建技术文章或说说

#### 1.1 创建技术文章（推荐）

路径名只使用小写 ASCII 字母、数字和短横线，不要带 `.md`，也不要用中文文件名：

```bash
# 完整命令：参数是网址路径名，不是标题
npm run new:post -- your-post-slug
# 示例
npm run new:post -- jaspers-blog-content-guide
```

命令会先对齐网上的版本，再创建 `src/content/posts/your-post-slug.md`，公开地址为 `/posts/your-post-slug/`。已存在的文件不会被覆盖。连不上网或没法自动对齐时，不会创建文件。

#### 1.2 先写草稿、稍后公开

本站没有 Hexo 那种 `_drafts/` 目录。创建后把头部的 `draft` 改成 `true` 即可，内容不会出现在页面、搜索、RSS 和站点地图里；写完再改回 `false`。

```yaml
draft: true
```

草稿也必须填好标题、摘要、时间和正文，否则构建会失败。发布时间只用于显示和排序，没有定时发布。

#### 1.3 创建说说

```bash
npm run new:shuoshuo
```

会先对齐网上的版本，再生成类似 `src/content/shuoshuo/20260820-093739.md` 的文件。文件名就是稳定 ID，分享地址是 `/shuoshuo/#20260820-093739`。创建后不要改文件名。同一秒内重复执行会因文件已存在而失败，下一秒再运行即可。

#### 1.4 关键注意点

1. 技术文章的路径名含空格或中文时，命令会直接失败，必须用英文短横线。
2. 文件名决定公开网址。手动重命名等于换网址，旧地址不会跳转。
3. 说说可以改 `publishedAt`，但不要改稳定 ID（文件名）。
4. 文章图片使用外部图床，仓库不保存、也不校验这些图片。

### 步骤 2：编辑 Markdown 文件

打开生成的 `.md` 文件，结构仍是「Front-Matter 头部 + Markdown 正文」。

#### 2.1 技术文章必填头部

这是文章的配置头部，决定列表、搜索和页面元信息。只保留下面这些字段，多写未知字段（例如旧站的 `updated`、`categories`、`excerpt`、`toc`、`comments`）会构建失败。

```yaml
---
title: "如何新增博客内容？（现行站点）"
description: "用于首页最近文章、归档以外的摘要、搜索和页面元信息。"
publishedAt: "2026-08-20T09:37:39+08:00"
tags:
  - "工程实践"
  - "站点与博客"
  - "教程"
draft: false
---
```

#### 2.2 头部字段说明

- `title`、`description`、`publishedAt`、`draft`、正文都必填，不能留空。
- `publishedAt` 必须加英文引号，格式为 `"YYYY-MM-DDTHH:mm:ss+08:00"`（上海时间）。不要写成无引号的 YAML 日期，也不要写 UTC 的 `Z`。
- `description` 会出现在首页「最近文章」，最多显示两行。
- `tags` 可省略或写成 `tags: []`。同一篇文章内标签不得重复，也不需要预先登记。不同标签若生成相同网址，构建会失败（草稿也参与检查）。
- 本站没有分类（`categories`），只有标签。宽屏文章页会按二级、三级标题自动生成右侧目录，不需要写 `toc: true`。
- 本站没有文章评论框，不需要写 `comments`。
- 页面不展示更新时间，不要写 `updated` 或 `updatedAt`。

#### 2.3 说说头部

说说没有标题和标签，只允许两个字段：

```yaml
---
publishedAt: "2026-08-20T09:37:39+08:00"
draft: false
---
今天把内容发布流程记成教程。
```

可以说纯文字、纯图，或两者都有，但正文不能为空。说说没有独立详情页，只出现在 `/shuoshuo/`；过长内容在卡片里点「展开」。说说不进入站内搜索、标签和归档，RSS 只收录摘要。

#### 2.4 编写 Markdown 正文

头部下方使用普通 Markdown 即可，不需要写组件代码。站点会自动渲染：

1. 二级、三级标题进入右侧目录（视口足够宽时显示），并带标题锚点。
2. 代码块使用 Kraft 纸面配色；可加文件名、行高亮和 diff。
3. 公式使用 KaTeX：行内 `$E=mc^2$`，块级用 `$$...$$`。
4. GitHub 风格提示块：`NOTE` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION`。
5. 原生 `<details>` 折叠、GFM 表格、任务列表、脚注、删除线。

图片用外部地址：

```markdown
![图片说明](https://example.com/your-image.png)
```

更完整的基础语法见 [Markdown快速上手语法](/posts/markdown-quick-start/)。

#### 2.5 正文能力示例（可直接对照本页效果）

提示块：

```markdown
> [!NOTE]
> 这是备注，适合补充阅读提示。

> [!TIP]
> 这是提示，适合写更稳妥的做法。
```

> [!NOTE]
> 这是备注，适合补充阅读提示。

> [!TIP]
> 这是提示，适合写更稳妥的做法。

公式：

```markdown
行内公式 $E = mc^2$。

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

行内公式 $E = mc^2$。

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

带文件名和行高亮的代码块：

````markdown
```js title="example.js" {2}
const keep = 1;
const highlight = 2;
```
````

```js title="example.js" {2}
const keep = 1;
const highlight = 2;
```

diff 标记写在行尾：

````markdown
```js
const before = 1; // [!code --]
const after = 2; // [!code ++]
```
````

```js
const before = 1; // [!code --]
const after = 2; // [!code ++]
```

折叠块：

```html
<details>
  <summary>点击展开</summary>

  这里是折叠起来的补充说明。
</details>
```

<details>
<summary>点击展开</summary>

这里是折叠起来的补充说明。
</details>

### 步骤 3：本地预览

编辑完成后先在本地看，再发布。

#### 3.1 看版式和正文

```bash
npm run dev
```

浏览器打开 `http://localhost:4321`。改 Markdown 会热更新。

#### 3.2 看搜索（必须用生产预览）

搜索依赖构建时生成的 Pagefind 索引。`npm run dev` 下顶栏放大镜会空着，这是正常的。需要验收搜索时，先停掉开发服务器（Ctrl+C），再执行：

```bash
npm run build
npm run preview
```

仍打开 `http://localhost:4321`。搜索入口是顶栏放大镜；焦点不在输入框时按 `/` 也可打开。搜索只覆盖已发布技术文章，说说、关于页和公式不会进索引。

#### 3.3 验证清单

1. 新文章是否出现在首页「最近文章」、`/archives/`、对应 `/tags/.../`，正文地址是否为 `/posts/<slug>/`。
2. 宽屏下右侧目录是否出现（至少要有二级或三级标题）；无此类标题时整块不渲染。
3. 代码块、公式、提示块、脚注是否按预期渲染。
4. 新说说是否出现在首页「最近说说」和 `/shuoshuo/`，锚点能否定位。
5. `draft: true` 的内容是否从上述所有入口消失。

### 步骤 4：发布到线上

本地确认无误后，在 `main` 分支执行：

```bash
npm run publish -- "发布内容发布教程"
```

引号里的文字会原样成为 Git 提交说明，不能为空。

#### 4.1 命令实际做了什么

1. 对齐网上的版本（只能快进，不会自动合并冲突）。
2. 跑完整 `npm test`（含生产构建）。
3. 把当前工作区打成一次提交并推到网上。
4. Cloudflare Pages 随后构建，几分钟后出现在 [jasper0507.me](https://jasper0507.me/)。

#### 4.2 发布注意点

1. 不在主线、连不上网、没有改动、或检查没通过时，都不会发布。
2. 网上已有更新且没法自动接上时，文件都还在，不会留下「只在本地、不在网上」的半成品提交。
3. 没能发到网上时，内容仍在本地，改完可以再执行同一条发布命令。
4. `draft` 才是公开开关：推上去的草稿仍然不会出现在站点上。

## 二、与旧版 Hexo 站点的对应关系

| 旧版（Hexo + Icarus）               | 现行站点                           |
| ----------------------------------- | ---------------------------------- |
| `hexo n "标题"`                     | `npm run new:post -- 路径名`       |
| `source/_drafts/` 与 `hexo publish` | 头部 `draft: true` / `false`       |
| `hexo s`（端口 4000）               | `npm run dev`（端口 4321）         |
| `hexo clean && hexo g -d`           | `npm run publish -- "提交说明"`    |
| `date` / `updated`                  | 只有 `publishedAt`，不展示更新时间 |
| `excerpt`                           | `description`                      |
| `categories`                        | 已取消，只用 `tags`                |
| `toc: true`                         | 有二、三级标题即自动生成目录       |
| `comments: true` / Gitalk           | 无评论模块                         |
| 文章配图文件夹                      | 外部图床，Markdown 图片语法        |
| MathJax                             | KaTeX（`$...$` / `$$...$$`）       |

## 三、本站专属注意事项

### 1. 不要手改布局源码

日常只编辑：

- 技术文章：`src/content/posts/`
- 说说：`src/content/shuoshuo/`
- 关于我：`src/content/about.md`（可空，但不能删除这个文件）
- 站点名称、网址、主视觉、页脚：根目录 `blog.config.ts`

页面组件和样式不属于日常发布流程。

### 2. 标签与归档

- 标签由你在发布时自行决定，不是预置词表。
- `/tags/` 是标签云；点进去是该标签下的文章列表。
- `/archives/` 按年浏览全部已发布技术文章。
- 说说不出现在标签和归档里。

### 3. 图片

- 技术文章图片放在外部图床，不要指望仓库替你托管正文配图。
- 首页主视觉放在 `public/images/`，在 `blog.config.ts` 里填写以 `/images/` 开头的路径。
- 浏览器图标推荐 `public/favicon.svg`；也可以放在 `public/` 内其它 svg、png、ico，并在 `blog.config.ts` 填写对应路径。

### 4. 搜索

- 只索引 `draft: false` 的技术文章。
- 公式不会进入搜索词。
- 改完文章后若要本地验收搜索，必须重新 `npm run build` 再 `npm run preview`。

## 四、总结

1. 核心流程：`npm run new:post -- 路径名`（或 `npm run new:shuoshuo`）→ 编辑 Markdown 头部和正文 → `npm run publish -- "提交说明"`。想先看版式再用 `npm run dev`。
2. 关键适配：只使用现行字段（`title` / `description` / `publishedAt` / `tags` / `draft`）；目录自动生成；不要再写 Icarus 的 `toc`、`comments`、`categories`、`updated`。
3. 避坑要点：路径名即网址；创建和发布自己会对齐网上版本；搜索必须走 `build` + `preview`。
