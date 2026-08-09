import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createShuoshuoDraft, SHUOSHUO_CONTENT_DIRECTORY } from "../src/lib/shuoshuo-rules.js";

const { id, source } = createShuoshuoDraft();
const directory = SHUOSHUO_CONTENT_DIRECTORY;
const path = join(directory, `${id}.md`);

await mkdir(directory, { recursive: true });
await writeFile(path, source, { flag: "wx" });
console.log(`已创建 ${path}`);
