import GithubSlugger from "github-slugger";

/** 由标签名生成稳定 slug；同名始终得到同一结果。 */
export function getTagSlug(tag) {
  return new GithubSlugger().slug(tag);
}

/** 仅结构校验（开放词表，无封闭登记）。 */
export function getTagError(tag) {
  if (!getTagSlug(tag)) return `标签无法生成有效 URL：${tag}`;
}
