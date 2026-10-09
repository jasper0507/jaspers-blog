import assert from "node:assert/strict";
import { expect, test, type Page } from "@playwright/test";
import { origin } from "../acceptance-site.ts";

const host = origin();

async function style(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate(element => {
      const css = getComputedStyle(element);
      return {
        family: css.fontFamily,
        size: css.fontSize,
        weight: css.fontWeight,
        lineHeight: css.lineHeight,
        color: css.color,
        background: css.backgroundColor,
        marginTop: css.marginTop,
        borderWidth: css.borderLeftWidth,
        borderColor: css.borderLeftColor,
        paddingLeft: css.paddingLeft,
        radius: css.borderRadius,
        opacity: css.opacity,
        borderBottomColor: css.borderBottomColor,
        overflowX: css.overflowX,
      };
    });
}

test("无本机字体时实际使用本站 Anthropic 与 Noto 字形", async ({ page }) => {
  const fontResponses: { path: string; status: number; origin: string }[] = [];
  page.on("response", response => {
    if (response.request().resourceType() === "font") {
      const url = new URL(response.url());
      fontResponses.push({ path: url.pathname, status: response.status(), origin: url.origin });
    }
  });

  // 即使开发机器装过这些字体，也禁用本机字体，验收本站实际交付的字形。
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  await session.send("CSS.setLocalFontsEnabled", { enabled: false });

  async function renderedFonts(selector: string) {
    await page.evaluate(() => document.fonts.ready);
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    assert.ok(nodeId, selector);
    const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts.filter(font => font.glyphCount > 0);
  }

  await page.goto(host, { waitUntil: "networkidle" });
  const uiFonts = await renderedFonts(".brand");
  assert.ok(
    uiFonts.some(font => font.isCustomFont && /Anthropic Sans/.test(font.familyName)),
    JSON.stringify(uiFonts),
  );

  await page.goto(`${host}/posts/2/`, { waitUntil: "networkidle" });
  const proseFonts = await renderedFonts("#typography-sample");
  for (const name of ["Anthropic Serif", "Noto Sans SC"]) {
    assert.ok(
      proseFonts.some(font => font.isCustomFont && font.familyName.includes(name)),
      JSON.stringify(proseFonts),
    );
  }
  const codeFonts = await renderedFonts(".astro-code .line");
  assert.ok(
    codeFonts.some(font => font.isCustomFont && /Anthropic Mono/.test(font.familyName)),
    JSON.stringify(codeFonts),
  );

  for (const name of [
    "AnthropicSansWebText.ttf",
    "AnthropicSerifWebText.ttf",
    "AnthropicMonoVariable.ttf",
  ]) {
    assert.ok(
      fontResponses.some(font => font.path === `/fonts/${name}` && font.status === 200),
      name,
    );
  }
  assert.ok(fontResponses.some(font => /\/fonts\/noto-sans-sc-.*\.woff2$/.test(font.path)));
  assert.deepEqual(
    // 跨页复用时，304 表示本站字体缓存仍有效。
    fontResponses.filter(font => font.origin !== host || ![200, 304].includes(font.status)),
    [],
  );
});

test("纸面配色与旧表格样式恢复，保留当前字体和正文尺度", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${host}/posts/2/`, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor),
    "rgb(245, 242, 234)",
  );
  assert.equal(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
    "rgb(245, 242, 234)",
  );

  const paragraph = await style(page, "#typography-sample");
  assert.match(paragraph.family, /^anthropic-serif/);
  assert.equal(paragraph.size, "16px");
  assert.equal(paragraph.weight, "400");
  assert.equal(paragraph.lineHeight, "24px");
  assert.equal(paragraph.color, "rgb(43, 38, 33)");
  assert.equal(paragraph.marginTop, "14.04px");

  for (const [selector, size, height, top] of [
    [".post-body h2", "22px", "27.5px", "0px"],
    [".post-body h3", "18px", "23.4px", "36.108px"],
    [".post-body h4", "16px", "20.8px", "27.216px"],
  ]) {
    const heading = await style(page, selector);
    assert.equal(heading.size, size);
    assert.equal(heading.weight, "600");
    assert.equal(heading.lineHeight, height);
    assert.equal(heading.marginTop, top);
    assert.equal(heading.color, "rgb(28, 24, 21)");
  }
  assert.equal((await style(page, ".post-body strong")).weight, "600");
  assert.equal(
    await page
      .locator(".post-body em")
      .first()
      .evaluate(element => getComputedStyle(element).fontStyle),
    "italic",
  );
  const inline = await style(page, ".post-body p code");
  assert.match(inline.family, /^anthropic-mono/);
  assert.equal(inline.size, "14.4px");
  assert.equal(inline.lineHeight, "14.4px");
  assert.equal(inline.weight, "400");
  assert.equal(inline.color, "rgb(163, 74, 58)");
  assert.equal(inline.background, "rgb(242, 238, 234)");
  assert.equal(inline.borderColor, "rgb(215, 206, 197)");
  const pre = await style(page, ".post-body pre");
  assert.equal(pre.size, "14px");
  assert.equal(pre.lineHeight, "22.75px");
  assert.equal(pre.color, "rgb(28, 24, 21)");
  assert.equal(pre.radius, "12px");
  assert.equal(pre.background, "rgb(247, 245, 239)");
  assert.equal((await style(page, ".post-body pre code")).size, "14px");
  const quote = await style(page, ".post-body blockquote");
  assert.equal(quote.color, "rgb(98, 89, 80)");
  assert.equal(quote.borderWidth, "4px");
  assert.equal(quote.paddingLeft, "17.6px");
  assert.equal((await style(page, ".post-body ul")).marginTop, "14.04px");
  assert.equal((await style(page, ".post-body a")).color, "rgb(161, 77, 46)");
  const header = await style(page, ".post-body th");
  assert.equal(header.size, "14.88px");
  assert.equal(header.weight, "600");
  assert.equal(header.lineHeight, "22.0224px");
  assert.equal(header.background, "rgba(0, 0, 0, 0)");
  const cell = await style(page, ".post-body td");
  assert.equal(cell.size, "14.88px");
  assert.equal(cell.weight, "400");
  assert.equal(cell.lineHeight, "23.2128px");
  assert.equal(cell.color, "rgb(43, 38, 33)");
  assert.equal(header.color, "rgb(28, 24, 21)");
  assert.equal((await style(page, ".post-body table")).borderBottomColor, "rgb(228, 220, 208)");
  assert.equal((await style(page, ".post-body thead tr")).borderBottomColor, "rgb(111, 103, 92)");
  await page.locator(".post-body").evaluate(body => {
    const separator = document.createElement("hr");
    separator.id = "separator-rollback-sample";
    body.append(separator);
  });
  const separator = await style(page, "#separator-rollback-sample");
  assert.equal(separator.background, "rgb(221, 213, 202)");
  assert.equal(separator.opacity, "0.75");
  assert.equal(pre.borderColor, "rgb(228, 221, 210)");
  assert.equal(quote.borderColor, "rgb(193, 95, 60)");
  const link = page.locator(".post-body a").first();
  await link.hover();
  await expect(link).toHaveCSS("color", "rgb(143, 63, 45)");
  await page.mouse.move(0, 0);
  assert.match((await style(page, "#post-title")).family, /^anthropic-serif/);
  assert.match((await style(page, ".post-meta")).family, /^anthropic-sans/);

  await page.locator("#theme-toggle").click();
  assert.equal(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
    "rgb(39, 36, 33)",
  );
  assert.equal((await style(page, "#typography-sample")).color, "rgb(232, 230, 222)");
  assert.equal((await style(page, ".post-body pre")).background, "rgb(45, 44, 41)");
  assert.equal((await style(page, ".post-body blockquote")).borderColor, "rgb(217, 119, 87)");
  assert.equal((await style(page, ".post-body th")).background, "rgba(0, 0, 0, 0)");
  assert.equal((await style(page, ".post-body th")).weight, "600");
  assert.equal((await style(page, "#separator-rollback-sample")).opacity, "0.75");

  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ["/about/", "/shuoshuo/20250101-000001/"]) {
      await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
      const prose = await style(page, ".post-body p");
      assert.match(prose.family, /^anthropic-serif/);
      assert.equal(prose.size, "16px");
      assert.equal(prose.lineHeight, "24px");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  }
});

test("主标题保留旧字号字重，文章、说说与关于页共用旧表格排版", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const path of ["/posts/2/", "/shuoshuo/20250101-000001/", "/about/"]) {
        await page.goto(`${host}${path}`);
        if (path === "/posts/2/") {
          const title = await style(page, "#post-title");
          assert.equal(title.size, width === 1440 ? "40px" : "28.8px");
          assert.equal(title.weight, "600");
          assert.equal(title.lineHeight, width === 1440 ? "48.8px" : "36px");
        }

        // 放入相同样本验证各页面作用域，16 列的最小宽度足以触发宽表滚动。
        await page
          .locator(".post-body")
          .first()
          .evaluate(body => {
            const table = document.createElement("table");
            table.id = "table-rollback-sample";
            const header = Array.from(
              { length: 16 },
              (_, index) => `<th>column ${index}</th>`,
            ).join("");
            const row = `<tr>${"<td>cell</td>".repeat(16)}</tr>`;
            table.innerHTML = `<thead><tr>${header}</tr></thead><tbody>${row}${row}</tbody>`;
            body.append(table);
          });
        const header = await style(page, "#table-rollback-sample th");
        const cell = await style(page, "#table-rollback-sample td");
        assert.match(header.family, /^anthropic-serif/);
        assert.equal(header.size, "14.88px");
        assert.equal(header.weight, "600");
        assert.equal(header.lineHeight, "22.0224px");
        assert.equal(header.background, "rgba(0, 0, 0, 0)");
        assert.equal(cell.lineHeight, "23.2128px");
        assert.equal(
          header.color,
          colorScheme === "light" ? "rgb(28, 24, 21)" : "rgb(245, 243, 236)",
        );
        assert.equal(
          cell.color,
          colorScheme === "light" ? "rgb(43, 38, 33)" : "rgb(232, 230, 222)",
        );
        assert.equal(
          (await style(page, "#table-rollback-sample tbody tr")).borderBottomColor,
          colorScheme === "light" ? "rgb(201, 191, 178)" : "rgb(74, 70, 63)",
        );
        assert.equal((await style(page, "#table-rollback-sample")).overflowX, "auto");
        assert.ok(
          await page
            .locator("#table-rollback-sample")
            .evaluate(table => table.scrollWidth > table.clientWidth),
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
  }
});
