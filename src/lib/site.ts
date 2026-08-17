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

const settings: BlogSettings = rawSettings;

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());

export const blogSettings = {
  ...settings,
  site: {
    ...settings.site,
    headerTitle: settings.site.headerTitle ?? settings.site.title,
    url: new URL(settings.site.url).href,
  },
  home: {
    hero: {
      ...settings.home.hero,
      darkImage: settings.home.hero.darkImage ?? settings.home.hero.lightImage,
    },
  },
  footer: {
    ...settings.footer,
    copyright: settings.footer.text
      .replaceAll("{year}", year)
      .replaceAll("{author}", settings.author.name),
  },
};
