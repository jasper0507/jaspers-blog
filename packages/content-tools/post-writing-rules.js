import { isShanghaiDateTime } from "./shanghai-time.js";
import { getTag, getTagError } from "./tag-rules.js";

const FIELDS = new Set(["title", "description", "id", "publishedAt", "tags", "draft"]);

/**
 * @typedef {object} PostWritingIssue
 * @property {Array<string | number>} path
 * @property {string} message
 */

/**
 * @typedef {object} PostFrontmatter
 * @property {string} title
 * @property {string} description
 * @property {number} id
 * @property {string} publishedAt
 * @property {string[]} tags
 * @property {boolean} draft
 */

/**
 * @typedef {{ id: string, tags: readonly string[] }} PostTagRecord
 */

/**
 * @typedef {{ id?: number, tags?: string[] }} PostCollectionFields
 */

/**
 * @typedef {{ href: string, names: [string, string], message: string }} TagUrlConflict
 */

function missing(data, key) {
  return !Object.hasOwn(data, key) || data[key] === null || data[key] === undefined;
}

function normalizeTags(tags) {
  /** @type {PostWritingIssue[]} */
  const issues = [];
  if (!Array.isArray(tags)) {
    return { issues: [{ path: ["tags"], message: "标签必须是列表" }] };
  }

  /** @type {string[]} */
  const normalized = [];
  const seen = new Set();
  let duplicate = false;
  for (let index = 0; index < tags.length; index += 1) {
    const tag = tags[index];
    const path = ["tags", index];
    if (typeof tag !== "string") {
      issues.push({ path, message: "标签不能为空" });
      continue;
    }
    const name = tag.trim();
    if (!name) {
      issues.push({ path, message: "标签不能为空" });
      continue;
    }
    const error = getTagError(name);
    if (error) {
      issues.push({ path, message: error });
      continue;
    }
    if (seen.has(name)) duplicate = true;
    else normalized.push(name);
    seen.add(name);
  }
  if (duplicate) issues.push({ path: ["tags"], message: "标签不得重复" });
  return { issues, value: normalized };
}

/**
 * @param {unknown} data
 * @returns {{ ok: true, value: PostFrontmatter } | { ok: false, issues: PostWritingIssue[], collection: PostCollectionFields }}
 */
export function normalizePostFrontmatter(data) {
  /** @type {PostWritingIssue[]} */
  const issues = [];
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    for (const key of ["title", "description", "publishedAt", "draft", "id"]) {
      issues.push({ path: [key], message: `缺少 ${key}` });
    }
    return { ok: false, issues };
  }

  const record = /** @type {Record<string, unknown>} */ (data);
  for (const key of Object.keys(record)) {
    if (!FIELDS.has(key)) {
      issues.push({ path: [key], message: `不能包含未知字段 ${key}` });
    }
  }

  let title;
  if (missing(record, "title")) issues.push({ path: ["title"], message: "缺少 title" });
  else if (typeof record.title !== "string") {
    issues.push({ path: ["title"], message: "标题必须是文字" });
  } else {
    title = record.title.trim();
    if (!title) issues.push({ path: ["title"], message: "标题不能为空" });
  }

  let description;
  if (missing(record, "description")) {
    issues.push({ path: ["description"], message: "缺少 description" });
  } else if (typeof record.description !== "string") {
    issues.push({ path: ["description"], message: "摘要必须是文字" });
  } else {
    description = record.description.trim();
  }

  let publishedAt;
  if (missing(record, "publishedAt")) {
    issues.push({ path: ["publishedAt"], message: "缺少 publishedAt" });
  } else if (typeof record.publishedAt !== "string" || !isShanghaiDateTime(record.publishedAt)) {
    issues.push({
      path: ["publishedAt"],
      message: "发布时间必须是有效的上海时间并带 +08:00",
    });
  } else {
    publishedAt = record.publishedAt;
  }

  let tags;
  if (!Object.hasOwn(record, "tags") || record.tags === undefined) {
    tags = [];
  } else {
    const result = normalizeTags(record.tags);
    issues.push(...result.issues);
    if (!result.issues.length) tags = result.value;
  }

  let draft;
  if (missing(record, "draft")) issues.push({ path: ["draft"], message: "缺少 draft" });
  else if (typeof record.draft !== "boolean") {
    issues.push({ path: ["draft"], message: "draft 必须是 true 或 false" });
  } else {
    draft = record.draft;
  }

  let id;
  if (missing(record, "id")) issues.push({ path: ["id"], message: "缺少 id" });
  else if (typeof record.id !== "number" || !Number.isSafeInteger(record.id) || record.id < 1) {
    issues.push({ path: ["id"], message: "id 必须是正整数" });
  } else {
    id = record.id;
  }

  /** @type {PostCollectionFields} */
  const collection = {};
  if (id !== undefined) collection.id = id;
  if (tags !== undefined) collection.tags = tags;

  if (issues.length) return { ok: false, issues, collection };
  return {
    ok: true,
    value: { title, description, id, publishedAt, tags, draft },
  };
}

/**
 * @param {readonly PostTagRecord[]} posts
 * @returns {TagUrlConflict[]}
 */
export function findTagUrlConflicts(posts) {
  /** @type {TagUrlConflict[]} */
  const conflicts = [];
  const owners = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      const { href } = getTag(tag);
      const owner = owners.get(href);
      if (owner && owner !== tag) {
        conflicts.push({
          href,
          names: [owner, tag],
          message: `标签「${owner}」与「${tag}」生成了相同的网址：${href}`,
        });
      }
      owners.set(href, tag);
    }
  }
  return conflicts;
}
