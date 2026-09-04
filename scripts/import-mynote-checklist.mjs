import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPost, POST_CONTENT_DIRECTORY } from "../src/lib/post-rules.js";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const noteRoot = "/mnt/d/MyNote";
const checklistPath = join(root, "tmp/mynote-import-checklist.md");
const golangPrefix = "后端开发/Golang指南/";

function parseCheckedItems(source) {
  const items = source.split(/(?=^### \d+\. )/m);
  const checked = [];
  for (const item of items) {
    if (!/^- \[x\] 导入/m.test(item)) continue;
    const title = JSON.parse(item.match(/^- title: (.*)$/m)[1]);
    const noteSource = item.match(/^- source: (.+)$/m)[1].trim();
    const publishedAt = item.match(/^- publishedAt: "(.*)"$/m)[1];
    const description = JSON.parse(item.match(/^- description: (.*)$/m)[1]);
    const tags = [...item.matchAll(/^  - (.+)$/gm)].map(match => match[1]);
    if (!publishedAt || !description.trim()) {
      throw new Error(`勾选条目缺少时间或摘要：${noteSource}`);
    }
    checked.push({ title, noteSource, publishedAt, description, tags });
  }
  checked.sort(
    (left, right) =>
      left.publishedAt.localeCompare(right.publishedAt) ||
      left.noteSource.localeCompare(right.noteSource),
  );
  return checked;
}

function noteBody(source) {
  let body = source;
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end < 0) throw new Error("旧 YAML 未闭合");
    body = body.slice(end + 4).replace(/^\n/, "");
  }
  if (!body.trim()) throw new Error("正文为空");
  return body.replace(/\n$/, "") + "\n";
}

function formatPost({ title, description, publishedAt, tags, id, body }) {
  const tagLines =
    tags.length === 0 ? "tags: []\n" : `tags:\n${tags.map(tag => `  - ${tag}\n`).join("")}`;
  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
publishedAt: "${publishedAt}"
${tagLines}draft: false
# 禁止修改
id: ${id}
---

${body}`;
}

function rewriteGolangIndex(markdown, hrefBySource) {
  return markdown.replace(/\]\(\.\/([^)]+)\)/g, (full, target) => {
    const hashIndex = target.indexOf("#");
    const pathPart = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : target.slice(hashIndex);
    const source = golangPrefix + decodeURIComponent(pathPart);
    const href = hrefBySource.get(source);
    if (!href) throw new Error(`目录页无法解析链接：./${target}`);
    return `](${href}${hash})`;
  });
}

function filenameFromTitle(title) {
  const stem = title.trim().replaceAll(/[/\\:*?"<>|\r\n]/g, "");
  if (!stem || stem === "." || stem === ".." || stem.startsWith(".")) {
    throw new Error(`标题无法生成有效文件名：${title}`);
  }
  return `${stem}.md`;
}

async function existingPostsByFilename(postsDirectory) {
  const byFilename = new Map();
  let names;
  try {
    names = await readdir(postsDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") return byFilename;
    throw error;
  }
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const source = await readFile(join(postsDirectory, name), "utf8");
    const id = Number(source.match(/^id: (\d+)$/m)?.[1]);
    if (!Number.isInteger(id) || id < 1) throw new Error(`已有文章缺少稳定 ID：${name}`);
    byFilename.set(name, { path: join(postsDirectory, name), id });
  }
  return byFilename;
}

const items = parseCheckedItems(await readFile(checklistPath, "utf8"));
if (items.length === 0) throw new Error("清单里没有勾选条目");

const postsDirectory = join(root, POST_CONTENT_DIRECTORY);
const existing = await existingPostsByFilename(postsDirectory);
const hrefBySource = new Map();
const created = [];

for (const item of items) {
  const body = noteBody(await readFile(join(noteRoot, item.noteSource), "utf8"));
  const filename = filenameFromTitle(item.title);
  let record = existing.get(filename);
  if (!record) {
    record = await createPost(postsDirectory, item.title);
    existing.set(filename, record);
    console.log(`已创建 ${record.id} /posts/${record.id}/ ${item.title}`);
  } else {
    console.log(`已刷新 ${record.id} /posts/${record.id}/ ${item.title}`);
  }
  await writeFile(
    record.path,
    formatPost({
      title: item.title,
      description: item.description,
      publishedAt: item.publishedAt,
      tags: item.tags,
      id: record.id,
      body,
    }),
  );
  const href = `/posts/${record.id}/`;
  hrefBySource.set(item.noteSource, href);
  created.push({ id: record.id, href, title: item.title, noteSource: item.noteSource, path: record.path });
}

const index = created.find(post => post.noteSource.endsWith("/INDEX.md"));
if (index) {
  const source = await readFile(index.path, "utf8");
  const split = source.indexOf("\n---\n");
  if (split < 0) throw new Error("目录页 frontmatter 未闭合");
  const frontmatter = source.slice(0, split + 5);
  const body = rewriteGolangIndex(source.slice(split + 5), hrefBySource);
  await writeFile(index.path, frontmatter + body);
  console.log(`已重写目录页链接 ${index.path}`);
}

console.log(`完成 ${created.length} 篇`);
