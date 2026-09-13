import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { isPostFilename } from "./lib/post-rules.js";
import { isShanghaiDateTime } from "./lib/shanghai-time.js";
import { isShuoshuoStableId } from "./lib/shuoshuo-rules.js";
import { getTagError } from "./lib/tags";

import { contentSource } from "./lib/content-source.js";

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
  schema: z
    .object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      id: z.number().int().positive(),
      publishedAt,
      tags: z
        .array(
          z
            .string()
            .trim()
            .min(1)
            .superRefine((tag, context) => {
              const error = getTagError(tag);
              if (error) {
                context.addIssue({
                  code: "custom",
                  message: error,
                });
              }
            }),
        )
        .default([])
        .refine(tags => new Set(tags).size === tags.length, "标签不得重复"),
      draft: z.boolean(),
    })
    .strict(),
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
