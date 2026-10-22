// 正文 heti 网格（docs/typography.md）：默认根字号 16px，一行 = 24px。
// 在 1440px 与 390px 视口验证；仅记录 margin / padding。
// rows: [tag, margin 上右下左, padding 上右下左]；edges: [html, margin 上下]。
type SpacingBaseline = {
  html: string;
  rows: [string, ...number[]][];
  edges: [string, number, number][];
};

const proseHtml =
  '<p>first <code>code</code> <mark>mark</mark></p><h2>heading <code>code</code> <mark>mark</mark></h2><h3>heading <code>code</code> <mark>mark</mark></h3><h4>heading <code>code</code> <mark>mark</mark></h4><h5>heading</h5><h6>heading</h6><p>next</p><ul><li>item<ul><li>nested</li></ul></li></ul><ol><li>item</li></ol><blockquote><p>quote</p><p>quote second</p><blockquote><p>nested</p></blockquote></blockquote><img src="/favicon.svg"><pre class="astro-code" data-title="filename"><code>code</code></pre><table><thead><tr><th>head <code>code</code> <mark>mark</mark></th><th>second</th></tr></thead><tbody><tr><td>cell <code>code</code> <mark>mark</mark></td><td>second</td></tr></tbody></table><pre><code>raw</code></pre><hr><details open><summary>Summary</summary><p>Detail</p></details>';

// 文章与说说共用同一套网格，数值不随页面变化。
const prose: SpacingBaseline = {
  html: proseHtml,
  rows: [
    ["P", 0, 0, 24, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 0.8, 3.2, 0.8, 3.2],
    ["H2", 24, 0, 12, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 1.2, 4.8, 1.2, 4.8],
    ["H3", 12, 0, 12, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 1, 4, 1, 4],
    ["H4", 12, 0, 12, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 0.9, 3.6, 0.9, 3.6],
    ["H5", 12, 0, 12, 0, 0, 0, 0, 0],
    ["H6", 12, 0, 12, 0, 0, 0, 0, 0],
    ["P", 12, 0, 24, 0, 0, 0, 0, 0],
    ["UL", 12, 0, 24, 0, 0, 0, 0, 32],
    ["LI", 0, 0, 0, 0, 0, 0, 0, 0],
    ["UL", 0, 0, 0, 0, 0, 0, 0, 32],
    ["LI", 0, 0, 0, 0, 0, 0, 0, 0],
    ["OL", 12, 0, 24, 0, 0, 0, 0, 32],
    ["LI", 0, 0, 0, 0, 0, 0, 0, 0],
    ["BLOCKQUOTE", 12, 0, 24, 0, 12, 16, 12, 16],
    ["P", 0, 0, 24, 0, 0, 0, 0, 0],
    ["P", 12, 0, 24, 0, 0, 0, 0, 0],
    ["BLOCKQUOTE", 12, 0, 0, 0, 12, 16, 12, 16],
    ["P", 0, 0, 0, 0, 0, 0, 0, 0],
    ["IMG", 12, 0, 24, 0, 0, 0, 0, 0],
    ["PRE", 12, 0, 24, 0, 12, 16, 12, 16],
    ["CODE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TABLE", 12, 0, 24, 0, 0, 0, 0, 0],
    ["THEAD", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TR", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TH", 0, 0, 0, 0, 12.8, 19.2, 12.8, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 0.744, 2.976, 0.744, 2.976],
    ["TH", 0, 0, 0, 0, 12.8, 0, 12.8, 0],
    ["TBODY", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TR", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TD", 0, 0, 0, 0, 12.8, 19.2, 12.8, 0],
    ["CODE", 0, 0, 0, 0, 1.584, 6.336, 1.9008, 6.336],
    ["MARK", 0, 0, 0, 0, 0.744, 2.976, 0.744, 2.976],
    ["TD", 0, 0, 0, 0, 12.8, 0, 12.8, 0],
    ["PRE", 12, 0, 24, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["HR", 48, 0, 47, 0, 0, 0, 0, 0],
    ["DETAILS", 12, 0, 0, 0, 12, 16, 12, 16],
    ["SUMMARY", 0, 0, 12, 0, 0, 0, 0, 0],
    ["P", 12, 0, 0, 0, 0, 0, 0, 0],
  ],
  edges: [
    ["<p>x</p>", 0, 0],
    ["<h2>x</h2>", 0, 0],
    ["<h3>x</h3>", 0, 0],
    ["<h4>x</h4>", 0, 0],
    ["<ul><li>x</li></ul>", 0, 0],
    ["<blockquote><p>x</p></blockquote>", 0, 0],
    ['<pre class="astro-code">x</pre>', 0, 0],
    ["<table><tbody><tr><td>x</td></tr></tbody></table>", 0, 0],
    ["<pre>x</pre>", 0, 0],
    ["<hr>", 0, 0],
    ["<details><summary>x</summary></details>", 0, 0],
    ['<span class="katex-display">x</span>', 0, 0],
  ],
};
const about: SpacingBaseline = {
  html: '<p>first <code>code</code><mark>mark</mark></p><p>next</p><ul><li>item</li></ul><ol><li>ordered</li></ol><blockquote><p>quote</p></blockquote><details open><summary>Summary</summary><p>Detail</p></details><h1>heading</h1><h2>heading</h2><h3>heading</h3><h4>heading</h4><h5>heading</h5><h6>heading</h6><img src="/favicon.svg"><pre class="astro-code" data-title="filename"><code>code</code></pre><table><tbody><tr><td>cell</td><td>cell2</td></tr></tbody></table><hr><span class="katex-display">math</span>',
  rows: [
    ["P", 0, 0, 29.6, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["MARK", 0, 0, 0, 0, 0, 0, 0, 0],
    ["P", 0, 0, 22.4, 0, 0, 0, 0, 0],
    ["UL", 0, 0, 0, 0, 0, 0, 0, 21.6],
    ["LI", 0, 0, 0, 0, 0, 0, 0, 0],
    ["OL", 0, 0, 0, 0, 0, 0, 0, 0],
    ["LI", 0, 0, 0, 0, 0, 0, 0, 0],
    ["BLOCKQUOTE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["P", 0, 0, 29.6, 0, 0, 0, 0, 0],
    ["DETAILS", 0, 0, 0, 0, 0, 0, 0, 0],
    ["SUMMARY", 0, 0, 0, 0, 0, 0, 0, 0],
    ["P", 0, 0, 29.6, 0, 0, 0, 0, 0],
    ["H1", 0, 0, 24, 0, 0, 0, 0, 0],
    ["H2", 0, 0, 0, 0, 0, 0, 0, 0],
    ["H3", 0, 0, 0, 0, 0, 0, 0, 0],
    ["H4", 0, 0, 0, 0, 0, 0, 0, 0],
    ["H5", 0, 0, 0, 0, 0, 0, 0, 0],
    ["H6", 0, 0, 0, 0, 0, 0, 0, 0],
    ["IMG", 0, 0, 0, 0, 0, 0, 0, 0],
    ["PRE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["CODE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TABLE", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TBODY", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TR", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TD", 0, 0, 0, 0, 0, 0, 0, 0],
    ["TD", 0, 0, 0, 0, 0, 0, 0, 0],
    ["HR", 0, 0, 0, 0, 0, 0, 0, 0],
    ["SPAN", 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  edges: [],
};

// 关于页保留 2026-10-09 前的专用留白，单独记录。
export const spacingSamples = [
  { route: "/posts/2/", ...prose },
  { route: "/shuoshuo/20250101-000001/", ...prose },
  { route: "/shuoshuo/", ...prose },
  { route: "/about/", ...about },
];
