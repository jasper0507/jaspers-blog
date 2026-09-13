import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPost } from "./post-rules.js";
import { createShuoshuoDraft } from "./shuoshuo-rules.js";

/** @param {string} directory @param {string[]} args */
export async function createContent(directory, args) {
  const [command, ...values] = args;
  if (command === "new:post" && values.length === 1) {
    const { path, id } = await createPost(join(directory, "posts"), values[0]);
    console.log(`已创建 ${path}`);
    console.log(`公开网址 /posts/${id}/`);
  } else if (command === "new:shuoshuo" && values.length === 0) {
    const { id, source } = createShuoshuoDraft();
    const folder = join(directory, "shuoshuo");
    const path = join(folder, `${id}.md`);
    await mkdir(folder, { recursive: true });
    await writeFile(path, source, { flag: "wx" });
    console.log(`已创建 ${path}`);
  } else {
    throw new Error('用法：jasper-content new:post "标题" 或 jasper-content new:shuoshuo');
  }
}
