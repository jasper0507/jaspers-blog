import { z } from "astro/zod";
import { normalizePostFrontmatter } from "../../packages/content-tools/post-writing-rules.js";

export interface PostCollectionData {
  title: string;
  description: string;
  id: number;
  publishedAt: Date;
  tags: string[];
  draft: boolean;
}

export const postsSchema = z.unknown().transform((data, ctx): PostCollectionData => {
  const result = normalizePostFrontmatter(data);
  if (!result.ok) {
    for (const issue of result.issues) {
      ctx.addIssue({
        code: "custom",
        message: issue.message,
        path: issue.path,
      });
    }
    return z.NEVER;
  }
  return {
    ...result.value,
    publishedAt: new Date(result.value.publishedAt),
  };
});
