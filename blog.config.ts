import type { BlogSettings } from "./src/lib/site.ts";

export default {
  /** 博客身份中的站点信息：名称、正式网址和默认简介；另列可选浏览器图标。 */
  site: {
    /** 博客名称：用于页面标题、Open Graph 和 RSS。 */
    title: "Jasper's Blog",
    /** 可选页头短名称；省略时使用博客名称，最终名称最多 16 个字符。 */
    headerTitle: "JaspersBlog",
    /** 正式网址：只接受 HTTPS 域名根地址。 */
    url: "https://blog.jasper0507.cc.cd",
    /** 默认简介：用于没有单独简介的页面元信息和 RSS。 */
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
    /** 可选 1:1 浏览器图标；优先方形 SVG，PNG/ICO 至少包含 32×32 表示。 */
    favicon: undefined,
  },
  /** 作者：显示名补全博客身份，并与固定公开联系方式集中填写。 */
  author: {
    /** 作者显示名：用于页脚、关于页元信息和文章结构化数据。 */
    name: "Jasper",
    /** GitHub 个人主页：必须是 HTTPS 地址。 */
    github: "https://github.com/jasper0507",
    /** 公开邮箱：用于页脚联系链接。 */
    email: "jasper0507.self@gmail.com",
  },
  /** 首页开场：标题句承载作者声音；占位主视觉已按 ADR-0020 移除。 */
  home: {
    /** 首页大标题：一句作者声音的话。 */
    headline: "喊黑夜吻白天。",
  },
  /** 页脚：左侧纯文本；右侧 RSS、GitHub 与邮箱保持固定。 */
  footer: {
    /** 可留空；按字面显示。可用 {year}、{author}，不支持 Markdown。 */
    text: "© {year} {author}. 保留所有权利。",
  },
  /** “关于我”正文固定编辑：src/content/about.md（文件可为空，但不能缺失）。 */
} satisfies BlogSettings;
