type BlogSettings = {
  site: {
    title: string;
    headerTitle: string;
    url: string;
    description: string;
    favicon: string;
  };
  author: {
    name: string;
    github: string;
    email: string;
  };
  home: {
    hero: {
      caption: string;
      alt: string;
    };
  };
  footer: {
    text: string;
  };
};

export default {
  site: {
    title: "Jasper's Blog",
    headerTitle: "JaspersBlog",
    url: "https://jasper0507.me",
    description: "Jasper 的个人技术博客，记录技术文章与说说。",
    favicon: "/favicon.svg",
  },
  author: {
    name: "Jasper",
    github: "https://github.com/jasper0507",
    email: "jasper0507.self@gmail.com",
  },
  home: {
    hero: {
      caption: "喊黑夜吻白天。",
      alt: "首页风景照片",
    },
  },
  footer: {
    text: "© {year} {author}. 保留所有权利。",
  },
} satisfies BlogSettings;
