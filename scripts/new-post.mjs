import { createPost, POST_CONTENT_DIRECTORY } from "../src/lib/post-rules.js";

const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("用法：npm run new:post -- <标题>");

const title = args[0].trim();
if (!title) throw new Error("标题不能为空");

const { path, id } = await createPost(POST_CONTENT_DIRECTORY, title);
console.log(`已创建 ${path}`);
console.log(`公开网址 /posts/${id}/`);
