import { statSync } from "node:fs";
import { isIP } from "node:net";
import { extname, join } from "node:path";
import { z } from "astro/zod";
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

const visibleText = z.string().trim().min(1);
const siteUrl = z
  .string()
  .trim()
  .refine(value => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        url.hostname.includes(".") &&
        isIP(url.hostname) === 0 &&
        (value === url.origin || value === `${url.origin}/`)
      );
    } catch {
      return false;
    }
  }, "正式网址必须是 HTTPS 域名根地址，且不得包含账号、端口、查询或锚点");
const githubUrl = z
  .string()
  .trim()
  .regex(
    /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/,
    "GitHub 地址必须是用户主页 https://github.com/<用户名>",
  );
const footerText = z
  .string()
  .trim()
  .refine(
    value => !/[{}]/u.test(value.replaceAll("{year}", "").replaceAll("{author}", "")),
    "页脚只允许使用 {year} 和 {author} 占位符",
  );
const blogSettingsSchema = z
  .object({
    site: z
      .object({
        title: visibleText,
        headerTitle: visibleText,
        url: siteUrl,
        description: visibleText,
        favicon: z.string().trim().min(1),
      })
      .strict(),
    author: z
      .object({
        name: visibleText,
        github: githubUrl,
        email: z.string().trim().pipe(z.email()),
      })
      .strict(),
    home: z
      .object({
        hero: z
          .object({
            caption: visibleText,
            lightImage: z.string().trim().min(1),
            darkImage: z.string().trim().min(1),
            alt: visibleText,
          })
          .strict(),
      })
      .strict(),
    footer: z.object({ text: footerText }).strict(),
  })
  .strict();

function publicFile(path: string, prefix = "/") {
  if (!path.startsWith(prefix) || path.includes("..")) {
    throw new Error(`博客资源路径无效：${path}`);
  }
  try {
    if (statSync(join(process.cwd(), "public", path)).isFile()) return path;
  } catch {
    // 统一成面向配置作者的错误，不泄漏底层 stat 细节。
  }
  throw new Error(`博客资源不存在：public${path}`);
}

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());
export function parseBlogSettings(input: unknown) {
  const result = blogSettingsSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("；");
    throw new Error(`博客配置无效：${issues}`);
  }

  const settings = result.data;
  const faviconType = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  }[extname(settings.site.favicon).toLowerCase()];

  if (!faviconType) throw new Error("浏览器图标只支持 SVG、PNG 或 ICO");

  return {
    ...settings,
    site: {
      ...settings.site,
      url: new URL(settings.site.url).href,
      favicon: publicFile(settings.site.favicon),
      faviconType,
    },
    home: {
      hero: {
        ...settings.home.hero,
        lightImage: publicFile(settings.home.hero.lightImage, "/images/"),
        darkImage: publicFile(settings.home.hero.darkImage, "/images/"),
      },
    },
    footer: {
      copyright: settings.footer.text
        .replaceAll("{year}", year)
        .replaceAll("{author}", settings.author.name),
    },
  };
}

export const blogSettings = parseBlogSettings(rawSettings);
