import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPostDraft, isPostSlug, POST_CONTENT_DIRECTORY } from "../src/lib/post-rules.js";
import { alignMain } from "./lib/repo-sync.mjs";

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("用法：npm run new:post -- <slug>");

const [slug] = args;
if (!isPostSlug(slug)) {
  throw new Error("技术文章路径名只能包含小写 ASCII 字母、数字和短横线，且不含扩展名");
}

const aligned = await alignMain(process.cwd(), "create");
if (aligned.status === "fast-forwarded") console.log("已与网上对齐");

const path = join(POST_CONTENT_DIRECTORY, `${slug}.md`);
await mkdir(POST_CONTENT_DIRECTORY, { recursive: true });
try {
  await writeFile(path, createPostDraft().source, { flag: "wx" });
} catch (error) {
  if (error?.code === "EEXIST") throw new Error(`技术文章已存在：${path}`, { cause: error });
  throw error;
}
console.log(`已创建 ${path}`);
