import { z } from "astro/zod";
import rawSettings from "../../blog.config.ts";

declare const process: {
  getBuiltinModule(name: "fs"): {
    readFileSync(path: string | URL, encoding: "utf8"): string;
  };
};

const { readFileSync } = process.getBuiltinModule("fs");
const aboutMarkdownPath = "src/content/about.md";

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
  })
  .transform(settings =>
    Object.freeze({
      site: Object.freeze({
        ...settings.site,
        headerTitle: settings.site.headerTitle ?? settings.site.title,
        url: new URL(settings.site.url).href,
      }),
      author: Object.freeze(settings.author),
    }),
  );

export type BlogSettings = z.input<typeof blogSettingsSchema>;

const settingNames = new Map([
  ["site", "博客身份"],
  ["site.title", "博客名称"],
  ["site.headerTitle", "页头短名称"],
  ["site.url", "正式网址"],
  ["site.description", "默认简介"],
  ["author", "作者设置"],
  ["author.name", "作者显示名"],
  ["author.github", "GitHub 地址"],
  ["author.email", "邮箱地址"],
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

export function validateBlogSettings(input: unknown) {
  const result = blogSettingsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`博客设置无效：\n${result.error.issues.map(formatIssue).join("\n")}`);
  }
  return result.data;
}

/** 所有消费者只读取这一份已校验博客设置。 */
assertAboutMarkdownExists();
export const blogSettings = validateBlogSettings(rawSettings);

/** 首页主视觉的现有配置。 */
export const siteConfig = {
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
    alt: `${blogSettings.author.name} 的博客主视觉`,
  },
} as const;
