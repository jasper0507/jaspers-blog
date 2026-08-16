import { z } from "astro/zod";
import rawSettings from "../../blog.config.ts";

declare const process: {
  getBuiltinModule(name: "fs"): {
    readFileSync(path: string | URL, encoding: "utf8"): string;
    realpathSync(path: string | URL): string;
    statSync(path: string | URL): { isFile(): boolean };
  };
  getBuiltinModule(name: "path"): {
    isAbsolute(path: string): boolean;
    relative(from: string, to: string): string;
    sep: string;
  };
};

const { readFileSync, realpathSync, statSync } = process.getBuiltinModule("fs");
const { isAbsolute, relative, sep } = process.getBuiltinModule("path");
const aboutMarkdownPath = "src/content/about.md";
const publicImageDirectory = realpathSync("public/images");
const faviconExtensions = ["svg", "png", "ico"];
const footerYearFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
});

function renderFooterText(text: string, author: string, now: Date) {
  const copyright = text
    .replaceAll("{year}", footerYearFormatter.format(now))
    .replaceAll("{author}", author);
  const placeholders = [...copyright.matchAll(/\{([^{}]*)\}/g)].map(match => match[1]);
  if (placeholders.length) {
    throw new Error(
      `页脚文本包含未知占位符“{${[...new Set(placeholders)].join("}、{")}}”；只支持 {year} 和 {author}。`,
    );
  }
  return copyright;
}

export function assertAboutMarkdownExists(path: string | URL = aboutMarkdownPath) {
  try {
    readFileSync(path, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new Error("“关于我” Markdown 文件缺失；请恢复固定文件 src/content/about.md。");
    }
    throw error;
  }
}

const requiredText = (label: string) =>
  z.string().superRefine((value, context) => {
    if (!value.trim()) {
      context.addIssue({ code: "custom", message: `${label}不能为空；请填写非空文本。` });
    } else if (value !== value.trim()) {
      context.addIssue({ code: "custom", message: `${label}首尾不能有空白；请删除多余空白。` });
    }
  });

const localImage = (label: string, extensions: string[]) =>
  z.string().superRefine((value, context) => {
    const segments = value.split("/");
    if (
      !value.startsWith("/images/") ||
      value.includes("\\") ||
      /[%?#]/.test(value) ||
      segments.some(segment => segment === "." || segment === "..")
    ) {
      context.addIssue({
        code: "custom",
        message: `${label}只接受 public/images/ 中以 /images/ 开头的本地路径，不能使用外部 URL 或路径穿越。`,
      });
      return;
    }

    const extension = value.match(/\.([^.\/]+)$/)?.[1].toLowerCase();
    if (!extension || !extensions.includes(extension)) {
      context.addIssue({
        code: "custom",
        message: `${label}扩展名不受支持；请使用 ${extensions.map(item => item.toUpperCase()).join("、")} 图片。`,
      });
      return;
    }

    try {
      const imagePath = realpathSync(`public${value}`);
      const relativeImagePath = relative(publicImageDirectory, imagePath);
      if (
        relativeImagePath === ".." ||
        relativeImagePath.startsWith(`..${sep}`) ||
        isAbsolute(relativeImagePath)
      ) {
        context.addIssue({
          code: "custom",
          message: `${label}只接受 public/images/ 中的本地文件，不能通过符号链接指向外部路径。`,
        });
        return;
      }
      if (!statSync(imagePath).isFile()) {
        context.addIssue({
          code: "custom",
          message: `${label}文件不存在；请检查 public${value}。`,
        });
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "ELOOP") {
        context.addIssue({
          code: "custom",
          message: `${label}文件路径包含循环符号链接；请改用 public/images/ 中的普通文件。`,
        });
        return;
      }
      if (["ENOENT", "ENOTDIR"].includes(code ?? "")) {
        context.addIssue({
          code: "custom",
          message: `${label}文件不存在；请检查 public${value}。`,
        });
        return;
      }
      if (["EACCES", "EPERM"].includes(code ?? "")) {
        context.addIssue({
          code: "custom",
          message: `${label}文件无法读取；请检查 public${value} 的权限。`,
        });
        return;
      }
      throw error;
    }
  });

function getUrlError(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "正式网址必须是完整的 HTTPS 域名根地址，例如 https://example.com/。";
  }

  if (url.protocol !== "https:") return "正式网址必须使用 HTTPS。";
  if (url.username || url.password) return "正式网址不能包含用户名或密码凭据。";
  if (url.port) return "正式网址不能包含自定义端口。";
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
      url.hostname,
    )
  ) {
    return "正式网址必须使用公开域名，不能使用 localhost 或 IP 地址。";
  }
  if (url.pathname !== "/") return "正式网址不能包含子路径。";
  if (url.search) return "正式网址不能包含查询参数。";
  if (url.hash) return "正式网址不能包含锚点。";
}

function getGitHubError(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "GitHub 地址必须是完整的 HTTPS 个人主页，例如 https://github.com/example。";
  }

  if (url.protocol !== "https:") return "GitHub 地址必须使用 HTTPS。";
  if (url.hostname !== "github.com") return "GitHub 地址必须使用 github.com。";
  if (url.username || url.password || url.port || url.search || url.hash) {
    return "GitHub 地址不能包含凭据、端口、查询参数或锚点。";
  }

  const profile = value.match(/^https:\/\/github\.com\/([^/?#]+)\/?$/i);
  if (!profile) return "GitHub 地址必须指向个人主页，不能指向仓库或其他页面。";
  const username = profile[1];
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) || username.includes("--")) {
    return "GitHub 地址中的用户名无效；请填写有效的个人主页地址。";
  }
}

const blogSettingsSchema = z
  .strictObject({
    site: z
      .strictObject({
        title: requiredText("博客名称"),
        headerTitle: requiredText("页头短名称").optional(),
        url: requiredText("正式网址").superRefine((value, context) => {
          const error = getUrlError(value);
          if (error) context.addIssue({ code: "custom", message: error });
        }),
        description: requiredText("默认简介"),
        favicon: localImage("浏览器图标", faviconExtensions).optional(),
      })
      .superRefine((site, context) => {
        if ([...(site.headerTitle ?? site.title)].length > 16) {
          context.addIssue({
            code: "custom",
            path: site.headerTitle === undefined ? ["title"] : ["headerTitle"],
            message: "页头最终显示名称不能超过 16 个字符；请填写更短的页头短名称。",
          });
        }
      }),
    author: z.strictObject({
      name: requiredText("作者显示名"),
      github: requiredText("GitHub 地址").superRefine((value, context) => {
        const error = getGitHubError(value);
        if (error) context.addIssue({ code: "custom", message: error });
      }),
      email: requiredText("邮箱地址").pipe(
        z.email({ message: "邮箱地址必须是有效邮箱，例如 name@example.com。" }),
      ),
    }),
    home: z.strictObject({
      headline: requiredText("首页标题句"),
    }),
    footer: z.strictObject({
      text: z.string(),
    }),
  })
  .transform(settings =>
    Object.freeze({
      site: Object.freeze({
        ...settings.site,
        headerTitle: settings.site.headerTitle ?? settings.site.title,
        url: new URL(settings.site.url).href,
      }),
      author: Object.freeze(settings.author),
      home: Object.freeze({
        headline: settings.home.headline,
      }),
      footer: Object.freeze(settings.footer),
    }),
  );

export type BlogSettings = z.input<typeof blogSettingsSchema>;

const settingNames = new Map([
  ["site", "博客身份中的站点信息"],
  ["site.title", "博客名称"],
  ["site.headerTitle", "页头短名称"],
  ["site.url", "正式网址"],
  ["site.description", "默认简介"],
  ["site.favicon", "浏览器图标"],
  ["author", "作者设置"],
  ["author.name", "作者显示名"],
  ["author.github", "GitHub 地址"],
  ["author.email", "邮箱地址"],
  ["home", "首页设置"],
  ["home.headline", "首页标题句"],
  ["footer", "页脚设置"],
  ["footer.text", "页脚文本"],
]);

function formatIssue(issue: z.core.$ZodIssue) {
  const path = issue.path.join(".");
  const settingName = settingNames.get(path) ?? (path ? `设置 ${path}` : "博客设置");

  if (issue.code === "unrecognized_keys") {
    return `${settingName}包含未知设置“${issue.keys.join("、")}”；请删除或改为 blog.config.ts 中列出的设置。`;
  }
  if (issue.code === "invalid_type") {
    return issue.input === undefined
      ? `${settingName}缺失；请在 blog.config.ts 中填写该设置。`
      : `${settingName}类型错误；请按 blog.config.ts 中的示例填写。`;
  }
  return issue.message;
}

export async function validateBlogSettings(input: unknown, now = new Date()) {
  const result = blogSettingsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`博客设置无效：\n${result.error.issues.map(formatIssue).join("\n")}`);
  }
  try {
    return Object.freeze({
      ...result.data,
      footer: Object.freeze({
        ...result.data.footer,
        copyright: renderFooterText(result.data.footer.text, result.data.author.name, now),
      }),
    });
  } catch (error) {
    throw new Error(`博客设置无效：\n${(error as Error).message}`);
  }
}

/** 所有消费者只读取这一份已校验博客设置。 */
assertAboutMarkdownExists();
export const blogSettings = await validateBlogSettings(rawSettings);
