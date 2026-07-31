import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z
      .array(z.string().trim().min(1))
      .min(1)
      .refine(tags => new Set(tags).size === tags.length, "标签不得重复"),
    draft: z.boolean(),
  }),
});

export const collections = { posts };
