import { statSync } from "node:fs";
import { contentPaths } from "../../packages/content-tools/content-paths.js";

/** 网站只有一个内容来源；过渡入口显式传入 src/content。 */
export function contentSource() {
  const selected = process.env.BLOG_CONTENT_DIR;
  if (!selected?.trim()) throw new Error("必须显式设置 BLOG_CONTENT_DIR 内容目录");
  const paths = contentPaths(selected);
  for (const [name, path] of Object.entries(paths)) {
    let stat;
    try {
      stat = statSync(path);
    } catch (error) {
      throw new Error(`缺少内容来源或必要状态：${path}`, { cause: error });
    }
    const directory = ["root", "posts", "shuoshuo"].includes(name);
    if (directory ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`内容来源类型无效：${path}`);
    }
  }
  return paths;
}
