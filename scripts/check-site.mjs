import assert from "node:assert/strict";
import rawSettings from "../blog.config.ts";
import { readHeroImages } from "../src/lib/hero-images.ts";
import { blogSettings, resolveBlogSettings } from "../src/lib/site.ts";

const changed = update => {
  const settings = structuredClone(rawSettings);
  update(settings);
  return settings;
};

assert.equal(blogSettings.site.url, new URL(rawSettings.site.url).href);
assert.deepEqual(blogSettings.home.hero.images, readHeroImages());
assert.equal(
  resolveBlogSettings(changed(settings => (settings.site.title = "  Jasper's Blog  "))).site.title,
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
    changed(settings => (settings.site.favicon = "/fonts/LICENSE-ibm-plex-sans.txt")),
  ),
);
assert.throws(() =>
  resolveBlogSettings(changed(settings => (settings.footer.text = "© {year} {owner}"))),
);

console.log("博客设置验收通过");
