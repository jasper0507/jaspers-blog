import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertAboutMarkdownExists, validateBlogSettings } from "../src/lib/site.ts";

const aboutFixtureDirectory = mkdtempSync(join(tmpdir(), "jasper-blog-about-"));
const emptyAboutPath = join(aboutFixtureDirectory, "empty.md");
writeFileSync(emptyAboutPath, "");
try {
  assert.doesNotThrow(() => assertAboutMarkdownExists(emptyAboutPath));
  assert.throws(
    () => assertAboutMarkdownExists(join(aboutFixtureDirectory, "missing.md")),
    /“关于我” Markdown 文件缺失.*src\/content\/about\.md/,
  );
} finally {
  rmSync(aboutFixtureDirectory, { recursive: true });
}

const validSettings = {
  site: {
    title: "Example Blog",
    headerTitle: "Example",
    url: "https://example.com",
    description: "用于校验的默认简介。",
    favicon: undefined,
  },
  author: {
    name: "示例作者",
    github: "https://github.com/example",
    email: "author@example.com",
  },
  home: {
    hero: {
      caption: "示例主视觉",
      lightImage: "/images/hero-light.svg",
      darkImage: undefined,
      alt: "",
    },
  },
};

const validated = validateBlogSettings(validSettings);
assert.equal(validated.site.url, "https://example.com/");
assert.equal(validated.site.headerTitle, "Example");
assert.equal(validated.site.favicon, undefined);
assert.equal(validated.home.hero.darkImage, "/images/hero-light.svg");
assert.equal(validated.home.hero.alt, "");
for (const favicon of [
  "/images/hero-light.svg",
  "/images/posts/transformer-paper-notes/attention-mechanism.png",
]) {
  assert.equal(
    validateBlogSettings({
      ...validSettings,
      site: { ...validSettings.site, favicon },
    }).site.favicon,
    favicon,
  );
}
assert.equal(
  validateBlogSettings({
    ...validSettings,
    home: {
      hero: { ...validSettings.home.hero, darkImage: "/images/hero-dark.svg" },
    },
  }).home.hero.darkImage,
  "/images/hero-dark.svg",
);
assert.equal(
  validateBlogSettings({
    ...validSettings,
    site: {
      ...validSettings.site,
      title: "1234567890123456",
      headerTitle: undefined,
    },
  }).site.headerTitle,
  "1234567890123456",
);
assert.equal(
  validateBlogSettings({
    ...validSettings,
    site: {
      ...validSettings.site,
      title: "超过十六个字符的博客名称仍可使用",
      headerTitle: "短名称",
    },
  }).site.headerTitle,
  "短名称",
);
assert.equal(Object.isFrozen(validated), true);
assert.equal(Object.isFrozen(validated.site), true);
assert.deepEqual(validated.author, validSettings.author);
assert.equal(Object.isFrozen(validated.author), true);
assert.equal(Object.isFrozen(validated.home), true);
assert.equal(Object.isFrozen(validated.home.hero), true);

const imageFixtureDirectory = mkdtempSync(join(tmpdir(), "jasper-blog-images-"));
const imageFixtureName = `.settings-${process.pid}`;
const outsideImage = join(imageFixtureDirectory, "outside.svg");
const outsideImageLink = `public/images/${imageFixtureName}-outside.svg`;
const loopImageLink = `public/images/${imageFixtureName}-loop.svg`;
writeFileSync(outsideImage, '<svg xmlns="http://www.w3.org/2000/svg"/>');
try {
  symlinkSync(outsideImage, outsideImageLink);
  symlinkSync(`${imageFixtureName}-loop.svg`, loopImageLink);
  assert.throws(
    () =>
      validateBlogSettings({
        ...validSettings,
        home: {
          hero: {
            ...validSettings.home.hero,
            lightImage: `/images/${imageFixtureName}-outside.svg`,
          },
        },
      }),
    /亮色主视觉.*符号链接.*外部路径/,
  );
  assert.throws(
    () =>
      validateBlogSettings({
        ...validSettings,
        home: {
          hero: {
            ...validSettings.home.hero,
            darkImage: `/images/${imageFixtureName}-loop.svg`,
          },
        },
      }),
    /暗色主视觉.*循环符号链接/,
  );
} finally {
  rmSync(outsideImageLink, { force: true });
  rmSync(loopImageLink, { force: true });
  rmSync(imageFixtureDirectory, { recursive: true });
}

const invalidSettings = [
  [{ ...validSettings, extra: true }, /博客设置.*未知设置.*extra/],
  [{ ...validSettings, site: { ...validSettings.site, extra: true } }, /博客身份.*未知设置.*extra/],
  [{ ...validSettings, author: undefined }, /作者设置.*缺失/],
  [{ ...validSettings, author: { ...validSettings.author, extra: true } }, /作者设置.*未知设置/],
  [{ ...validSettings, author: { ...validSettings.author, name: undefined } }, /作者显示名.*缺失/],
  [{ ...validSettings, author: { ...validSettings.author, name: " " } }, /作者显示名.*不能为空/],
  [
    { ...validSettings, author: { ...validSettings.author, github: undefined } },
    /GitHub 地址.*缺失/,
  ],
  [
    { ...validSettings, author: { ...validSettings.author, github: "http://github.com/example" } },
    /GitHub 地址.*HTTPS/,
  ],
  [
    {
      ...validSettings,
      author: { ...validSettings.author, github: "https://github.com/example/repo" },
    },
    /GitHub 地址.*个人主页/,
  ],
  ...[
    "https://github.com//example",
    "https://github.com/example?",
    "https://github.com/example#",
  ].map(github => [
    { ...validSettings, author: { ...validSettings.author, github } },
    /GitHub 地址.*个人主页/,
  ]),
  [{ ...validSettings, author: { ...validSettings.author, email: undefined } }, /邮箱地址.*缺失/],
  [
    { ...validSettings, author: { ...validSettings.author, email: "invalid" } },
    /邮箱地址.*有效邮箱/,
  ],
  [{ ...validSettings, site: { ...validSettings.site, title: undefined } }, /博客名称.*缺失/],
  [{ ...validSettings, site: { ...validSettings.site, url: undefined } }, /正式网址.*缺失/],
  [{ ...validSettings, site: { ...validSettings.site, description: undefined } }, /默认简介.*缺失/],
  [{ ...validSettings, site: { ...validSettings.site, title: " " } }, /博客名称.*不能为空/],
  [{ ...validSettings, site: { ...validSettings.site, headerTitle: " " } }, /页头短名称.*不能为空/],
  [{ ...validSettings, site: { ...validSettings.site, description: " " } }, /默认简介.*不能为空/],
  [
    { ...validSettings, site: { ...validSettings.site, url: "http://example.com" } },
    /正式网址.*HTTPS/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, url: "https://user:pass@example.com" } },
    /正式网址.*凭据/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, url: "https://example.com/blog" } },
    /正式网址.*子路径/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, url: "https://example.com?q=1" } },
    /正式网址.*查询参数/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, url: "https://example.com#top" } },
    /正式网址.*锚点/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, url: "https://localhost" } },
    /正式网址.*域名/,
  ],
  [
    {
      ...validSettings,
      site: { ...validSettings.site, title: "一".repeat(17), headerTitle: undefined },
    },
    /页头最终显示名称.*16/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, headerTitle: "一".repeat(17) } },
    /页头最终显示名称.*16/,
  ],
  [
    { ...validSettings, site: { ...validSettings.site, headerTitle: "1234567890123456 " } },
    /页头最终显示名称.*16/,
  ],
  ...["https://example.com/favicon.svg", "/images/../hero-light.svg"].map(favicon => [
    { ...validSettings, site: { ...validSettings.site, favicon } },
    /浏览器图标.*public\/images/,
  ]),
  [
    { ...validSettings, site: { ...validSettings.site, favicon: "/images/missing.ico" } },
    /浏览器图标.*文件不存在/,
  ],
  [
    {
      ...validSettings,
      site: {
        ...validSettings.site,
        favicon: "/images/posts/github-hexo-blog-guide/theme-installation-example.jpg",
      },
    },
    /浏览器图标.*扩展名/,
  ],
  [{ ...validSettings, home: undefined }, /首页设置.*缺失/],
  [{ ...validSettings, home: { ...validSettings.home, extra: true } }, /首页设置.*未知设置/],
  [
    { ...validSettings, home: { hero: { ...validSettings.home.hero, caption: " " } } },
    /首页 caption.*不能为空/,
  ],
  [
    { ...validSettings, home: { hero: { ...validSettings.home.hero, alt: undefined } } },
    /主视觉图片说明.*缺失/,
  ],
  [
    { ...validSettings, home: { hero: { ...validSettings.home.hero, alt: " " } } },
    /主视觉图片说明.*空字符串/,
  ],
  ...[
    "https://example.com/hero.svg",
    "/images/../hero-light.svg",
    "/images/%2e%2e/hero-light.svg",
  ].map(lightImage => [
    { ...validSettings, home: { hero: { ...validSettings.home.hero, lightImage } } },
    /亮色主视觉.*public\/images/,
  ]),
  [
    {
      ...validSettings,
      home: { hero: { ...validSettings.home.hero, lightImage: "/images/missing.svg" } },
    },
    /亮色主视觉.*文件不存在/,
  ],
  [
    {
      ...validSettings,
      home: { hero: { ...validSettings.home.hero, lightImage: "/images/hero-light.txt" } },
    },
    /亮色主视觉.*扩展名/,
  ],
  [
    {
      ...validSettings,
      home: { hero: { ...validSettings.home.hero, darkImage: "/images/missing.png" } },
    },
    /暗色主视觉.*文件不存在/,
  ],
];

for (const [settings, expected] of invalidSettings) {
  assert.throws(() => validateBlogSettings(settings), expected);
}

console.log("博客设置校验通过");
