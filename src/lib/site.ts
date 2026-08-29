import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { extname, join } from "node:path";
import rawSettings from "../../blog.config.ts";

function publicFile(path: string, prefix = "/") {
  if (!path.startsWith(prefix) || path.includes("..")) {
    throw new Error(`博客资源路径无效：${path}`);
  }
  if (!statSync(join(process.cwd(), "public", path)).isFile()) {
    throw new Error(`博客资源不是文件：public${path}`);
  }
  return path;
}

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());
function resolveBlogSettings(settings: typeof rawSettings) {
  const url = new URL(settings.site.url);
  if (url.protocol !== "https:" || url.pathname !== "/" || /[?#]/u.test(settings.site.url)) {
    throw new Error("博客正式网址必须是 HTTPS 根地址，且不得包含查询或锚点");
  }

  const favicon = publicFile(settings.site.favicon);
  const faviconType = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  }[extname(favicon).toLowerCase()];

  if (!faviconType) throw new Error("浏览器图标只支持 SVG、PNG 或 ICO");
  if (/[{}]/u.test(settings.footer.text.replaceAll("{year}", "").replaceAll("{author}", ""))) {
    throw new Error("页脚只允许使用 {year} 和 {author} 占位符");
  }

  return {
    ...settings,
    site: {
      ...settings.site,
      url: url.href,
      favicon,
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

export const blogSettings = resolveBlogSettings(rawSettings);

if (import.meta.main) {
  const changed = (update: (settings: typeof rawSettings) => void) => {
    const settings = structuredClone(rawSettings);
    update(settings);
    return settings;
  };

  assert.equal(blogSettings.site.url, new URL(rawSettings.site.url).href);
  assert.equal(
    resolveBlogSettings(changed(settings => (settings.site.title = "  Jasper's Blog  "))).site
      .title,
    "  Jasper's Blog  ",
  );

  for (const url of [
    "http://example.com",
    "https://example.com/blog/",
    "https://example.com?from=test",
    "https://example.com#content",
  ]) {
    assert.throws(() => resolveBlogSettings(changed(settings => (settings.site.url = url))));
  }
  for (const url of ["https://127.0.0.1", "https://user@example.com", "https://example.com:8443"]) {
    assert.equal(
      resolveBlogSettings(changed(settings => (settings.site.url = url))).site.url,
      new URL(url).href,
    );
  }

  assert.throws(() =>
    resolveBlogSettings(
      changed(settings => (settings.home.hero.lightImage = "/images/missing-config-check.jpg")),
    ),
  );
  assert.throws(() =>
    resolveBlogSettings(changed(settings => (settings.site.favicon = "/images/hero-light.jpg"))),
  );
  assert.throws(() =>
    resolveBlogSettings(changed(settings => (settings.footer.text = "© {year} {owner}"))),
  );

  console.log("博客设置验收通过");
}
