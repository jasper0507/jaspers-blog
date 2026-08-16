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
  /** 首页主视觉：亮暗图片均为 3:2、推荐 960×640 或更高。 */
  home: {
    hero: {
      /** 首页主视觉上方的一句话。 */
      caption: "Talk is cheap. Show me the code.",
      /** 亮色主视觉：3:2，推荐 960×640 或更高；非 3:2 图片居中裁切且不拉伸。 */
      lightImage: "/images/hero-light.svg",
      /** 可选 3:2 暗色主视觉；应与亮图尺寸及主体位置一致，省略时复用亮图。 */
      darkImage: "/images/hero-dark.svg",
      /** 图片有表达内容时填写说明；纯装饰图片明确填写空字符串。 */
      alt: "Jasper 的博客主视觉",
    },
  },
  /** “关于我”正文固定编辑：src/content/about.md（文件可为空，但不能缺失）。 */
} satisfies BlogSettings;
