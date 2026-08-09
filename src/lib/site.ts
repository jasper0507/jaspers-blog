/** 站点级配置：作者改这里并替换资源后重新构建即可。 */
export const siteConfig = {
  title: "Jasper's Blog",
  hero: {
    /** 主视觉上方一句 caption（可见 h1） */
    caption: "Talk is cheap. Show me the code.",
    /** 亮色主题主视觉 */
    src: "/images/hero-light.svg",
    /** 暗色主题主视觉 */
    srcDark: "/images/hero-dark.svg",
    /** 共用固有宽高（横图，约 3:2），防止布局偏移 */
    width: 960,
    height: 640,
    /** 共用 alt */
    alt: "Jasper 的博客主视觉",
  },
} as const;
