import type { BlogSettings } from "./src/lib/site.ts";

export default {
  site: {
    /** 博客名称：用于页面标题、Open Graph 和 RSS。 */
    title: "Jasper's Blog",
    /** 可选页头短名称；省略时使用博客名称，最终名称最多 16 个字符。 */
    headerTitle: "JaspersBlog",
    /** 正式网址：只接受 HTTPS 域名根地址。 */
    url: "https://blog.jasper0507.cc.cd",
    /** 默认简介：用于没有单独简介的页面元信息和 RSS。 */
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
  },
  author: {
    /** 作者显示名：用于页脚、关于页元信息和文章结构化数据。 */
    name: "Jasper",
    /** GitHub 个人主页：必须是 HTTPS 地址。 */
    github: "https://github.com/jasper0507",
    /** 公开邮箱：用于页脚联系链接。 */
    email: "jasper0507.self@gmail.com",
  },
  /** “关于我”正文固定编辑：src/content/about.md（文件可为空，但不能缺失）。 */
} satisfies BlogSettings;
