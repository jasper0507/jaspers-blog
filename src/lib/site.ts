import { z } from "astro/zod";
import rawSettings from "../../blog.config.ts";

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
  })
  .transform(settings =>
    Object.freeze({
      site: Object.freeze({
        ...settings.site,
        headerTitle: settings.site.headerTitle ?? settings.site.title,
        url: new URL(settings.site.url).href,
      }),
    }),
  );

export type BlogSettings = z.input<typeof blogSettingsSchema>;

const settingNames = new Map([
  ["site", "博客身份"],
  ["site.title", "博客名称"],
  ["site.headerTitle", "页头短名称"],
  ["site.url", "正式网址"],
  ["site.description", "默认简介"],
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
    alt: "Jasper 的博客主视觉",
  },
} as const;
