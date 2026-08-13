import { formatShanghaiDateTime, isShanghaiDateTime } from "./shanghai-time.js";

export const POST_CONTENT_DIRECTORY = "src/content/posts";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const publishedAtLinePattern = /^publishedAt:\s*(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/m;

export function createPostDraft() {
  const publishedAt = formatShanghaiDateTime(new Date());
  return {
    publishedAt,
    source: `---
title: ""
description: ""
publishedAt: "${publishedAt}"
tags: []
draft: false
---
`,
  };
}

export function hasValidPostPublishedAtSource(source) {
  const frontmatter = frontmatterPattern.exec(source)?.[1];
  const match = frontmatter && publishedAtLinePattern.exec(frontmatter);
  return isShanghaiDateTime(match?.[1] ?? match?.[2] ?? match?.[3]);
}

export function isPostSlug(value) {
  return typeof value === "string" && slugPattern.test(value);
}
