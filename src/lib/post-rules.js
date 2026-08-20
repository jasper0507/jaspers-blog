import { join } from "node:path";
import { formatShanghaiDateTime } from "./shanghai-time.js";

export const POST_CONTENT_DIRECTORY = "src/content/posts";
export const POST_NEXT_ID_FILENAME = "post-next-id.json";

const illegalInFilename = /[/\\:*?"<>|\r\n]/;

export function postNextIdPath(postsDirectory = POST_CONTENT_DIRECTORY) {
  return join(postsDirectory, "..", POST_NEXT_ID_FILENAME);
}

export function formatPostNextId(next) {
  return `{"next": ${next}}\n`;
}

export function readPostNextId(source) {
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

export function isPostFilename(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.startsWith(".") &&
    !illegalInFilename.test(value)
  );
}

export function filenameFromTitle(title) {
  if (typeof title !== "string") return null;
  const stem = title.trim().replaceAll(/[/\\:*?"<>|\r\n]/g, "");
  return isPostFilename(stem) ? stem : null;
}

export function createPostDraft({ title, id }) {
  const publishedAt = formatShanghaiDateTime(new Date());
  return {
    publishedAt,
    id,
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
