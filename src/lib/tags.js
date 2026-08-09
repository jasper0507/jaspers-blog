import GithubSlugger from "github-slugger";

export function getTag(tag) {
  const slug = new GithubSlugger().slug(tag);
  return { name: tag, slug, href: `/tags/${slug}/` };
}

/** 仅结构校验（开放词表，无封闭登记）。 */
export function getTagError(tag) {
  if (!getTag(tag).slug) return `标签无法生成有效 URL：${tag}`;
}
