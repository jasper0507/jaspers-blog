import { satteri } from "@astrojs/markdown-satteri";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import katex from "katex";
import { defineMdastPlugin, markdownToMdast } from "satteri";

const siteMarkdownFeatures = {
  math: true,
  gfm: {
    footnotes: {
      label: "脚注",
      backLabel: "返回脚注引用",
    },
  },
};
const lazyImagesPlugin = {
  name: "lazy-images",
  element: {
    filter: ["img"],
    visit(node, context) {
      context.setProperty(node, "loading", "lazy");
      context.setProperty(node, "decoding", "async");
    },
  },
};

export function assertSiteMarkdown(source) {
  const tree = markdownToMdast(source, { features: siteMarkdownFeatures });
  const visit = node => {
    if (node.type === "math") renderKatex(node.value, true);
    if (node.type === "inlineMath") renderKatex(node.value, false);
    if ("children" in node) node.children.forEach(visit);
  };
  visit(tree);
}

function renderKatex(source, displayMode) {
  return katex.renderToString(source, { displayMode, throwOnError: true, strict: "warn" });
}

const katexPlugin = {
  name: "site-katex",
  math(node) {
    return { type: "html", value: renderKatex(node.value, true) };
  },
  inlineMath(node) {
    return { type: "html", value: renderKatex(node.value, false) };
  },
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const inlineMarkPattern = /==((?:(?!==).)+?)==/gu;

function splitInlineMarks(value) {
  const parts = [];
  let lastIndex = 0;
  for (const match of value.matchAll(inlineMarkPattern)) {
    if (match.index > lastIndex) {
      parts.push({ value: value.slice(lastIndex, match.index), marked: false });
    }
    parts.push({ value: match[1], marked: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) parts.push({ value: value.slice(lastIndex), marked: false });
  return parts;
}

const separatedMdastChildren = new Set([
  "root",
  "blockquote",
  "list",
  "listItem",
  "table",
  "tableRow",
  "tableCell",
  "footnoteDefinition",
]);

/**
 * 提取未截断的普通文字与图片数量；空投影有效，解析错误直接传播。
 * @param {string} source
 * @returns {{ text: string, imageCount: number }}
 */
export function extractMarkdownContent(source) {
  let imageCount = 0;
  const tree = markdownToMdast(source, { features: siteMarkdownFeatures });

  /** @param {import("satteri").MdastNode} node @returns {string} */
  const visibleText = node => {
    if (node.type === "text")
      return splitInlineMarks(node.value)
        .map(part => part.value)
        .join("");
    if (node.type === "image" || node.type === "imageReference") {
      imageCount += 1;
      return "";
    }
    if (node.type === "break") return " ";
    if (!("children" in node)) return "";
    return node.children
      .map(visibleText)
      .filter(Boolean)
      .join(separatedMdastChildren.has(node.type) ? " " : "");
  };

  const text = visibleText(tree).replace(/\s+/gu, " ").trim();
  return { text, imageCount };
}

/** Typora / 部分编辑器的 `==高亮==`，代码块与行内代码保持字面量。 */
const markPlugin = defineMdastPlugin({
  name: "inline-mark",
  text(node, context) {
    const value = node.value;
    if (!value.includes("==")) return;

    const segments = splitInlineMarks(value);
    if (!segments.some(part => part.marked)) return;
    const parts = segments.map(part =>
      part.marked
        ? { type: "html", value: `<mark>${escapeHtml(part.value)}</mark>` }
        : { type: "text", value: part.value },
    );

    context.insertBefore(node, parts);
    context.removeNode(node);
  },
});

/* Shiki token 颜色走 MarkdownBody 的 --code-*（ADR-0019）；本 module 不拥有 CSS。 */
const kraftPaperTheme = {
  name: "kraft-paper",
  type: "light",
  colors: {
    "editor.background": "var(--code-background)",
    "editor.foreground": "var(--code-foreground)",
  },
  settings: [
    {
      settings: {
        background: "var(--code-background)",
        foreground: "var(--code-foreground)",
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--code-comment)" },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: { foreground: "var(--code-string)" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "var(--code-constant)" },
    },
    {
      scope: ["keyword", "storage"],
      settings: { foreground: "var(--code-keyword)" },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "var(--code-function)" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "var(--code-parameter)" },
    },
  ],
};

const transformerCodeTitle = {
  name: "kraft-code-title",
  pre(node) {
    const title = this.options.meta?.__raw?.match(/(?:^|\s)title=["']([^"']+)["']/)?.[1];
    if (title) node.properties["data-title"] = title;
  },
};

export function siteMarkdown() {
  return {
    processor: satteri({
      features: siteMarkdownFeatures,
      mdastPlugins: [katexPlugin, markPlugin],
      hastPlugins: [lazyImagesPlugin],
    }),
    shikiConfig: {
      theme: kraftPaperTheme,
      wrap: false,
      transformers: [
        transformerCodeTitle,
        transformerMetaHighlight(),
        transformerNotationHighlight(),
        transformerNotationDiff(),
      ],
    },
  };
}
