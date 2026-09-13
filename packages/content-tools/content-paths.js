import { join, resolve } from "node:path";

/** 内容仓目录约定：技术文章、说说、关于我正文、号码计数器。 */
export function contentPaths(directory) {
  const root = resolve(directory);
  return {
    root,
    posts: join(root, "posts"),
    shuoshuo: join(root, "shuoshuo"),
    about: join(root, "about.md"),
    counter: join(root, "post-next-id.json"),
  };
}
