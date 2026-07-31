import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const parts = Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .map(({ type, value }) => [type, value]),
);
const id = `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
const directory = join("src", "content", "shuoshuo");
const path = join(directory, `${id}.md`);
const source = `---
publishedAt: ${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00
draft: true
---

在这里写说说。
`;

await mkdir(directory, { recursive: true });
await writeFile(path, source, { flag: "wx" });
console.log(`已创建 ${path}`);
