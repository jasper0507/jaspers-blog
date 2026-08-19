import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import {
  assertChineseFootnotes,
  assertRenderedKatex,
  build,
  pagefindFragmentText,
  productionEnvironment,
  root,
} from "../helpers.ts";

const accessDist = (path: string) => access(join(root, "dist", path));
const readDist = (path: string) => readFile(join(root, "dist", path), "utf8");

test.setTimeout(300_000);
test.beforeAll(() => build(productionEnvironment));

test("生产构建产物覆盖固定栏位", async () => {
  for (const route of ["", "shuoshuo", "tags", "archives", "about"]) {
    await accessDist(`${route ? `${route}/` : ""}index.html`);
  }
  await Promise.all([
    accessDist("rss.xml"),
    accessDist("sitemap-index.xml"),
    accessDist("sitemap-0.xml"),
    accessDist("pagefind/pagefind.js"),
  ]);
  await assert.rejects(accessDist("categories/index.html"));
  await assert.rejects(accessDist("prototype/warmth/index.html"));
});

test("Pagefind 页数与已发布技术文章一致", async () => {
  const postDirectories = (await readdir(join(root, "dist/posts"), { withFileTypes: true })).filter(
    entry => entry.isDirectory() && entry.name !== "2",
  );
  const searchIndex = JSON.parse(await readDist("pagefind/pagefind-entry.json"));
  assert.equal(searchIndex.languages["zh-cn"].page_count, postDirectories.length);
});

test("论文笔记与 Markdown 教程的正文渲染", async () => {
  const paperNotes = await readDist("posts/transformer-paper-notes/index.html");
  const quickStart = await readDist("posts/markdown-quick-start/index.html");
  assert.match(paperNotes, /class="katex"/, "论文笔记应渲染 KaTeX");
  assert.doesNotMatch(paperNotes, /language-math/, "论文笔记不得留下未渲染的 math 源码块");
  assert.match(
    paperNotes,
    /annotation encoding="application\/x-tex">N=6</,
    "论文笔记行内公式应仍正确",
  );
  assertRenderedKatex(quickStart, "Markdown 教程");
  assertChineseFootnotes(quickStart, "Markdown 教程");
});

test("Pagefind 排除 KaTeX 后仍能检索正文", async () => {
  const corpus = await pagefindFragmentText();
  assert.match(corpus, /多头自注意力/, "索引应保留论文笔记正文");
  assert.doesNotMatch(corpus, /N=6/, "索引不得包含仅出现在公式中的 TeX");
});
