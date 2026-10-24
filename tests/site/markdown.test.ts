import assert from "node:assert/strict";
import { test } from "node:test";
import { extractMarkdownContent, IMAGE_MARK } from "../../src/lib/site-markdown.js";

test("Markdown 提取保留文字、段落间隔与高亮内容", () => {
  const source = `开头==甲==中间==乙 & 丙==结尾。

> 引用 [==链接文字==](https://example.com/ignored)

- **列表甲**
- 列表乙

未闭合==保留`;
  const text = "开头甲中间乙 & 丙结尾。 引用 链接文字 列表甲 列表乙 未闭合==保留";
  assert.deepEqual(extractMarkdownContent(source), { text, imageCount: 0, sequence: text });
});

test("Markdown 提取统计直接与引用图片，文字保持未截断", () => {
  const text = "🙂".repeat(100);
  assert.deepEqual(
    extractMarkdownContent(
      `${text}\n\n![忽略 alt](https://example.com/a.jpg)\n\n![同样忽略][photo]\n\n[photo]: https://example.com/b.jpg`,
    ),
    { text, imageCount: 2, sequence: `${text} ${IMAGE_MARK} ${IMAGE_MARK}` },
  );
  assert.deepEqual(extractMarkdownContent("![只有图片](https://example.com/a.jpg)"), {
    text: "",
    imageCount: 1,
    sequence: IMAGE_MARK,
  });
});

test("Markdown 提取按原文顺序标出图片位置", () => {
  assert.deepEqual(
    extractMarkdownContent(
      "这是一条![行内](https://example.com/a.jpg)测试说说\n\n[![带链接](https://example.com/b.jpg)](https://example.com)\n\n结尾",
    ),
    {
      text: "这是一条测试说说 结尾",
      imageCount: 2,
      sequence: `这是一条${IMAGE_MARK}测试说说 ${IMAGE_MARK} 结尾`,
    },
  );
});

test("Markdown 空投影正常返回，代码、公式与 HTML 不产生摘要内容", () => {
  for (const source of [
    "",
    "  \n\t",
    "`==行内代码==`",
    "```js\nconst value = '==代码块==';\n```",
    "$x^2$\n\n$$\ny^2\n$$",
    '<div>忽略文字<img src="photo.jpg"></div>',
  ]) {
    assert.deepEqual(extractMarkdownContent(source), { text: "", imageCount: 0, sequence: "" });
  }
});
