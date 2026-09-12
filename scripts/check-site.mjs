import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const siteModule = new URL("../src/lib/site.ts", import.meta.url);
const fixture = {
  site: {
    title: "  样本博客  ",
    headerTitle: "样本",
    url: "https://example.com",
    description: "样本描述",
    favicon: "/favicon.svg",
  },
  author: { name: "样本作者", github: "", email: "" },
  home: { hero: { caption: "样本文案", alt: "样本照片" } },
  footer: { text: "© {year} {author}" },
};
let settings = fixture;
let scenario = 0;
// 替换设置文件这一输入边界；加载、资源校验与公开投影均走真实 module。
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "../../blog.config.ts" && context.parentURL?.startsWith(siteModule.href)) {
      return {
        url: `data:text/javascript,${encodeURIComponent(`export default ${JSON.stringify(settings)}`)}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

async function load(update = () => {}) {
  settings = structuredClone(fixture);
  update(settings);
  const exports = await import(`${siteModule.href}?scenario=${scenario++}`);
  assert.deepEqual(Object.keys(exports), ["blogSettings"]);
  return exports.blogSettings;
}

const previousDirectory = process.cwd();
const workspace = await mkdtemp(join(tmpdir(), "blog-settings-"));
try {
  const hero = join(workspace, "public/images/hero");
  await mkdir(hero, { recursive: true });
  await copyFile(
    new URL("../tests/fixtures/hero-images/valid/a.jpg", import.meta.url),
    join(hero, "new-photo.jpg"),
  );
  await writeFile(
    join(workspace, "public/favicon.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  await writeFile(join(workspace, "public/unsupported.txt"), "不是图标");
  process.chdir(workspace);

  const actual = await load();
  assert.equal(actual.site.url, "https://example.com/");
  assert.equal(actual.site.title, fixture.site.title);
  assert.deepEqual(actual.home.hero.images, ["/images/hero/new-photo.jpg"]);
  assert.match(actual.footer.copyright, /^© \d{4} 样本作者$/u);

  for (const url of [
    "http://example.com",
    "https://example.com/blog/",
    "https://example.com?from=test",
    "https://example.com#content",
  ]) {
    await assert.rejects(
      load(settings => (settings.site.url = url)),
      /HTTPS 根地址/,
    );
  }
  for (const url of ["https://127.0.0.1", "https://user@example.com", "https://example.com:8443"]) {
    assert.equal((await load(settings => (settings.site.url = url))).site.url, new URL(url).href);
  }
  await assert.rejects(
    load(settings => (settings.site.favicon = "/unsupported.txt")),
    /浏览器图标只支持/,
  );
  await assert.rejects(
    load(settings => (settings.site.favicon = "/missing.svg")),
    { code: "ENOENT" },
  );
  await assert.rejects(
    load(settings => (settings.footer.text = "© {year} {owner}")),
    /页脚只允许/,
  );
} finally {
  process.chdir(previousDirectory);
  hooks.deregister();
  await rm(workspace, { recursive: true, force: true });
}

console.log("博客设置验收通过");
