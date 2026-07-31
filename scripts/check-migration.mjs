import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyPost, parseLegacyPost, POST_MIGRATIONS } from "./migrate-hexo.mjs";

const legacy = `---
# 旧主题注释
title: 示例文章
date: 2026-1-2 03:04:05
updated: 2026-4-7 08:09:10
categories:
  - 人工智能
  - 联邦学习
tags:
  - 联邦学习
  - Go
excerpt: 示例摘要
toc: true
comments: true
---
# 示例文章
# 正文标题
#### 跳级标题
### 三级标题
#### 四级标题
##### 五级标题
普通文本
---
\`\`\`sh
# 代码注释
\`\`\`
###### 边界标题
![图](零基础利用Github、Hexo搭建个人博客-超详细版/主题安装示例.jpg)
[旧站内链接](https://jasper0507.github.io/2026/01/22/%E5%A6%82%E4%BD%95%E6%96%B0%E5%A2%9E%E5%8D%9A%E5%AE%A2%E5%86%85%E5%AE%B9%EF%BC%9F/)
`;

const parsed = parseLegacyPost(legacy);
assert.equal(parsed.publishedAt, "2026-01-02T03:04:05+08:00");
assert.equal(parsed.updatedAt, "2026-04-07T08:09:10+08:00");
assert.deepEqual(parsed.tags, ["人工智能", "联邦学习", "Go"]);

const migrated = migrateLegacyPost(legacy, {
  source: "零基础利用Github、Hexo搭建个人博客-超详细版.md",
  slug: "github-hexo-blog-guide",
});
assert.match(migrated, /description: "示例摘要"/);
assert.match(migrated, /publishedAt: 2026-01-02T03:04:05\+08:00/);
assert.doesNotMatch(migrated, /categories:|toc:|comments:/);
assert.doesNotMatch(migrated, /^# 示例文章$/m);
assert.match(migrated, /^## 正文标题$/m);
assert.match(migrated, /^### 跳级标题$/m);
assert.match(migrated, /^普通文本\n\n---$/m);
assert.match(migrated, /^# 代码注释$/m);
assert.match(
  migrated,
  /<h6 role="heading" aria-level="7" id="github-hexo-blog-guide-depth-7-边界标题">边界标题<\/h6>/,
);
assert.match(migrated, /\/images\/posts\/github-hexo-blog-guide\/theme-installation-example\.jpg/);
assert.match(migrated, /https:\/\/blog\.jasper0507\.cc\.cd\/posts\/hexo-icarus-content-guide\//);

assert.throws(
  () => parseLegacyPost(legacy.replace("date: 2026-1-2", "date: 2026-2-30")),
  /无法解析旧文章时间/,
);
assert.throws(
  () => parseLegacyPost(legacy.replace("tags:\n  - 联邦学习\n  - Go", "tags: Go")),
  /tags 必须是非空列表/,
);

if (process.env.LEGACY_HEXO_DIR) {
  for (const migration of POST_MIGRATIONS) {
    const source = await readFile(path.join(process.env.LEGACY_HEXO_DIR, migration.source), "utf8");
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      migration.sourceSha256,
      `${migration.source} 应与已确认的旧源一致`,
    );
    assert.equal(
      await readFile(`src/content/posts/${migration.slug}.md`, "utf8"),
      migrateLegacyPost(source, migration),
      `${migration.slug} 应逐字匹配迁移结果`,
    );
  }
}

console.log("迁移转换验收通过");
