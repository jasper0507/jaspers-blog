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
  footer: {
    content:
      "© {year} **{author}** *博客*  \n[HTTPS](https://example.com) [邮箱](mailto:author@example.com) [本站](/about/)",
  },
};

const validated = await validateBlogSettings(validSettings, new Date("2025-12-31T16:00:00Z"));
assert.equal(validated.site.url, "https://example.com/");
assert.equal(validated.site.headerTitle, "Example");
assert.equal(validated.site.favicon, undefined);
assert.equal(validated.home.hero.darkImage, "/images/hero-light.svg");
assert.equal(validated.home.hero.alt, "");
assert.match(validated.footer.html, /© 2026 <strong>示例作者<\/strong> <em>博客<\/em><br>/);
assert.match(validated.footer.html, /href="https:\/\/example\.com"/);
assert.match(validated.footer.html, /href="mailto:author@example\.com"/);
assert.match(validated.footer.html, /href="\/about\/"/);
assert.equal(
  (await validateBlogSettings({ ...validSettings, footer: { content: "" } })).footer.html,
  "",
);
const escapedAuthorHtml = (
  await validateBlogSettings({
    ...validSettings,
    author: { ...validSettings.author, name: "<script>alert(1)</script>" },
    footer: { content: "{author}" },
  })
).footer.html;
assert.doesNotMatch(escapedAuthorHtml, /<script>/);
assert.match(escapedAuthorHtml, /alert\(1\)/);
for (const favicon of [
  "/images/hero-light.svg",
  "/images/posts/transformer-paper-notes/attention-mechanism.png",
]) {
  assert.equal(
    (
      await validateBlogSettings({
        ...validSettings,
        site: { ...validSettings.site, favicon },
      })
    ).site.favicon,
    favicon,
  );
}
assert.equal(
  (
    await validateBlogSettings({
      ...validSettings,
      home: {
        hero: { ...validSettings.home.hero, darkImage: "/images/hero-dark.svg" },
      },
    })
  ).home.hero.darkImage,
  "/images/hero-dark.svg",
);
assert.equal(
  (
    await validateBlogSettings({
      ...validSettings,
      site: {
        ...validSettings.site,
        title: "1234567890123456",
        headerTitle: undefined,
      },
    })
  ).site.headerTitle,
  "1234567890123456",
);
assert.equal(
  (
    await validateBlogSettings({
      ...validSettings,
      site: {
        ...validSettings.site,
        title: "超过十六个字符的博客名称仍可使用",
        headerTitle: "短名称",
      },
    })
  ).site.headerTitle,
  "短名称",
);
assert.equal(Object.isFrozen(validated), true);
assert.equal(Object.isFrozen(validated.site), true);
assert.deepEqual(validated.author, validSettings.author);
assert.equal(Object.isFrozen(validated.author), true);
assert.equal(Object.isFrozen(validated.home), true);
assert.equal(Object.isFrozen(validated.home.hero), true);
assert.equal(Object.isFrozen(validated.footer), true);

const imageFixtureDirectory = mkdtempSync(join(tmpdir(), "jasper-blog-images-"));
const imageFixtureName = `.settings-${process.pid}`;
const outsideImage = join(imageFixtureDirectory, "outside.svg");
const outsideImageLink = `public/images/${imageFixtureName}-outside.svg`;
const loopImageLink = `public/images/${imageFixtureName}-loop.svg`;
writeFileSync(outsideImage, '<svg xmlns="http://www.w3.org/2000/svg"/>');
try {
  symlinkSync(outsideImage, outsideImageLink);
  symlinkSync(`${imageFixtureName}-loop.svg`, loopImageLink);
  await assert.rejects(
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
  await assert.rejects(
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
  [{ ...validSettings, footer: undefined }, /页脚设置.*缺失/],
  [{ ...validSettings, footer: { content: undefined } }, /页脚内容.*缺失/],
  [{ ...validSettings, footer: { content: "正文", extra: true } }, /页脚设置.*未知设置/],
  ...[
    ["<span>HTML</span>", /页脚内容.*HTML/],
    ["![图片](/images/hero-light.svg)", /页脚内容.*图片/],
    ["# 标题", /页脚内容.*标题/],
    ["- 列表", /页脚内容.*列表/],
    ["> 引用", /页脚内容.*引用/],
    ["---", /页脚内容.*分隔线/],
    ["`代码`", /页脚内容.*代码/],
    ["```js\nalert(1)\n```", /页脚内容.*代码/],
    ["| 表格 |\n| --- |\n| 内容 |", /页脚内容.*表格/],
    ["~~删除线~~", /页脚内容.*删除线/],
    ["{unknown}", /页脚内容.*未知占位符.*unknown/],
    ["[链接](http://example.com)", /页脚内容.*链接.*HTTP/],
    ["[链接](https:example.com)", /页脚内容.*链接.*HTTPS/],
    ["[链接](javascript:alert(1))", /页脚内容.*链接.*javascript/],
    ["[链接](data:text/plain,test)", /页脚内容.*链接.*data/],
    ["[链接](ftp://example.com)", /页脚内容.*链接.*ftp/],
    ["[链接](relative/path)", /页脚内容.*链接.*relative\/path/],
    ["[链接](//example.com)", /页脚内容.*链接.*\/\/example\.com/],
  ].map(([content, expected]) => [{ ...validSettings, footer: { content } }, expected]),
];

for (const [settings, expected] of invalidSettings) {
  await assert.rejects(validateBlogSettings(settings), expected);
}

console.log("博客设置校验通过");
