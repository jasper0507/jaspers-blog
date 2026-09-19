/** 与 github-slugger 对创作者标签的结果对齐，避免内容工具引入依赖。 */

export function tagSlug(value) {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_ -]/gu, "")
    .replaceAll(" ", "-");
}

export function getTag(tag) {
  const slug = tagSlug(tag);
  return { name: tag, slug, href: `/tags/${slug}/` };
}

/** 仅结构校验（开放词表，无封闭登记）。 */
export function getTagError(tag) {
  if (!getTag(tag).slug) return `标签无法生成有效 URL：${tag}`;
}
