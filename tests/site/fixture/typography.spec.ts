import assert from "node:assert/strict";
import { test, type Page } from "@playwright/test";
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

test("Markdown 实测 token 覆盖文章、关于与说说，亮暗色按约定分层", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${host}/posts/2/`, { waitUntil: "networkidle" });
  assert.equal(
    await page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor),
    "rgb(252, 252, 251)",
  );

  const paragraph = await style(page, "#typography-sample");
  assert.match(paragraph.family, /^anthropic-serif/);
  assert.equal(paragraph.size, "16px");
  assert.equal(paragraph.weight, "400");
  assert.equal(paragraph.lineHeight, "24px");
  assert.equal(paragraph.color, "rgb(11, 11, 11)");
  assert.equal(paragraph.marginTop, "8px");

  for (const [selector, size, height, top] of [
    [".post-body h2", "22px", "27.5px", "0px"],
    [".post-body h3", "18px", "23.4px", "24px"],
    [".post-body h4", "16px", "20.8px", "8px"],
  ]) {
    const heading = await style(page, selector);
    assert.equal(heading.size, size);
    assert.equal(heading.weight, "600");
    assert.equal(heading.lineHeight, height);
    assert.equal(heading.marginTop, top);
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
  assert.equal(inline.color, "rgb(142, 38, 38)");
  assert.equal(inline.background, "rgba(11, 11, 11, 0.05)");
  assert.equal(inline.borderColor, "rgba(11, 11, 11, 0.1)");
  const pre = await style(page, ".post-body pre");
  assert.equal(pre.size, "14px");
  assert.equal(pre.lineHeight, "22.75px");
  assert.equal(pre.color, "rgb(20, 24, 31)");
  assert.equal(pre.radius, "12px");
  assert.equal(pre.background, "rgba(11, 11, 11, 0.05)");
  assert.equal((await style(page, ".post-body pre code")).size, "14px");
  const quote = await style(page, ".post-body blockquote");
  assert.equal(quote.color, "rgb(82, 81, 78)");
  assert.equal(quote.borderWidth, "4px");
  assert.equal(quote.paddingLeft, "16px");
  assert.equal((await style(page, ".post-body ul")).marginTop, "12px");
  assert.equal((await style(page, ".post-body a")).color, "rgb(24, 79, 149)");
  const header = await style(page, ".post-body th");
  assert.equal(header.size, "16px");
  assert.equal(header.weight, "500");
  assert.equal(header.lineHeight, "24px");
  assert.equal(header.background, "rgba(11, 11, 11, 0.05)");
  assert.equal((await style(page, ".post-body td")).weight, "400");
  assert.match((await style(page, "#post-title")).family, /^anthropic-serif/);
  assert.match((await style(page, ".post-meta")).family, /^anthropic-sans/);

  await page.locator("#theme-toggle").click();
  assert.equal((await style(page, "#typography-sample")).color, "rgb(232, 230, 222)");
  assert.equal((await style(page, ".post-body pre")).background, "rgb(45, 44, 41)");

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
