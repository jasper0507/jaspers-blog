import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import type { Loader, LoaderContext, ParseDataOptions } from "astro/loaders";
import { z } from "astro/zod";
import {
  hasValidShuoshuoPublishedAtSource,
  isShuoshuoStableId,
  SHUOSHUO_CONTENT_DIRECTORY,
} from "./lib/shuoshuo-rules.js";
import { getTagError } from "./lib/tags";

declare const process: {
  env: Record<string, string | undefined>;
  getBuiltinModule(name: "fs/promises"): {
    readFile(path: string, encoding: "utf8"): Promise<string>;
  };
};

const { readFile } = process.getBuiltinModule("fs/promises");

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

const shuoshuoFiles = glob({
  base: process.env.SHUOSHUO_CONTENT_DIR ?? `./${SHUOSHUO_CONTENT_DIRECTORY}`,
  pattern: "**/*.md",
  generateId: ({ entry }) => {
    const id = entry.match(/^(.+)\.md$/)?.[1] ?? "";
    if (!isShuoshuoStableId(id)) {
      throw new Error(`说说文件名必须是有效的上海时间 YYYYMMDD-HHmmss：${entry}`);
    }
    return id;
  },
});
const shuoshuoLoader: Loader = {
  name: "shuoshuo-loader",
  async load(context: LoaderContext) {
    await shuoshuoFiles.load({
      ...context,
      parseData: async <TData extends Record<string, unknown>>(
        options: ParseDataOptions<TData>,
      ) => {
        if (!options.filePath) throw new Error(`说说 ${options.id} 缺少源文件路径`);
        const source = await readFile(options.filePath, "utf8");
        if (!hasValidShuoshuoPublishedAtSource(source)) {
          throw new Error(`说说 ${options.id} 的发布时间必须是有效的上海时间并带 +08:00`);
        }
        return context.parseData(options);
      },
    });
  },
};

const shuoshuo = defineCollection({
  loader: shuoshuoLoader,
  schema: z
    .object({
      publishedAt: z.coerce.date(),
      draft: z.boolean(),
    })
    .strict(),
});

export const collections = { posts, shuoshuo };
