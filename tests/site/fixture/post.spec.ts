import assert from "node:assert/strict";
import { test, type Locator } from "@playwright/test";
import { expectedAuthor, host } from "../helpers.ts";

function relativeLuminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  assert.equal(channels?.length, 3, `无法解析颜色：${color}`);
  return channels
    .map(channel => channel / 255)
    .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

async function contrastRatio(foreground: Locator, background: Locator) {
  const [foregroundColor, backgroundColor] = await Promise.all([
    foreground.evaluate(element => getComputedStyle(element).color),
    background.evaluate(element => getComputedStyle(element).backgroundColor),
  ]);
  const [lighter, darker] = [
    relativeLuminance(foregroundColor),
    relativeLuminance(backgroundColor),
  ].sort((left, right) => right - left);
  return {
    foregroundColor,
    backgroundColor,
    ratio: (lighter + 0.05) / (darker + 0.05),
  };
}

test("无 h2/h3 的技术文章不渲染目录", async ({ page }) => {
  await page.goto(`${host}/posts/alpha/`);
  assert.equal(await page.locator(".post-toc").count(), 0, "无 h2/h3 时不应渲染目录");
});

test("技术文章元信息与结构化数据", async ({ page }) => {
  await page.goto(`${host}/posts/visual/`);
  const structuredDataText = await page.locator('script[type="application/ld+json"]').textContent();
  assert.ok(structuredDataText, "技术文章应输出结构化数据");
  const structuredData = JSON.parse(structuredDataText);
  assert.equal(await page.locator(".post-meta time").textContent(), "2026.01.02");
  assert.equal(
    await page.locator(".post-meta time").getAttribute("datetime"),
    "2026-01-01T16:00:00.000Z",
  );
  assert.equal(structuredData.datePublished, "2026-01-01T16:00:00.000Z");
  assert.equal("dateModified" in structuredData, false);
  assert.deepEqual(structuredData.author, {
    "@type": "Person",
    name: expectedAuthor.name,
  });
});

test("正文渲染：公式、脚注、提示块与代码块附加", async ({ page }) => {
  await page.goto(`${host}/posts/visual/`);
  const katex = page.locator(".post-body .katex").first();
  assert.ok(await katex.count(), "公式应渲染为 KaTeX");
  assert.match(
    await katex.evaluate(element => getComputedStyle(element).fontFamily),
    /KaTeX/i,
    "公式应带上现有 KaTeX 样式表",
  );
  assert.equal(await page.locator("#footnote-label").textContent(), "脚注");
  assert.ok(await page.locator('[aria-label="返回脚注引用"]').count());
  const alert = page.locator(".markdown-alert-note");
  assert.match((await alert.textContent()) ?? "", /备注/);
  assert.match((await alert.textContent()) ?? "", /提示块用于强调阅读提示/);
  assert.match(
    await page
      .locator('.astro-code[data-title="example.js"]')
      .evaluate(element => getComputedStyle(element, "::before").content),
    /example\.js/,
    "代码块文件名应对读者可见",
  );
  assert.ok(await page.locator(".astro-code .line.highlighted").count());
  assert.ok(await page.locator(".astro-code .line.diff.add").count());
  assert.ok(await page.locator(".astro-code .line.diff.remove").count());
});

test("正文列表保留标记", async ({ page }) => {
  await page.goto(`${host}/posts/visual/`);
  assert.equal(
    await page
      .locator(".post-body ul")
      .first()
      .evaluate(element => getComputedStyle(element).listStyleType),
    "disc",
  );
  assert.equal(
    await page
      .locator(".post-body ol")
      .first()
      .evaluate(element => getComputedStyle(element).listStyleType),
    "decimal",
  );
});

test("亮暗主题普通文本颜色满足 WCAG AA 对比度", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${host}/posts/visual/`);
    await page.evaluate(nextTheme => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);

    const body = page.locator("body");
    const codeSpans = page.locator(".astro-code span[style]");
    const pairs: [string, Locator, Locator][] = [
      ["正文链接", page.locator('.post-body a[href="https://example.com"]'), body],
      ["目录当前项", page.locator('.post-toc a[aria-current="true"]'), body],
      [
        "代码字符串",
        codeSpans.filter({ hasText: /^"visual fixture"$/ }),
        page.locator(".astro-code").first(),
      ],
      [
        "代码常量",
        codeSpans.filter({ hasText: /^ 1$/ }).first(),
        page.locator(".astro-code").nth(1),
      ],
      [
        "代码注释",
        codeSpans.filter({ hasText: /^\/\/ 代码注释$/ }),
        page.locator(".astro-code").first(),
      ],
    ];

    for (const [label, foreground, background] of pairs) {
      const contrast = await contrastRatio(foreground, background);
      assert.ok(
        contrast.ratio >= 4.5,
        `${theme} ${label}对比度应至少为 4.5:1，实际为 ${contrast.ratio.toFixed(2)}:1（${contrast.foregroundColor} / ${contrast.backgroundColor}）`,
      );
    }
  }
});

test("目录按正文顺序包含 h2/h3 并跟随滚动", async ({ page }) => {
  await page.goto(`${host}/posts/visual/`);
  const toc = page.locator(".post-toc");
  const tocLinks = toc.locator('a[href^="#"]');
  assert.deepEqual(
    await tocLinks.evaluateAll(links => links.map(link => link.getAttribute("href"))),
    ["#第一节", "#第一节子节", "#第二节"],
    "目录应按正文顺序包含 h2/h3 并排除脚注标题",
  );
  assert.deepEqual(
    await tocLinks.evaluateAll(links =>
      links.map(
        link => document.getElementById(link.getAttribute("href")?.slice(1) ?? "") !== null,
      ),
    ),
    [true, true, true],
    "每个目录链接都应对应真实标题 ID",
  );
  assert.equal(await toc.locator('a[aria-current="true"]').count(), 1, "目录初始应有一个当前项");
  assert.equal(await toc.locator('[aria-current="true"]').getAttribute("href"), "#第一节");

  await page.setViewportSize({ width: 1279, height: 960 });
  assert.equal(await toc.evaluate(element => getComputedStyle(element).display), "none");
  await page.setViewportSize({ width: 1280, height: 960 });
  assert.equal(await toc.evaluate(element => getComputedStyle(element).display), "block");

  const subsection = page.locator(".post-body h3[id]").first();
  const subsectionId = await subsection.getAttribute("id");
  assert.ok(subsectionId);
  await subsection.evaluate(element =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${subsectionId}`,
  );

  const secondHeading = page.locator(".post-body h2[id]").nth(1);
  const secondHeadingId = await secondHeading.getAttribute("id");
  assert.ok(secondHeadingId);
  await secondHeading.evaluate(element =>
    element.scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${secondHeadingId}`,
  );
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator('.post-toc a[aria-current="true"]').getAttribute("href"),
    `#${secondHeadingId}`,
    "滚到页尾后应保持末节为当前项",
  );
});
