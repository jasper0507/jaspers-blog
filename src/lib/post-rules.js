import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatShanghaiDateTime } from "./shanghai-time.js";

export const POST_CONTENT_DIRECTORY = "src/content/posts";

const POST_NEXT_ID_FILENAME = "post-next-id.json";
const illegalInFilename = /[/\\:*?"<>|\r\n]/g;

function postNextIdPath(postsDirectory) {
  return join(postsDirectory, "..", POST_NEXT_ID_FILENAME);
}

function formatPostNextId(next) {
  return `{"next": ${next}}\n`;
}

function readPostNextId(source) {
  let data;
  try {
    data = JSON.parse(source);
  } catch (error) {
    throw new Error("技术文章号码计数器无效", { cause: error });
  }
  if (
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== 1 ||
    typeof data.next !== "number" ||
    !Number.isInteger(data.next) ||
    data.next < 1
  ) {
    throw new Error("技术文章号码计数器无效");
  }
  return data.next;
}

async function loadNextPostId(postsDirectory) {
  try {
    return readPostNextId(await readFile(postNextIdPath(postsDirectory), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("找不到技术文章号码计数器", { cause: error });
    }
    throw error;
  }
}

export function isPostFilename(value) {
  illegalInFilename.lastIndex = 0;
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.startsWith(".") &&
    !illegalInFilename.test(value)
  );
}

function filenameFromTitle(title) {
  if (typeof title !== "string") return null;
  illegalInFilename.lastIndex = 0;
  const stem = title.trim().replaceAll(illegalInFilename, "");
  return isPostFilename(stem) ? stem : null;
}

function createPostDraft({ title, id }) {
  const publishedAt = formatShanghaiDateTime(new Date());
  return {
    publishedAt,
    source: `---
title: ${JSON.stringify(title)}
description: ""
publishedAt: "${publishedAt}"
tags: []
draft: false
id: ${id}
---
`,
  };
}

/**
 * @param {string} postsDirectory
 * @param {string} title
 * @returns {Promise<{ path: string, id: number }>}
 */
export async function createPost(postsDirectory, title) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("标题不能为空");

  const filename = filenameFromTitle(trimmed);
  if (!filename) throw new Error("标题无法生成有效文件名");

  const path = join(postsDirectory, `${filename}.md`);
  const next = await loadNextPostId(postsDirectory);

  await mkdir(postsDirectory, { recursive: true });
  const { source } = createPostDraft({ title: trimmed, id: next });
  try {
    await writeFile(path, source, { flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`技术文章已存在：${path}`, { cause: error });
    throw error;
  }

  try {
    await writeFile(postNextIdPath(postsDirectory), formatPostNextId(next + 1));
  } catch (error) {
    try {
      await unlink(path);
    } catch (cleanupError) {
      throw new Error(`未能写入号码计数器，且无法撤回已创建的文件：${path}`, {
        cause: cleanupError,
      });
    }
    throw error;
  }

  return { path, id: next };
}

/**
 * @param {string} postsDirectory
 * @param {readonly { filename: string, id: number }[]} posts
 * @returns {Promise<void>}
 */
export async function assertPostStableIds(postsDirectory, posts) {
  const idOwners = new Map();
  let maxId = 0;

  for (const post of posts) {
    const owner = idOwners.get(post.id);
    if (owner) {
      throw new Error(`技术文章「${owner}」与「${post.filename}」使用了相同的稳定 ID：${post.id}`);
    }
    idOwners.set(post.id, post.filename);
    if (post.id > maxId) maxId = post.id;
  }

  const next = await loadNextPostId(postsDirectory);
  if (maxId >= next) {
    throw new Error(`技术文章号码计数器过小：next=${next}，已用最大号=${maxId}`);
  }
}
