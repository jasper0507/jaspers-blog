import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { getTagError } from "./lib/tags";

declare const process: { env: Record<string, string | undefined> };

const posts = defineCollection({
  loader: glob({
    base: process.env.POST_CONTENT_DIR ?? "./src/content/posts",
    pattern: "**/*.md",
    generateId: ({ entry }) => {
      const id = entry.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/)?.[1];
      if (!id) throw new Error(`技术文章文件名必须是小写 ASCII slug：${entry}`);
      return id;
    },
  }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
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
  }),
});

const shuoshuo = defineCollection({
  loader: glob({
    base: process.env.SHUOSHUO_CONTENT_DIR ?? "./src/content/shuoshuo",
    pattern: "**/*.md",
  }),
  schema: z.object({
    publishedAt: z.coerce.date(),
    draft: z.boolean(),
  }),
});

export const collections = { posts, shuoshuo };
