import { glob, readFile } from "node:fs/promises";
import { assertSiteMarkdown } from "../src/lib/site-markdown.js";

const patterns = [
  `${process.env.POST_CONTENT_DIR ?? "src/content/posts"}/**/*.md`,
  `${process.env.SHUOSHUO_CONTENT_DIR ?? "src/content/shuoshuo"}/**/*.md`,
  "src/content/about.md",
];

// ponytail: Astro 7 会吞掉 Markdown processor 异常；上游恢复失败传播后删除这次重复解析。
for (const pattern of patterns) {
  for await (const path of glob(pattern)) {
    try {
      assertSiteMarkdown(await readFile(path, "utf8"));
    } catch (error) {
      throw new Error(`${path}：${error.message}`, { cause: error });
    }
  }
}
