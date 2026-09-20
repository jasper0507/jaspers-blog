import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { isPostFilename } from "../packages/content-tools/post-rules.js";
import { isShanghaiDateTime } from "../packages/content-tools/shanghai-time.js";
import { isShuoshuoStableId } from "../packages/content-tools/shuoshuo-rules.js";

import { contentSource } from "./lib/content-source.js";
import { postsSchema } from "./lib/posts-schema.ts";

const source = contentSource();

const publishedAt = z
  .string()
  .refine(isShanghaiDateTime, "发布时间必须是有效的上海时间并带 +08:00")
  .transform(value => new Date(value));

const postFiles = glob({
  base: source.posts,
  pattern: "**/*.md",
  generateId: ({ entry }) => {
    const id = entry.match(/^(.+)\.md$/)?.[1] ?? "";
    if (!isPostFilename(id)) throw new Error(`技术文章文件名无效：${entry}`);
    return id;
  },
});
const posts = defineCollection({
  loader: postFiles,
  schema: postsSchema,
});

const shuoshuoFiles = glob({
  base: source.shuoshuo,
  pattern: "**/*.md",
  generateId: ({ entry }) => {
    const id = entry.match(/^(.+)\.md$/)?.[1] ?? "";
    if (!isShuoshuoStableId(id)) {
      throw new Error(`说说文件名必须是有效的上海时间 YYYYMMDD-HHmmss：${entry}`);
    }
    return id;
  },
});
const shuoshuo = defineCollection({
  loader: shuoshuoFiles,
  schema: z
    .object({
      publishedAt,
      draft: z.boolean(),
    })
    .strict(),
});

const about = defineCollection({
  loader: glob({ base: source.root, pattern: "about.md" }),
  schema: z.object({}).strict(),
});

export const collections = { posts, shuoshuo, about };
