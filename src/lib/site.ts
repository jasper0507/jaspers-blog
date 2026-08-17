import rawSettings from "../../blog.config.ts";

export type BlogSettings = {
  site: {
    title: string;
    headerTitle?: string;
    url: string;
    description: string;
    favicon?: string;
  };
  author: {
    name: string;
    github: string;
    email: string;
  };
  home: {
    hero: {
      caption: string;
      lightImage: string;
      darkImage?: string;
      alt: string;
    };
  };
  footer: {
    text: string;
  };
};

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());

export const blogSettings = {
  ...rawSettings,
  site: {
    ...rawSettings.site,
    headerTitle: rawSettings.site.headerTitle ?? rawSettings.site.title,
    url: new URL(rawSettings.site.url).href,
  },
  home: {
    hero: {
      ...rawSettings.home.hero,
      darkImage: rawSettings.home.hero.darkImage ?? rawSettings.home.hero.lightImage,
    },
  },
  footer: {
    ...rawSettings.footer,
    copyright: rawSettings.footer.text
      .replaceAll("{year}", year)
      .replaceAll("{author}", rawSettings.author.name),
  },
};
