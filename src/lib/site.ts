import { realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, sep } from "node:path";
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

/** Astro 预渲染会把本文件打进 dist，不能用 import.meta.url 回溯仓库根。 */
const repoRoot = process.cwd();

const faviconTypes: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function fail(message: string): never {
  throw new Error(`博客设置无效：${message}`);
}

function isBlank(value: string | undefined) {
  return value === undefined || value.trim() === "";
}

function filled(value: string | undefined) {
  return isBlank(value) ? undefined : value;
}

function required(label: string, value: string) {
  if (isBlank(value)) fail(`${label}不能为空；请填写非空文本。`);
  return value;
}

function assertLocalPublicFile(
  label: string,
  value: string,
  root: string,
  options: { folder: string; prefix: string; area: string; extensions?: string[] },
) {
  const { folder, prefix, area, extensions } = options;
  const segments = value.split("/");
  if (
    !value.startsWith(prefix) ||
    value.includes("\\") ||
    /[%?#]/.test(value) ||
    segments.some(segment => segment === "." || segment === "..")
  ) {
    fail(`${label}只接受 ${area} 中以 ${prefix} 开头的本地路径，不能使用外部 URL 或路径穿越。`);
  }

  const extension = extname(value).toLowerCase();
  if (extensions && !extensions.includes(extension)) {
    fail(`${label}只支持 ${extensions.map(item => item.slice(1).toUpperCase()).join("、")} 文件。`);
  }

  const publicRoot = join(root, "public");
  const parent = join(publicRoot, folder);
  const candidate = join(publicRoot, value.replace(/^\/+/, ""));

  try {
    const resolved = realpathSync(candidate);
    const parentPath = realpathSync(parent);
    const relativePath = relative(parentPath, resolved);
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      fail(`${label}只接受 ${area} 中的本地文件，不能通过符号链接指向外部路径。`);
    }
    if (!statSync(resolved).isFile()) {
      fail(`${label}文件不存在；请检查 public${value}。`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("博客设置无效：")) throw error;
    const code = (error as { code?: string }).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      fail(`${label}文件不存在；请检查 public${value}。`);
    }
    if (code === "ELOOP") {
      fail(`${label}文件路径包含循环符号链接；请改用普通文件。`);
    }
    throw error;
  }
}

export function resolveBlogSettings(settings: BlogSettings, root = repoRoot) {
  const title = required("博客名称", settings.site.title);
  const description = required("默认简介", settings.site.description);
  const headerTitle = filled(settings.site.headerTitle);
  const favicon = filled(settings.site.favicon);
  const name = required("作者显示名", settings.author.name);
  const github = required("GitHub 地址", settings.author.github);
  const email = required("邮箱地址", settings.author.email);
  const caption = required("首页 caption", settings.home.hero.caption);
  const lightImage = required("亮色主视觉", settings.home.hero.lightImage);
  const darkImage = filled(settings.home.hero.darkImage);
  const alt = settings.home.hero.alt;
  const footerText = settings.footer.text;

  if (alt !== "" && isBlank(alt)) {
    fail("主视觉图片说明若用于装饰图，必须明确填写空字符串。");
  }

  let url: string;
  try {
    url = new URL(required("正式网址", settings.site.url)).href;
  } catch (error) {
    if (error instanceof TypeError) fail("正式网址必须是完整网址，例如 https://example.com/。");
    throw error;
  }

  assertLocalPublicFile("亮色主视觉", lightImage, root, {
    folder: "images",
    prefix: "/images/",
    area: "public/images/",
  });
  if (darkImage) {
    assertLocalPublicFile("暗色主视觉", darkImage, root, {
      folder: "images",
      prefix: "/images/",
      area: "public/images/",
    });
  }

  let faviconType: string | undefined;
  if (favicon) {
    assertLocalPublicFile("浏览器图标", favicon, root, {
      folder: "",
      prefix: "/",
      area: "public/",
      extensions: Object.keys(faviconTypes),
    });
    faviconType = faviconTypes[extname(favicon).toLowerCase()];
  }

  try {
    if (!statSync(join(root, "src/content/about.md")).isFile()) {
      fail("“关于我” Markdown 文件缺失；请恢复固定文件 src/content/about.md。");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("博客设置无效：")) throw error;
    const code = (error as { code?: string }).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      fail("“关于我” Markdown 文件缺失；请恢复固定文件 src/content/about.md。");
    }
    throw error;
  }

  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date());

  return {
    site: {
      title,
      headerTitle: headerTitle ?? title,
      url,
      description,
      favicon,
      faviconType,
    },
    author: {
      name,
      github,
      email,
    },
    home: {
      hero: {
        caption,
        lightImage,
        darkImage: darkImage ?? lightImage,
        alt,
      },
    },
    footer: {
      text: footerText,
      copyright: isBlank(footerText)
        ? ""
        : footerText.replaceAll("{year}", year).replaceAll("{author}", name),
    },
  };
}

export const blogSettings = resolveBlogSettings(rawSettings);
