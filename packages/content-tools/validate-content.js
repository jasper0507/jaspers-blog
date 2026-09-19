import { glob, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { contentPaths } from "./content-paths.js";
import { assertPostStableIds, isPostFilename } from "./post-rules.js";
import { isShanghaiDateTime } from "./shanghai-time.js";
import { isShuoshuoStableId } from "./shuoshuo-rules.js";
import { getTag, getTagError } from "./tag-rules.js";

const POST_FIELDS = new Set(["title", "description", "publishedAt", "tags", "draft", "id"]);
const SHUOSHUO_FIELDS = new Set(["publishedAt", "draft"]);
const POST_REQUIRED = ["title", "description", "publishedAt", "draft", "id"];
const SHUOSHUO_REQUIRED = ["publishedAt", "draft"];

function parseDoubleQuoted(text) {
  const match = /^("(?:\\.|[^"\\])*")\s*(?:#.*)?$/.exec(text);
  if (!match) throw new Error("头信息无法解析");
  return JSON.parse(match[1]);
}

function parseSingleQuoted(text) {
  const match = /^'((?:''|[^'])*)'\s*(?:#.*)?$/.exec(text);
  if (!match) throw new Error("头信息无法解析");
  return match[1].replaceAll("''", "'");
}

function parseScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, quoted: false };
  if (trimmed.startsWith('"')) return { value: parseDoubleQuoted(trimmed), quoted: true };
  if (trimmed.startsWith("'")) return { value: parseSingleQuoted(trimmed), quoted: true };
  const uncommented = trimmed.replace(/\s+#.*$/, "");
  if (uncommented === "true" || uncommented === "false") {
    return { value: uncommented === "true", quoted: false };
  }
  if (uncommented === "null" || uncommented === "~") return { value: null, quoted: false };
  if (uncommented === "[]") return { value: [], quoted: false };
  if (/^-?\d+$/.test(uncommented)) return { value: Number(uncommented), quoted: false };
  return { value: uncommented, quoted: false };
}

function parseYamlMapping(source) {
  const lines = source.split("\n");
  const data = {};
  const quoted = {};
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (/^\s/.test(line)) throw new Error("头信息无法解析");
    const match = /^([A-Za-z][A-Za-z0-9_]*)\s*:(?: |$)(.*)$/.exec(line);
    if (!match) throw new Error("头信息无法解析");
    const key = match[1];
    if (Object.hasOwn(data, key)) throw new Error(`重复字段 ${key}`);
    const rest = match[2];
    if (rest.trim() === "" || rest.trim().startsWith("#")) {
      const items = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const next = lines[cursor];
        if (next.trim() === "" || next.trim().startsWith("#")) {
          cursor += 1;
          continue;
        }
        const item = /^(\s+)-\s+(.*)$/.exec(next);
        if (!item) break;
        items.push(parseScalar(item[2]).value);
        cursor += 1;
      }
      if (cursor > index + 1) {
        data[key] = items;
        quoted[key] = false;
        index = cursor - 1;
        continue;
      }
      data[key] = null;
      quoted[key] = false;
      continue;
    }
    const parsed = parseScalar(rest);
    data[key] = parsed.value;
    quoted[key] = parsed.quoted;
  }
  return { data, quoted };
}

export function parseMarkdownDocument(source, { required = false } = {}) {
  const text = source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  if (!text.startsWith("---\n")) {
    if (required) throw new Error("缺少头信息");
    return { hasFrontmatter: false, data: {}, quoted: {}, body: text };
  }
  const close = text.indexOf("\n---", 3);
  if (close === -1) throw new Error("头信息缺少结束标记");
  const yaml = text.slice(4, close);
  let body = text.slice(close + 4);
  if (body.startsWith("\n")) body = body.slice(1);
  else if (body !== "") throw new Error("头信息缺少结束标记");
  const { data, quoted } = parseYamlMapping(yaml);
  return { hasFrontmatter: true, data, quoted, body };
}

async function markdownEntries(directory) {
  const names = [];
  for await (const relative of glob("**/*.md", { cwd: directory })) names.push(relative);
  return names.sort();
}

async function missingPath(path, directory, label) {
  try {
    const info = await stat(path);
    if (directory ? !info.isDirectory() : !info.isFile()) return `${label}类型无效`;
  } catch (error) {
    if (error?.code === "ENOENT") return `找不到${label}`;
    throw error;
  }
}

function fieldPresent(data, key) {
  return Object.hasOwn(data, key) && data[key] !== null && data[key] !== undefined;
}

function unknownFields(data, allowed, prefix) {
  return Object.keys(data)
    .filter(key => !allowed.has(key))
    .map(key => `${prefix}：不能包含未知字段 ${key}`);
}

function inspectPublishedAt(value, quoted, prefix) {
  if (!quoted) return `${prefix}：发布时间必须是加引号的上海时间 YYYY-MM-DDTHH:mm:ss+08:00`;
  if (typeof value !== "string" || !isShanghaiDateTime(value)) {
    return `${prefix}：发布时间必须是有效的上海时间并带 +08:00`;
  }
}

function inspectPost(relative, source) {
  const prefix = `posts/${relative}`;
  const filename = relative.replace(/\.md$/, "");
  const errors = [];
  if (!isPostFilename(filename)) errors.push(`技术文章文件名无效：${relative}`);
  let document;
  try {
    document = parseMarkdownDocument(source, { required: true });
  } catch (error) {
    errors.push(`${prefix}：${error.message}`);
    return { errors, post: undefined };
  }
  const { data, quoted, body } = document;
  errors.push(...unknownFields(data, POST_FIELDS, prefix));
  for (const key of POST_REQUIRED) {
    if (!fieldPresent(data, key)) errors.push(`${prefix}：缺少 ${key}`);
  }
  if (fieldPresent(data, "title")) {
    if (typeof data.title !== "string") errors.push(`${prefix}：标题必须是文字`);
    else if (!data.title.trim()) errors.push(`${prefix}：标题不能为空`);
  }
  if (fieldPresent(data, "description") && typeof data.description !== "string") {
    errors.push(`${prefix}：摘要必须是文字`);
  }
  if (fieldPresent(data, "publishedAt")) {
    const error = inspectPublishedAt(data.publishedAt, quoted.publishedAt, prefix);
    if (error) errors.push(error);
  }
  if (fieldPresent(data, "draft") && typeof data.draft !== "boolean") {
    errors.push(`${prefix}：draft 必须是 true 或 false`);
  }
  if (fieldPresent(data, "id")) {
    if (typeof data.id !== "number" || !Number.isInteger(data.id) || data.id < 1) {
      errors.push(`${prefix}：id 必须是正整数`);
    }
  }
  let tags = [];
  if (Object.hasOwn(data, "tags") && data.tags !== null && data.tags !== undefined) {
    if (!Array.isArray(data.tags)) errors.push(`${prefix}：标签必须是列表`);
    else {
      tags = data.tags;
      if (new Set(tags).size !== tags.length) errors.push(`${prefix}：标签不得重复`);
      for (const tag of tags) {
        if (typeof tag !== "string" || !tag.trim()) {
          errors.push(`${prefix}：标签不能为空`);
          continue;
        }
        const error = getTagError(tag.trim());
        if (error) errors.push(`${prefix}：${error}`);
      }
      tags = tags.filter(tag => typeof tag === "string").map(tag => tag.trim());
    }
  }
  if (!body.trim()) errors.push(`技术文章 ${filename} 的正文不能为空`);
  const post =
    fieldPresent(data, "id") && typeof data.id === "number"
      ? { filename, id: data.id, tags }
      : undefined;
  return { errors, post };
}

function inspectShuoshuo(relative, source) {
  const id = relative.replace(/\.md$/, "");
  const prefix = `shuoshuo/${relative}`;
  const errors = [];
  if (!isShuoshuoStableId(id)) {
    errors.push(`说说文件名必须是有效的上海时间 YYYYMMDD-HHmmss：${relative}`);
  }
  let document;
  try {
    document = parseMarkdownDocument(source, { required: true });
  } catch (error) {
    errors.push(`${prefix}：${error.message}`);
    return errors;
  }
  const { data, quoted, body } = document;
  errors.push(...unknownFields(data, SHUOSHUO_FIELDS, prefix));
  for (const key of SHUOSHUO_REQUIRED) {
    if (!fieldPresent(data, key)) errors.push(`${prefix}：缺少 ${key}`);
  }
  if (fieldPresent(data, "publishedAt")) {
    const error = inspectPublishedAt(data.publishedAt, quoted.publishedAt, prefix);
    if (error) errors.push(error);
  }
  if (fieldPresent(data, "draft") && typeof data.draft !== "boolean") {
    errors.push(`${prefix}：draft 必须是 true 或 false`);
  }
  if (!body.trim()) errors.push(`说说 ${id} 没有可见文字或图片`);
  return errors;
}

async function inspectAbout(path) {
  const source = await readFile(path, "utf8");
  try {
    const document = parseMarkdownDocument(source);
    if (!document.hasFrontmatter) return [];
    return unknownFields(document.data, new Set(), "about.md");
  } catch (error) {
    return [`about.md：${error.message}`];
  }
}

/** @param {string} directory */
export async function validateContent(directory) {
  const paths = contentPaths(directory);
  const errors = [];
  for (const [path, directoryKind, label] of [
    [paths.root, true, "内容目录"],
    [paths.posts, true, "posts 目录"],
    [paths.shuoshuo, true, "shuoshuo 目录"],
    [paths.about, false, "about.md"],
    [paths.counter, false, "技术文章号码计数器"],
  ]) {
    const error = await missingPath(path, directoryKind, label);
    if (error) errors.push(error);
  }
  if (errors.length) throw new Error(errors.join("\n"));

  errors.push(...(await inspectAbout(paths.about)));

  const posts = [];
  const tagHrefs = new Map();
  for (const relative of await markdownEntries(paths.posts)) {
    const source = await readFile(join(paths.posts, relative), "utf8");
    const { errors: postErrors, post } = inspectPost(relative, source);
    errors.push(...postErrors);
    if (!post) continue;
    posts.push(post);
    for (const tag of post.tags) {
      if (!tag) continue;
      const { href, name } = getTag(tag);
      const owner = tagHrefs.get(href);
      if (owner && owner !== name) {
        errors.push(`标签「${owner}」与「${name}」生成了相同的网址：${href}`);
      }
      tagHrefs.set(href, name);
    }
  }

  try {
    await assertPostStableIds(
      paths.posts,
      posts.map(post => ({ filename: post.filename, id: post.id })),
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  for (const relative of await markdownEntries(paths.shuoshuo)) {
    errors.push(
      ...inspectShuoshuo(relative, await readFile(join(paths.shuoshuo, relative), "utf8")),
    );
  }

  if (errors.length) throw new Error(errors.join("\n"));
}
