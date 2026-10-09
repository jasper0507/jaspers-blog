import assert from "node:assert/strict";
import { test } from "@playwright/test";
import { origin } from "../acceptance-site.ts";
import { spacingSamples } from "./spacing-baseline.ts";

for (const width of [1440, 390]) {
  test(`正文 margin / padding 恢复旧版浏览器实测像素（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const sample of spacingSamples) {
      await page.goto(`${origin()}${sample.route}`);
      await page.evaluate(html => {
        const shell = document.querySelector(".post-body")!;
        const body = shell.cloneNode(false) as HTMLElement;
        body.id = "spacing-sample";
        body.innerHTML = html;
        shell.after(body);
      }, sample.html);

      const rows = await page.locator("#spacing-sample").evaluate(body =>
        [...body.querySelectorAll("*")].map(element => {
          const css = getComputedStyle(element);
          return [
            element.tagName,
            ...[
              css.marginTop,
              css.marginRight,
              css.marginBottom,
              css.marginLeft,
              css.paddingTop,
              css.paddingRight,
              css.paddingBottom,
              css.paddingLeft,
            ].map(parseFloat),
          ];
        }),
      );
      assert.equal(rows.length, sample.rows.length, sample.route);
      for (const [index, expected] of sample.rows.entries()) {
        const actual = rows[index];
        assert.equal(actual[0], expected[0], `${sample.route} element ${index}`);
        for (let side = 1; side < expected.length; side++) {
          assert.ok(
            Math.abs(Number(actual[side]) - Number(expected[side])) < 0.0001,
            `${sample.route} ${expected[0]}[${index}] spacing[${side}]: ${actual[side]} != ${expected[side]}`,
          );
        }
      }

      for (const [html, top, bottom] of sample.edges) {
        const actual = await page.locator("#spacing-sample").evaluate((body, html) => {
          body.innerHTML = html;
          const css = getComputedStyle(body.firstElementChild!);
          return [parseFloat(css.marginTop), parseFloat(css.marginBottom)];
        }, html);
        assert.deepEqual(actual, [top, bottom], `${sample.route} first/last ${html}`);
        if (html.includes("katex-display")) {
          assert.deepEqual(
            await page.locator("#spacing-sample > .katex-display").evaluate(element => {
              const css = getComputedStyle(element);
              return [parseFloat(css.paddingTop), parseFloat(css.paddingBottom)];
            }),
            [8, 8],
          );
        }
      }

      // 文件名伪元素与公式只恢复外层留白，内部排版不参与回退。
      if (sample.edges.length) {
        const filename = await page.locator("#spacing-sample").evaluate(body => {
          body.innerHTML = '<pre class="astro-code" data-title="sample.ts"><code>x</code></pre>';
          const css = getComputedStyle(body.firstElementChild!, "::before");
          return [
            css.marginTop,
            css.marginRight,
            css.marginBottom,
            css.marginLeft,
            css.paddingTop,
            css.paddingRight,
            css.paddingBottom,
            css.paddingLeft,
          ].map(parseFloat);
        });
        assert.deepEqual(filename, [-16, -17.6, 12.8, -17.6, 8, 17.6, 8, 17.6]);
      }
    }
  });
}
