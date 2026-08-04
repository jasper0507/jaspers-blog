/** 站点级配置：作者改这里并替换资源后重新构建即可。 */
export const siteConfig = {
  title: "Jasper's Blog",
  hero: {
    /** 亮色主题主视觉 */
    src: "/images/hero-light.svg",
    /** 暗色主题主视觉 */
    srcDark: "/images/hero-dark.svg",
    /** 共用固有宽高，防止布局偏移 */
    width: 560,
    height: 700,
    /** 共用 alt */
    alt: "Jasper 的博客主视觉",
  },
} as const;
