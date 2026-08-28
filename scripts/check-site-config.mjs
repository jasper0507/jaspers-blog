import assert from "node:assert/strict";
import rawSettings from "../blog.config.ts";
import { parseBlogSettings } from "../src/lib/site.ts";

function changed(update) {
  const settings = structuredClone(rawSettings);
  update(settings);
  return settings;
}

assert.equal(
  parseBlogSettings(changed(settings => (settings.site.title = "  Jasper's Blog  "))).site.title,
  "Jasper's Blog",
);
assert.throws(
  () => parseBlogSettings(changed(settings => (settings.site.title = " \n "))),
  /site\.title/,
);

for (const url of [
  "http://example.com",
  "https://example.com/blog/",
  "https://user@example.com",
  "https://example.com:443",
  "https://example.com:8443",
  "https://example.com?from=test",
  "https://example.com#content",
  "https://127.0.0.1",
]) {
  assert.throws(
    () => parseBlogSettings(changed(settings => (settings.site.url = url))),
    /正式网址必须是 HTTPS 域名根地址/,
  );
}

assert.throws(
  () => parseBlogSettings(changed(settings => (settings.author.email = "abc"))),
  /author\.email/,
);
for (const github of [
  "http://github.com/jasper0507",
  "https://example.com/jasper0507",
  "https://github.com/jasper0507/repository",
  "https://github.com/随便写",
]) {
  assert.throws(
    () => parseBlogSettings(changed(settings => (settings.author.github = github))),
    /GitHub 地址必须是用户主页/,
  );
}

assert.throws(
  () => parseBlogSettings(changed(settings => (settings.footer.text = "© {year} {owner}"))),
  /页脚只允许使用 \{year\} 和 \{author\}/,
);

console.log("博客配置验收通过");
