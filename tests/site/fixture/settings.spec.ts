import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "@playwright/test";
import { resolveBlogSettings, type BlogSettings } from "../../../src/lib/site.ts";

const year = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
}).format(new Date());

function sample(): BlogSettings {
  return {
    site: {
      title: "示例站",
      url: "https://example.com",
      description: "简介",
      favicon: "/favicon.svg",
    },
    author: {
      name: "作者",
      github: "https://github.com/example",
      email: "a@b.c",
    },
    home: {
      hero: {
        caption: "一句话",
        lightImage: "/images/hero.jpg",
        alt: "说明",
      },
    },
    footer: {
      text: "© {year} {author}",
    },
  };
}

async function prepareRoot(options?: { about?: boolean }) {
  const root = await mkdtemp(join(tmpdir(), "blog-settings-"));
  await mkdir(join(root, "public/images"), { recursive: true });
  await mkdir(join(root, "src/content"), { recursive: true });
  await writeFile(join(root, "public/images/hero.jpg"), "hero");
  await writeFile(join(root, "public/favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  if (options?.about !== false) await writeFile(join(root, "src/content/about.md"), "");
  return root;
}

function assertFails(settings: BlogSettings, root: string, pattern: RegExp) {
  assert.throws(
    () => resolveBlogSettings(settings, root),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /^博客设置无效：/);
      assert.match(error.message, pattern);
      return true;
    },
  );
}

test("现行完整设置可以归一化", async () => {
  const root = await prepareRoot();
  try {
    const resolved = resolveBlogSettings(sample(), root);
    assert.equal(resolved.site.headerTitle, "示例站");
    assert.equal(resolved.site.url, "https://example.com/");
    assert.equal(resolved.site.faviconType, "image/svg+xml");
    assert.equal(resolved.home.hero.darkImage, "/images/hero.jpg");
    assert.equal(resolved.footer.copyright, `© ${year} 作者`);
    assert.equal("text" in resolved.footer, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("可选项空字符串或空白视为省略", async () => {
  const root = await prepareRoot();
  try {
    const settings = sample();
    settings.site.headerTitle = "  ";
    settings.site.favicon = "";
    settings.home.hero.darkImage = "";
    const resolved = resolveBlogSettings(settings, root);
    assert.equal(resolved.site.headerTitle, "示例站");
    assert.equal(resolved.site.favicon, undefined);
    assert.equal(resolved.site.faviconType, undefined);
    assert.equal(resolved.home.hero.darkImage, "/images/hero.jpg");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("页脚空白不渲染左侧，装饰图允许空 alt", async () => {
  const root = await prepareRoot();
  try {
    const settings = sample();
    settings.footer.text = " \n ";
    settings.home.hero.alt = "";
    const resolved = resolveBlogSettings(settings, root);
    assert.equal(resolved.footer.copyright, "");
    assert.equal(resolved.home.hero.alt, "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("favicon 支持 public 内 png，并给出 MIME", async () => {
  const root = await prepareRoot();
  try {
    await writeFile(join(root, "public/images/icon.png"), "png");
    const settings = sample();
    settings.site.favicon = "/images/icon.png";
    const resolved = resolveBlogSettings(settings, root);
    assert.equal(resolved.site.favicon, "/images/icon.png");
    assert.equal(resolved.site.faviconType, "image/png");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("主视觉允许 /images/./ 落到现存文件，拒绝 .. 穿越", async () => {
  const root = await prepareRoot();
  try {
    const settings = sample();
    settings.home.hero.lightImage = "/images/./hero.jpg";
    const resolved = resolveBlogSettings(settings, root);
    assert.equal(resolved.home.hero.lightImage, "/images/./hero.jpg");

    assertFails(
      {
        ...sample(),
        home: { hero: { ...sample().home.hero, lightImage: "/images/../favicon.svg" } },
      },
      root,
      /亮色主视觉只接受 public\/images\//,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("http 与子路径网址、非 GitHub 主页、未知占位符仍可通过", async () => {
  const root = await prepareRoot();
  try {
    const settings = sample();
    settings.site.url = "http://example.com/blog";
    settings.author.github = "https://example.com";
    settings.author.email = "not-an-email";
    settings.footer.text = "x {foo} {year}";
    const resolved = resolveBlogSettings(settings, root);
    assert.equal(resolved.site.url, "http://example.com/blog");
    assert.equal(resolved.footer.copyright, `x {foo} ${year}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("必填空值、非法网址、空白 alt、缺文件、缺 about 会中文失败", async () => {
  const root = await prepareRoot();
  try {
    assertFails({ ...sample(), site: { ...sample().site, title: "" } }, root, /博客名称不能为空/);
    assertFails(
      { ...sample(), site: { ...sample().site, url: "not-a-url" } },
      root,
      /正式网址必须是完整网址/,
    );
    assertFails(
      { ...sample(), home: { hero: { ...sample().home.hero, alt: "  " } } },
      root,
      /主视觉图片说明/,
    );
    assertFails(
      { ...sample(), home: { hero: { ...sample().home.hero, lightImage: "/images/missing.jpg" } } },
      root,
      /亮色主视觉文件不存在/,
    );
    assertFails(
      {
        ...sample(),
        home: { hero: { ...sample().home.hero, lightImage: "https://cdn.example/x.jpg" } },
      },
      root,
      /亮色主视觉只接受 public\/images\//,
    );
    assertFails(
      { ...sample(), site: { ...sample().site, favicon: "/favicon.jpg" } },
      root,
      /浏览器图标只支持 SVG、PNG、ICO/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  const missingAbout = await prepareRoot({ about: false });
  try {
    assertFails(sample(), missingAbout, /“关于我” Markdown 文件缺失/);
  } finally {
    await rm(missingAbout, { recursive: true, force: true });
  }
});
