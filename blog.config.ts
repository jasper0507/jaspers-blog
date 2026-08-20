import type { BlogSettings } from "./src/lib/site.ts";

export default {
  /** 博客身份中的站点信息：名称、正式网址和默认简介；另列可选浏览器图标。 */
  site: {
    /** 博客名称：用于页面标题、Open Graph 和 RSS。 */
    title: "Jasper's Blog",
    /** 可选页头短名称；省略时使用博客名称，建议最终名称不超过 16 个字符。 */
    headerTitle: "JaspersBlog",
    /** 正式网址：填写完整的 HTTPS 域名根地址。 */
    url: "https://jasper0507.me",
    /** 默认简介：用于没有单独简介的页面元信息和 RSS。 */
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
    /** 可选 1:1 浏览器图标；优先方形 SVG，PNG/ICO 至少包含 32×32 表示。 */
    favicon: "/favicon.svg",
  },
  /** 作者：显示名补全博客身份，并与固定公开联系方式集中填写。 */
  author: {
    /** 作者显示名：用于页脚、关于页元信息和文章结构化数据。 */
    name: "Jasper",
    /** GitHub 个人主页：填写 HTTPS 地址。 */
    github: "https://github.com/jasper0507",
    /** 公开邮箱：用于页脚联系链接。 */
    email: "jasper0507.self@gmail.com",
  },
  /** 首页主视觉：亮暗图片均为 3:2、推荐 960×640 或更高。 */
  home: {
    hero: {
      /** 首页主视觉上方的一句话。 */
      caption: "喊黑夜吻白天。",
      /** 亮色主视觉：3:2，推荐 960×640 或更高；非 3:2 图片居中裁切且不拉伸。 */
      lightImage: "/images/hero-light.jpg",
      /** 可选 3:2 暗色主视觉；应与亮图尺寸及主体位置一致，省略时复用亮图。 */
      darkImage: "/images/hero-dark.jpg",
      /** 图片有表达内容时填写说明；纯装饰图片明确填写空字符串。 */
      alt: "暮色下的山脊，天光与夜色在地平线交界",
    },
  },
  /** 页脚：左侧纯文本；右侧 RSS、GitHub 与邮箱保持固定。 */
  footer: {
    /** 可留空；按字面显示。可用 {year}、{author}，不支持 Markdown。 */
    text: "© {year} {author}. 保留所有权利。",
  },
  /** “关于我”正文固定编辑：src/content/about.md（文件可为空，但不能缺失）。 */
} satisfies BlogSettings;
