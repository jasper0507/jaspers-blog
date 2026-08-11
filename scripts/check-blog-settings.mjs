import assert from "node:assert/strict";
import { validateBlogSettings } from "../src/lib/site.ts";

const validSettings = {
  site: {
    title: "Example Blog",
    headerTitle: "Example",
    url: "https://example.com",
    description: "用于校验的默认简介。",
  },
};

const validated = validateBlogSettings(validSettings);
assert.equal(validated.site.url, "https://example.com/");
assert.equal(validated.site.headerTitle, "Example");
assert.equal(
  validateBlogSettings({
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

const invalidSettings = [
  [{ ...validSettings, extra: true }, /博客设置.*未知设置.*extra/],
  [{ site: { ...validSettings.site, extra: true } }, /博客身份.*未知设置.*extra/],
  [{ site: { ...validSettings.site, title: undefined } }, /博客名称.*缺失/],
  [{ site: { ...validSettings.site, url: undefined } }, /正式网址.*缺失/],
  [{ site: { ...validSettings.site, description: undefined } }, /默认简介.*缺失/],
  [{ site: { ...validSettings.site, title: " " } }, /博客名称.*不能为空/],
  [{ site: { ...validSettings.site, headerTitle: " " } }, /页头短名称.*不能为空/],
  [{ site: { ...validSettings.site, description: " " } }, /默认简介.*不能为空/],
  [{ site: { ...validSettings.site, url: "http://example.com" } }, /正式网址.*HTTPS/],
  [{ site: { ...validSettings.site, url: "https://user:pass@example.com" } }, /正式网址.*凭据/],
  [{ site: { ...validSettings.site, url: "https://example.com/blog" } }, /正式网址.*子路径/],
  [{ site: { ...validSettings.site, url: "https://example.com?q=1" } }, /正式网址.*查询参数/],
  [{ site: { ...validSettings.site, url: "https://example.com#top" } }, /正式网址.*锚点/],
  [{ site: { ...validSettings.site, url: "https://localhost" } }, /正式网址.*域名/],
  [
    { site: { ...validSettings.site, title: "一".repeat(17), headerTitle: undefined } },
    /页头最终显示名称.*16/,
  ],
  [{ site: { ...validSettings.site, headerTitle: "一".repeat(17) } }, /页头最终显示名称.*16/],
  [{ site: { ...validSettings.site, headerTitle: "1234567890123456 " } }, /页头最终显示名称.*16/],
];

for (const [settings, expected] of invalidSettings) {
  assert.throws(() => validateBlogSettings(settings), expected);
}

console.log("博客身份设置校验通过");
