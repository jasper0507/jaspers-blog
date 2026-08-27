import { statSync } from "node:fs";
import { extname, join } from "node:path";
import rawSettings from "../../blog.config.ts";

export type BlogSettings = {
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
      lightImage: string;
      darkImage: string;
      alt: string;
    };
  };
  footer: {
    text: string;
  };
};

function publicFile(path: string, prefix = "/") {
  if (!path.startsWith(prefix) || path.includes("..")) {
    throw new Error(`博客资源路径无效：${path}`);
  }
  if (!statSync(join(process.cwd(), "public", path)).isFile()) {
    throw new Error(`博客资源不存在：public${path}`);
  }
  return path;
}

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());
const siteUrl = new URL(rawSettings.site.url);
if (siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash) {
  throw new Error("博客正式网址必须是域名根地址");
}
const faviconType = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
}[extname(rawSettings.site.favicon).toLowerCase()];

if (!faviconType) throw new Error("浏览器图标只支持 SVG、PNG 或 ICO");

export const blogSettings = {
  ...rawSettings,
  site: {
    ...rawSettings.site,
    url: siteUrl.href,
    favicon: publicFile(rawSettings.site.favicon),
    faviconType,
  },
  home: {
    hero: {
      ...rawSettings.home.hero,
      lightImage: publicFile(rawSettings.home.hero.lightImage, "/images/"),
      darkImage: publicFile(rawSettings.home.hero.darkImage, "/images/"),
    },
  },
  footer: {
    copyright: rawSettings.footer.text
      .replaceAll("{year}", year)
      .replaceAll("{author}", rawSettings.author.name),
  },
};
