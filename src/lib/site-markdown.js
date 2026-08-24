import { satteri } from "@astrojs/markdown-satteri";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import katex from "katex";

function renderKatex(source, displayMode) {
  return katex.renderToString(source, { displayMode, throwOnError: false, strict: "ignore" });
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
      features: {
        math: true,
        gfm: {
          footnotes: {
            label: "脚注",
            backLabel: "返回脚注引用",
          },
        },
      },
      mdastPlugins: [katexPlugin],
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
