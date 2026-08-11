import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  },
  author: {
    name: "示例作者",
    github: "https://github.com/example",
    email: "author@example.com",
  },
};

const validated = validateBlogSettings(validSettings);
assert.equal(validated.site.url, "https://example.com/");
assert.equal(validated.site.headerTitle, "Example");
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
];

for (const [settings, expected] of invalidSettings) {
  assert.throws(() => validateBlogSettings(settings), expected);
}

console.log("博客设置校验通过");
