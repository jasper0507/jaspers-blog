import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";

export const POST_MIGRATIONS = [
  [
    "零基础利用Github、Hexo搭建个人博客-超详细版.md",
    "github-hexo-blog-guide",
    "9e8011b6b8487f1f5d50db9cdc5280350505605402e4c9b0ecb6b1749be067cb",
  ],
  [
    "LoRA-FAIR论文精读.md",
    "lora-fair-paper-notes",
    "f5dde8ecdcbaf1e6633d256b6efd50edf28ba65ec723f9a5e8bee3e4ae47e018",
  ],
  [
    "Go语言笔记-长期更新.md",
    "go-notes",
    "f59a2773da5c81540bae4ea7871f2fa6955a944bc841958ea08d4e3cf1cd4460",
  ],
  [
    "git新手入门参考.md",
    "git-beginner-guide",
    "c327ea2042ec0a8848e52f22c39e3f9dad9e3cc44e2ece41c2d2da520e5d3143",
  ],
  [
    "Gin笔记-长期更新.md",
    "gin-notes",
    "4b945a9a1bdb6210d80ca5e3cde5a1febada347d1f77bc9fa445d4840ad3773c",
  ],
  [
    "FedRD论文精读.md",
    "fedrd-paper-notes",
    "36672a75972418a51dc3f2322b8e669df78310fb212a2d1907698ceb2e0c8df9",
  ],
  [
    "DSFedMed论文精读.md",
    "dsfedmed-paper-notes",
    "2c07e818c45741806aad8e805814c847aa0eeb60f9af892be7329a756de1d803",
  ],
  [
    "DEeR论文精读.md",
    "deer-paper-notes",
    "3d2285c8bb535baa19949fbc7071a18e6b7b5153d27a1e995bd747ff836621c5",
  ],
  [
    "如何新增博客内容？.md",
    "hexo-icarus-content-guide",
    "8e84d960de1bc961feca366a0ec57baf36a304f080f8d965c67dfc131237a327",
  ],
  [
    "Transformer论文逐段精读.md",
    "transformer-paper-notes",
    "daf257232727176ef8508c23c85ec90df592555c27c607d46bd65d208f9d4677",
  ],
  [
    "Markdown快速上手语法.md",
    "markdown-quick-start",
    "9c07137e59a1c404c6b2c8238cd16671723d6e59c118873f33398abf67961858",
  ],
  [
    "新手安装Docker教程（Windows11-WSL2）.md",
    "docker-on-windows-wsl2",
    "c3a641f57a6ecdc6e55274380da2a9e6d50be2bf167088d2f3d557091dad0c33",
  ],
  [
    "数据结构与算法-长期更新.md",
    "data-structures-and-algorithms",
    "9d34d2426b26883c2f57e8cbb631caaaa187497121a54f98999dedda81c4c846",
  ],
  [
    "深度学习笔记.md",
    "deep-learning-notes",
    "8dbf293f9b4760361a250571bb94a2ba10d32c170bb92208c3db5b31692cbd4d",
  ],
  [
    "计算机网络笔记.md",
    "computer-networks-notes",
    "0849f72fe66c47bf01c4b3c5cdce6d4647f80e9cea9d30a6f6c8c140eea09316",
  ],
].map(([source, slug, sourceSha256]) => ({ source, slug, sourceSha256 }));

export const LEGACY_ASSETS = [
  {
    post: "github-hexo-blog-guide",
    sourceDir: "零基础利用Github、Hexo搭建个人博客-超详细版",
    source: "博客主题配置教程示例.jpg",
    target: "theme-configuration-example.jpg",
    sha256: "4dd6fc21d126402dc809fdd0f3228b3782bae0069b2c93a3905f0910fba3f0f2",
  },
  {
    post: "github-hexo-blog-guide",
    sourceDir: "零基础利用Github、Hexo搭建个人博客-超详细版",
    source: "主题安装示例.jpg",
    target: "theme-installation-example.jpg",
    sha256: "b2bdfa0ed7579c8b8dc8c2155728f6f11187ad74e36ec3aba4f98e61213eac30",
  },
  {
    post: "transformer-paper-notes",
    sourceDir: "Transformer论文逐段精读",
    source: "Layer-Normalization-vs-Batch-Normalization.png",
    target: "layer-normalization-vs-batch-normalization.png",
    sha256: "e8f0dc7b305ecf059dd991bdddcb8b40539b4138aa8ae2dbe5475380df5252f5",
  },
  {
    post: "transformer-paper-notes",
    sourceDir: "Transformer论文逐段精读",
    source: "向量点积.png",
    target: "vector-dot-product.png",
    sha256: "430c9bc4175d6b6e93d81287d22302805a6a308bc913deafddb6c544653e8897",
  },
  {
    post: "transformer-paper-notes",
    sourceDir: "Transformer论文逐段精读",
    source: "注意力机制.png",
    target: "attention-mechanism.png",
    sha256: "9aab768ef59d8fbfa511cc50e658059e3d4e4ccf5cde59dd06d18539720598ca",
  },
];

const INTERNAL_LINKS = new Map([
  [
    "https://jasper0507.github.io/2026/01/22/%E5%A6%82%E4%BD%95%E6%96%B0%E5%A2%9E%E5%8D%9A%E5%AE%A2%E5%86%85%E5%AE%B9%EF%BC%9F/",
    "https://blog.jasper0507.cc.cd/posts/hexo-icarus-content-guide/",
  ],
]);

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

export function normalizeShanghaiDate(value) {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`无法解析旧文章时间：${value}`);
  const [, year, month, day, hour, minute, second] = match;
  const numbers = [month, day, hour, minute, second].map(Number);
  const [monthNumber, dayNumber, hourNumber, minuteNumber, secondNumber] = numbers;
  const daysInMonth = new Date(Date.UTC(Number(year), monthNumber, 0)).getUTCDate();
  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > daysInMonth ||
    hourNumber > 23 ||
    minuteNumber > 59 ||
    secondNumber > 59
  ) {
    throw new Error(`无法解析旧文章时间：${value}`);
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour}:${minute}:${second}+08:00`;
}

export function parseLegacyPost(source) {
  const normalized = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error("旧文章缺少有效 frontmatter");

  const fields = {};
  let listKey;
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey) {
      fields[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const field = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!field) throw new Error(`无法解析旧 frontmatter：${line}`);
    const [, key, rawValue = ""] = field;
    if (!rawValue) {
      fields[key] = [];
      listKey = key;
    } else {
      fields[key] = unquote(rawValue.trim());
      listKey = undefined;
    }
  }

  for (const field of ["title", "date", "updated", "excerpt"]) {
    if (typeof fields[field] !== "string" || !fields[field].trim()) {
      throw new Error(`旧文章字段 ${field} 必须是非空字符串`);
    }
  }
  for (const field of ["categories", "tags"]) {
    if (
      !Array.isArray(fields[field]) ||
      fields[field].length === 0 ||
      fields[field].some(value => typeof value !== "string" || !value.trim())
    ) {
      throw new Error(`旧文章字段 ${field} 必须是非空列表`);
    }
  }

  return {
    title: fields.title,
    description: fields.excerpt,
    publishedAt: normalizeShanghaiDate(fields.date),
    updatedAt: normalizeShanghaiDate(fields.updated),
    tags: [...new Set([...fields.categories, ...fields.tags])],
    body: match[2],
  };
}

function headingText(value) {
  return value.replace(/[ \t]+#+[ \t]*$/, "").trim();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function transformLegacyBody(body, title, migration) {
  let fence;
  let firstHeadingSeen = false;
  let previousHeadingLevel = 1;
  const depthSevenSlugger = new GithubSlugger();
  const lines = body.split("\n").flatMap((line, index, sourceLines) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      const [sequence] = marker.slice(1);
      if (!fence) fence = { character: sequence[0], length: sequence.length };
      else if (
        sequence[0] === fence.character &&
        sequence.length >= fence.length &&
        new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)
      ) {
        fence = undefined;
      }
      return [line];
    }
    if (fence) return [line];
    if (
      /^ {0,3}-{3,}[ \t]*$/.test(line) &&
      sourceLines[index - 1]?.trim() &&
      !/^ {0,3}(`{3,}|~{3,})/.test(sourceLines[index - 1])
    ) {
      return ["", line];
    }

    const heading = line.match(/^( {0,3})(#{1,6})([ \t]+)(.*)$/);
    if (!heading) return [line];
    const isDuplicateTitle = !firstHeadingSeen && headingText(heading[4]) === title;
    firstHeadingSeen = true;
    if (isDuplicateTitle) return [];
    const level = Math.min(heading[2].length + 1, previousHeadingLevel + 1);
    previousHeadingLevel = level;
    if (level > 6) {
      // ponytail: HTML stops at H6; ARIA preserves the rare legacy H7 without a plugin.
      const slug = depthSevenSlugger.slug(headingText(heading[4]));
      return [
        `<h6 role="heading" aria-level="7" id="${migration.slug}-depth-7-${escapeHtml(slug)}">${escapeHtml(headingText(heading[4]))}</h6>`,
      ];
    }
    return [`${heading[1]}${"#".repeat(level)}${heading[3]}${heading[4]}`];
  });

  let transformed = lines.join("\n");
  for (const asset of LEGACY_ASSETS.filter(({ post }) => post === migration.slug)) {
    transformed = transformed.replaceAll(
      `${asset.sourceDir}/${asset.source}`,
      `/images/posts/${migration.slug}/${asset.target}`,
    );
  }
  for (const [legacyUrl, canonicalUrl] of INTERNAL_LINKS) {
    transformed = transformed.replaceAll(legacyUrl, canonicalUrl);
  }
  return transformed;
}

export function migrateLegacyPost(source, migration) {
  const post = parseLegacyPost(source);
  const tags = post.tags.map(tag => `  - ${JSON.stringify(tag)}`).join("\n");
  return `---
title: ${JSON.stringify(post.title)}
description: ${JSON.stringify(post.description)}
publishedAt: ${post.publishedAt}
updatedAt: ${post.updatedAt}
tags:
${tags}
draft: false
---
${transformLegacyBody(post.body, post.title, migration)}`;
}

async function main() {
  const sourceDir = process.argv[2];
  if (!sourceDir) throw new Error("用法：node scripts/migrate-hexo.mjs <旧 Hexo _posts 目录>");

  const expectedSources = [...POST_MIGRATIONS.map(({ source }) => source), "hello-world.md"].sort();
  const actualSources = (await readdir(sourceDir)).filter(file => file.endsWith(".md")).sort();
  if (JSON.stringify(actualSources) !== JSON.stringify(expectedSources)) {
    throw new Error("旧 Hexo 文章清单与已确认的 15 篇迁移映射不一致");
  }

  const projectRoot = path.resolve(import.meta.dirname, "..");
  const postsDir = path.join(projectRoot, "src/content/posts");
  await mkdir(postsDir, { recursive: true });

  for (const migration of POST_MIGRATIONS) {
    const source = await readFile(path.join(sourceDir, migration.source), "utf8");
    const sourceSha256 = createHash("sha256").update(source).digest("hex");
    if (sourceSha256 !== migration.sourceSha256) {
      throw new Error(`旧文章内容与已确认版本不一致：${migration.source}`);
    }
    await writeFile(
      path.join(postsDir, `${migration.slug}.md`),
      migrateLegacyPost(source, migration),
    );
  }

  for (const asset of LEGACY_ASSETS) {
    const targetDir = path.join(projectRoot, "public/images/posts", asset.post);
    await mkdir(targetDir, { recursive: true });
    await copyFile(
      path.join(sourceDir, asset.sourceDir, asset.source),
      path.join(targetDir, asset.target),
    );
  }

  console.log(`已迁移 ${POST_MIGRATIONS.length} 篇技术文章和 ${LEGACY_ASSETS.length} 张图片`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
