import { formatShanghaiDateTime } from "./shanghai-time.js";

export const POST_CONTENT_DIRECTORY = "src/content/posts";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function isPostSlug(value) {
  return typeof value === "string" && slugPattern.test(value);
}
