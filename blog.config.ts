import type { BlogSettings } from "./src/lib/site.ts";

export default {
  /** 博客身份中的站点信息：名称、正式网址和默认简介；另列可选浏览器图标。 */
  site: {
    /** 【必填】博客名称：用于页面标题、Open Graph 和 RSS。 */
    title: "Jasper's Blog",
    /** 【可省略；空字符串或空白视为省略】页头短名称，只用于顶栏；省略或留空时使用博客名称。建议不超过 16 个字符。 */
    headerTitle: "JaspersBlog",
    /** 【必填】正式网址：建议填写 HTTPS 域名根地址。由原生 URL 解析并规范化（例如补尾斜杠）；非法网址会中文报错。 */
    url: "https://jasper0507.me",
    /** 【必填】默认简介：用于没有单独简介的页面元信息和 RSS。 */
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
    /** 【可省略；空字符串或空白视为省略】浏览器图标。推荐 `/favicon.svg`（放在 public/ 根上）；也可指向 public/ 内其它 svg、png、ico。文件必须存在。 */
    favicon: "/favicon.svg",
  },
  /** 作者：显示名补全博客身份，并与固定公开联系方式集中填写。 */
  author: {
    /** 【必填】作者显示名：用于页脚、关于页元信息和文章结构化数据。 */
    name: "Jasper",
    /** 【必填】GitHub 个人主页：建议填写 HTTPS 地址。 */
    github: "https://github.com/jasper0507",
    /** 【必填】公开邮箱：用于页脚联系链接。 */
    email: "jasper0507.self@gmail.com",
  },
  /** 首页主视觉：亮暗图片均为 3:2、推荐 960×640 或更高。 */
  home: {
    hero: {
      /** 【必填】首页主视觉上方的一句话。 */
      caption: "喊黑夜吻白天。",
      /** 【必填】亮色主视觉：路径以 `/images/` 开头，文件须在 public/images/ 中。3:2，推荐 960×640 或更高；非 3:2 居中裁切且不拉伸。 */
      lightImage: "/images/hero-light.jpg",
      /** 【可省略；空字符串或空白视为省略】暗色主视觉；应与亮图尺寸及主体位置一致。省略或留空时复用亮图。路径规则同亮图。 */
      darkImage: "/images/hero-dark.jpg",
      /** 【可空】图片有表达内容时填写说明；纯装饰图填写空字符串 `""`。只含空格会失败。 */
      alt: "暮色下的山脊，天光与夜色在地平线交界",
    },
  },
  /** 页脚：左侧纯文本；右侧 RSS、GitHub 与邮箱保持固定。 */
  footer: {
    /** 【可空】左侧纯文本，空或只含空格则不渲染左侧。可用 {year}、{author}，不支持 Markdown。 */
    text: "© {year} {author}. 保留所有权利。",
  },
  /** “关于我”正文固定编辑：src/content/about.md（【可空】；文件不能缺失）。 */
} satisfies BlogSettings;
