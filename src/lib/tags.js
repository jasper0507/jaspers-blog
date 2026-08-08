import GithubSlugger from "github-slugger";

function getTag(tag) {
  const slug = new GithubSlugger().slug(tag);
  return { name: tag, slug, href: `/tags/${slug}/` };
}

export function getTagHref(tag) {
  return getTag(tag).href;
}

/** 仅结构校验（开放词表，无封闭登记）。 */
export function getTagError(tag) {
  if (!getTag(tag).slug) return `标签无法生成有效 URL：${tag}`;
}

/**
 * @template {{ data: { tags: string[] } }} T
 * @param {T[]} posts
 * @returns {{ name: string; slug: string; href: string; posts: T[] }[]}
 */
export function getPublishedPostTags(posts) {
  /** @type {Map<string, { name: string; slug: string; href: string; posts: T[] }>} */
  const byName = new Map();
  const hrefOwners = new Map();

  for (const post of posts) {
    for (const name of post.data.tags) {
      let entry = byName.get(name);
      if (!entry) {
        const tag = getTag(name);
        const owner = hrefOwners.get(tag.href);
        if (owner && owner !== name) {
          throw new Error(`标签「${owner}」与「${name}」生成了相同的网址：${tag.href}`);
        }
        hrefOwners.set(tag.href, name);
        entry = { ...tag, posts: [] };
        byName.set(name, entry);
      }
      entry.posts.push(post);
    }
  }

  return [...byName.values()].sort(
    (left, right) =>
      right.posts.length - left.posts.length || left.name.localeCompare(right.name, "zh-CN"),
  );
}
