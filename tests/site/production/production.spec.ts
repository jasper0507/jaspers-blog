import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import { build, productionEnvironment, root } from "../helpers.ts";

const accessDist = (path: string) => access(join(root, "dist", path));
const readDist = (path: string) => readFile(join(root, "dist", path), "utf8");

test.setTimeout(300_000);
test.beforeAll(() => build(productionEnvironment));

test("生产构建产物完整", async () => {
  for (const route of ["", "shuoshuo", "shuoshuo/20260804-112805", "tags", "archives", "about"]) {
    await accessDist(`${route ? `${route}/` : ""}index.html`);
  }
  await Promise.all([
    accessDist("rss.xml"),
    accessDist("sitemap-index.xml"),
    accessDist("sitemap-0.xml"),
    accessDist("404.html"),
    accessDist("favicon.svg"),
    accessDist("fonts/source-serif-4-latin.woff2"),
    accessDist("fonts/source-serif-4-latin-italic.woff2"),
  ]);
  await assert.rejects(accessDist("categories/index.html"));
  await assert.rejects(accessDist("prototype/warmth/index.html"));
  await assert.rejects(accessDist("pagefind"));

  const [home, archive, notFound, sitemap] = await Promise.all([
    readDist("index.html"),
    readDist("archives/index.html"),
    readDist("404.html"),
    readDist("sitemap-0.xml"),
  ]);
  assert.doesNotMatch(home, /fonts\.googleapis\.com/);
  assert.doesNotMatch(home, /pagefind-|<pagefind-|\/pagefind\//);
  assert.match(home, /查看全部 \(0\)/);
  assert.match(archive, /暂无技术文章/);
  assert.match(notFound, /<meta name="robots" content="noindex"/);
  assert.doesNotMatch(notFound, /application\/ld\+json/);
  assert.match(sitemap, /\/shuoshuo\/20260804-112805\//);
  const cssDirectory = join(root, "dist/_astro");
  const css = (
    await Promise.all(
      (await readdir(cssDirectory))
        .filter(name => name.endsWith(".css"))
        .map(name => readFile(join(cssDirectory, name), "utf8")),
    )
  ).join("\n");
  assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  assert.match(css, /source-serif-4-latin-italic\.woff2/);
  assert.match(css, /noto-sans-sc-/);
  const fontFiles = await readdir(join(root, "dist", "fonts"));
  assert.ok(
    fontFiles.some(name => name.startsWith("noto-sans-sc-") && name.endsWith(".woff2")),
    "生产构建应包含 Noto Sans SC 分包",
  );
});
