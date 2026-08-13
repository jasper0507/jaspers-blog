# 博客设置系统设计

状态：已确认（2026-08-11）

## 目标

为博客搭建者提供一个不需要理解页面源码的个性化入口。博客搭建者在根目录 `blog.config.ts` 集中填写博客设置；不适合放进设置文件的长篇内容和图片，也能从该文件直接找到编辑位置。

当前系统服务本私有博客的搭建与维护。未来公开模板仓库不属于本轮范围。

## 非目标

- 不提供图形化后台、初始化向导或新的配置命令。
- 不开放导航、配色、字体、布局、栏目和内容规则。
- 不支持自由拖动布局、新建栏目、组件替换或任意 HTML。
- 不增加头像或 Logo；只新增可选的浏览器图标。
- 不使用环境变量覆盖博客设置，不保留旧配置入口或隐藏回退。

## 搭建者流程

1. 打开 `blog.config.ts`，按分组修改全部支持的博客设置。
2. 按文件内注释替换 `public/images/` 中的图片，或编辑固定的 `src/content/about.md`。
3. 运行现有的 `npm run dev` 预览。
4. 无效设置会阻止开发服务器启动或构建，并以中文指出位置和修正方向。
5. 继续使用现有 Git 推送和 Cloudflare Pages 发布流程。

博客设置不承载技术文章字段。作者使用 `npm run new:post -- <slug>` 创建文章；命令只接受不带扩展名的小写 ASCII 路径名，自动填写完整的当前上海时间 `YYYY-MM-DDTHH:mm:ss+08:00`。技术文章不维护 `updatedAt`，标题、摘要或正文未完成以及未知 frontmatter 字段都会阻止构建。

## 设置文件

文件完整列出当前支持的设置，并使用当前 Jasper 博客信息作为可运行值。可选值仍保留中文注释，避免形成隐藏配置。

```ts
import type { BlogSettings } from "./src/lib/site";

export default {
  site: {
    title: "Jasper's Blog",
    headerTitle: "JaspersBlog",
    url: "https://blog.jasper0507.cc.cd",
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
    // 可选 1:1 图标；优先方形 SVG，PNG/ICO 至少包含 32×32 表示。
    favicon: undefined,
  },
  author: {
    name: "Jasper",
    github: "https://github.com/jasper0507",
    email: "jasper0507.self@gmail.com",
  },
  home: {
    hero: {
      caption: "Talk is cheap. Show me the code.",
      // 3:2，推荐 960×640 或更高；非 3:2 图片居中裁切且不拉伸。
      lightImage: "/images/hero-light.svg",
      // 可选；应与亮图尺寸及主体位置一致，未填写时复用亮图。
      darkImage: "/images/hero-dark.svg",
      // 图片有表达内容时填写描述；纯装饰图片明确填写空字符串。
      alt: "Jasper 的博客主视觉",
    },
  },
  footer: {
    // 受限 Markdown；支持文字、链接、粗体、斜体、换行、{year} 和 {author}。
    content: "© {year} {author}. 保留所有权利。",
  },
  // “关于我”长篇正文固定编辑：src/content/about.md（文件可为空，但不能缺失）。
} satisfies BlogSettings;
```

### 字段合同

| 字段                   | 规则                               | 使用位置                                    |
| ---------------------- | ---------------------------------- | ------------------------------------------- |
| `site.title`           | 必填、非空                         | 页面标题、Open Graph、RSS 和默认品牌名      |
| `site.headerTitle`     | 可选；最终页头名称最多 16 个字符   | 页头文字品牌及其无障碍名称                  |
| `site.url`             | 必填；仅接受 HTTPS 域名根地址      | Astro `site`、Canonical URL、RSS 和站点地图 |
| `site.description`     | 必填、非空                         | 默认页面简介、SEO 和 RSS 简介               |
| `site.favicon`         | 可选；项目内存在的 SVG、PNG 或 ICO | 浏览器标签页和书签                          |
| `author.name`          | 必填、非空                         | 页脚占位符、关于页元信息和文章结构化数据    |
| `author.github`        | 必填、有效的 GitHub HTTPS 地址     | 页脚                                        |
| `author.email`         | 必填、有效邮箱                     | 页脚                                        |
| `home.hero.caption`    | 必填、非空                         | 首页可见主标题                              |
| `home.hero.lightImage` | 必填、项目内存在的图片             | 亮色首页主视觉                              |
| `home.hero.darkImage`  | 可选；未填时使用亮色图             | 暗色首页主视觉                              |
| `home.hero.alt`        | 字段必需；允许空字符串表示装饰图   | 首页主视觉无障碍说明                        |
| `footer.content`       | 字段必需；允许空字符串             | 页脚左侧内容                                |

博客名称、作者名和简介只填写一次。页面说明、RSS、SEO、版权年份与文章作者结构化数据从这些值生成，不提供重复设置。

### 正式网址

正式网址必须类似 `https://example.com`：

- 不接受 HTTP、用户名密码、子路径、查询参数或锚点。
- 输入有无末尾 `/` 均可，内部统一为域名根地址。
- 本地 `npm run dev` 仍使用本地地址，不受影响。
- GitHub Pages 仓库子路径等部署方式不在本轮支持范围。

### 本地图片

- 首页主视觉和浏览器图标只接受 `public/images/` 下的本地文件，不接受外部网址或 `..` 路径。
- 设置文件使用以 `/images/` 开头的公开路径，校验阶段确认对应文件存在且扩展名受支持。
- 浏览器图标必须为 1:1；优先使用方形 viewBox 的 SVG，PNG 或 ICO 至少提供 32×32 表示。
- 亮暗主视觉均应为 3:2，推荐 960×640 或更高，并保持相同尺寸和主体位置；比例不同的图片会居中裁切，不拉伸，也不改变首页布局。
- 暗色图省略时只渲染并复用亮色图，避免输出两个相同资源。

### 关于页面

长篇自我介绍固定存放在 `src/content/about.md`，不允许在配置中改变路径。设置文件只用注释明确指出该位置：

- 文件不存在时构建失败，提示恢复文件。
- “关于我”的全部可见正文只由该 Markdown 文件生成，页面组件不自动追加姓名、GitHub、邮箱或其他内容。
- Markdown 可以自行包含联系方式，但不会与博客设置中的 GitHub 或邮箱自动同步。
- 文件存在但为空时正常发布完全空白的可见正文区域，尊重博客搭建者的选择。
- 页头“关于”导航始终保留。

### 页脚内容

`footer.content` 只替换当前页脚左侧版权文字区域。右侧 RSS、GitHub 和邮箱保持现有名称、顺序与排版。

处理顺序：

1. 将 `{year}` 替换为上海时区的当前年份，将 `{author}` 替换为 `author.name`；两者都不是必需的。
2. 未知的花括号占位符使构建失败并指出名称。
3. 将内容解析为 Markdown，并只允许段落、普通文字、链接、粗体、斜体和换行。
4. HTML、图片、标题、列表、引用、分隔线和行内或块级代码均使构建失败，而不是被静默删除。
5. 链接只允许 `https://`、`mailto:` 和以 `/` 开头的本站地址；拒绝 HTTP、`javascript:`、`data:` 和无法识别的地址。

桌面端保持“自定义内容在左、固定链接在右”，手机端上下排列。文字和链接允许换行并使用强制断词保护，不设置内容长度上限；空内容时只显示右侧固定链接。

## 内部结构

```text
blog.config.ts（博客搭建者填写）
                 │
                 ▼
src/lib/site.ts（严格校验、补齐可选值、检查资源）
                 │
                 ▼
         一份只读的已校验博客设置
          ├─ astro.config.mjs
          ├─ BaseLayout 与首页
          ├─ 关于页面与单篇文章结构化数据
          ├─ RSS 与站点地图
          └─ 页脚 Markdown 渲染
```

- 复用项目已有的 TypeScript、Astro Zod 和 Markdown 处理能力，不增加依赖。
- 所有对象层级执行严格校验；未知字段、无效值和冲突组合均报错。
- `src/lib/site.ts` 是原始设置与所有消费者之间的唯一边界。消费者不读取 `blog.config.ts`，不自行补默认值，也不保留个人信息硬编码。
- 可选页头短名称未填写时使用博客名称；替换后的最终值仍必须满足 16 字符限制。
- 可选暗色图未填写时使用亮色图；可选浏览器图标未填写时不输出对应标签。
- 页脚先通过 Markdown 语法树白名单验证，再渲染为 HTML；不接受原始 HTML，也不静默清理禁止内容。

## 一次性迁移

1. 新建根目录 `blog.config.ts` 并填入当前站点值。
2. 将现有 `src/lib/site.ts` 收拢为统一的设置校验与读取边界。
3. 把 `astro.config.mjs`、`BaseLayout.astro`、首页、关于页、文章结构化数据和 RSS 中的个人信息改为读取已校验设置。
4. 将现有“关于我”的两段介绍文字迁入 `src/content/about.md`，删除正文中的 GitHub 与邮箱列表；联系方式只保留在全站页脚。
5. 添加可选浏览器图标输出和受限页脚 Markdown 渲染。
6. 删除旧设置结构与所有 Jasper 信息回退，不增加兼容层。
7. 更新 README 配置说明，使其首先指向 `blog.config.ts`，并说明固定内容和图片位置。

## 验收

- 除“关于我”正文不再重复显示 GitHub 与邮箱外，当前 `blog.config.ts` 构建后的公开页面与现状一致；新增浏览器图标未设置时不产生额外标签。
- 一条最小配置检查覆盖：未知字段、缺失必填项、无效正式网址、缺失本地图片、暗色图回退、空图片说明、缺失与空“关于我”文件、禁止的页脚 Markdown、危险链接和未知占位符。
- 整站检查确认博客名称、作者、简介、正式网址、GitHub、邮箱和页脚内容在 HTML、RSS、站点地图与结构化数据中来自同一设置。
- 浏览器冒烟覆盖桌面和手机下的 3:2 主视觉裁切、超长页脚文字换行、空页脚内容以及亮暗主题切换。
- 完成前运行 `npm test`、`npm run build` 和 `git diff --check`。

## 依据

- [同类项目配置设计调研](../research/user-defined-configurations.md)
- [ADR-0020：使用 TypeScript 文件承载博客设置](../adr/0020-typescript-blog-settings-file.md)
- [ADR-0021：全站只使用一份已校验的博客设置](../adr/0021-single-validated-blog-settings.md)
