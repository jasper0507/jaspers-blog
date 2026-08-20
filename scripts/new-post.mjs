import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createPostDraft,
  filenameFromTitle,
  formatPostNextId,
  POST_CONTENT_DIRECTORY,
  postNextIdPath,
  readPostNextId,
} from "../src/lib/post-rules.js";
import { alignMain } from "./lib/repo-sync.mjs";

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("用法：npm run new:post -- <标题>");

const title = args[0].trim();
if (!title) throw new Error("标题不能为空");

const filename = filenameFromTitle(title);
if (!filename) throw new Error("标题无法生成有效文件名");

const aligned = await alignMain(process.cwd(), "create");
if (aligned.status === "fast-forwarded") console.log("已与网上对齐");

const directory = POST_CONTENT_DIRECTORY;
const path = join(directory, `${filename}.md`);
const nextIdPath = postNextIdPath(directory);

let next;
try {
  next = readPostNextId(await readFile(nextIdPath, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") throw new Error("找不到技术文章号码计数器", { cause: error });
  throw error;
}

await mkdir(directory, { recursive: true });
const { source } = createPostDraft({ title, id: next });
try {
  await writeFile(path, source, { flag: "wx" });
} catch (error) {
  if (error?.code === "EEXIST") throw new Error(`技术文章已存在：${path}`, { cause: error });
  throw error;
}

try {
  await writeFile(nextIdPath, formatPostNextId(next + 1));
} catch (error) {
  try {
    await unlink(path);
  } catch (cleanupError) {
    throw new Error(`未能写入号码计数器，且无法撤回已创建的文件：${path}`, {
      cause: cleanupError,
    });
  }
  throw error;
}

console.log(`已创建 ${path}`);
console.log(`公开网址 /posts/${next}/`);
