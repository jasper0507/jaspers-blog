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
} satisfies BlogSettings;
