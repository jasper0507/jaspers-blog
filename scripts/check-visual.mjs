import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const host = "http://127.0.0.1:4321";
const screenshotDir = "artifacts/issue-2";
const postScreenshotDir = "artifacts/issue-3";
const postPath = "/posts/markdown-quick-start/";
const widths = [1440, 768, 375, 320];
const themes = ["light", "dark"];
const expectedColors = {
  light: {
    background: "rgb(245, 244, 242)",
  },
  dark: {
    background: "rgb(38, 38, 36)",
    text: "rgb(232, 230, 222)",
    accent: "rgb(217, 119, 87)",
  },
};

const server = spawn(
  process.execPath,
  [
    "node_modules/astro/bin/astro.mjs",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4321",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let serverOutput = "";
server.stdout.on("data", chunk => (serverOutput += chunk));
server.stderr.on("data", chunk => (serverOutput += chunk));

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(host);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(
    `Astro 预览服务器未启动：${lastError?.message ?? "未知错误"}\n${serverOutput}`,
  );
}

function assertNear(actual, expected, tolerance = 1) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `期望 ${actual} 接近 ${expected}（误差 ${tolerance}）`,
  );
}

try {
  await waitForServer();
  await mkdir(screenshotDir, { recursive: true });
  await mkdir(postScreenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    for (const width of widths) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: { width, height: 960 },
          colorScheme: theme,
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", error => pageErrors.push(error.message));

        await page.goto(host, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);

        const actual = await page.evaluate(() => {
          const main = document.querySelector("main");
          const grid = document.querySelector(".home-grid");
          const hero = document.querySelector(".hero");
          const title = document.querySelector(".hero h1");
          const lines = [...document.querySelectorAll(".hero h1 span")];
          const bodyStyle = getComputedStyle(document.body);
          const heroStyle = getComputedStyle(hero);
          const titleStyle = getComputedStyle(title);

          return {
            scrollWidth: document.documentElement.scrollWidth,
            mainWidth: main.getBoundingClientRect().width,
            gridColumns: getComputedStyle(grid).gridTemplateColumns
              .split(" ")
              .map(Number.parseFloat),
            heroWidth: hero.getBoundingClientRect().width,
            heroPaddingLeft: Number.parseFloat(heroStyle.paddingLeft),
            fontFamily: titleStyle.fontFamily,
            fontSize: Number.parseFloat(titleStyle.fontSize),
            fontWeight: titleStyle.fontWeight,
            letterSpacing: Number.parseFloat(titleStyle.letterSpacing),
            lineHeight: Number.parseFloat(titleStyle.lineHeight),
            lineOffsets: lines.map(
              line =>
                line.getBoundingClientRect().left -
                lines[0].getBoundingClientRect().left,
            ),
            lineRight: Math.max(
              ...lines.map(line => line.getBoundingClientRect().right),
            ),
            lineCount: lines.length,
            background: bodyStyle.backgroundColor,
            text: bodyStyle.color,
            accent: getComputedStyle(
              document.querySelector(".hero-kicker"),
            ).color,
            notoReady: document.fonts.check(
              '400 66px "Noto Serif SC"',
              "见了便做，做了便放下，了了有何不了。",
            ),
            fontResources: performance
              .getEntriesByType("resource")
              .map(entry => entry.name)
              .filter(url => url.endsWith(".woff2")),
          };
        });

        assert.equal(actual.scrollWidth, width, `${width}px 不得横向溢出`);
        assert.equal(actual.background, expectedColors[theme].background);
        if (theme === "dark") {
          assert.equal(actual.text, expectedColors.dark.text);
          assert.equal(actual.accent, expectedColors.dark.accent);
        }
        assert.match(actual.fontFamily, /^"Source Serif 4", "Noto Serif SC"/);
        assert.equal(actual.fontWeight, "400");
        assert.equal(actual.notoReady, true);
        assert.equal(actual.lineCount, 3, "禅语必须保持三行");
        assertNear(actual.letterSpacing, actual.fontSize * -0.04, 0.1);
        assertNear(actual.lineHeight, actual.fontSize * 1.12, 0.1);
        assertNear(actual.lineOffsets[1] / actual.fontSize, 0.65, 0.03);
        assertNear(actual.lineOffsets[2] / actual.fontSize, 1.3, 0.03);
        assert.ok(actual.lineRight <= width, `${width}px 禅语不得溢出视口`);
        assert.ok(
          actual.fontResources.some(url =>
            url.includes("/fonts/noto-serif-sc-"),
          ),
          "禅语应加载自托管 Noto Serif SC 分段字体",
        );

        if (width === 1440) {
          assertNear(actual.mainWidth, 1120);
          assert.equal(actual.gridColumns.length, 2);
          assertNear(actual.gridColumns[0], 658);
          assertNear(actual.heroWidth, 658);
          assertNear(actual.heroPaddingLeft / actual.heroWidth, 0.11, 0.005);
          assertNear(actual.fontSize, 66);
        } else {
          assertNear(actual.mainWidth, width);
          assert.equal(actual.gridColumns.length, 1);
          assertNear(actual.heroPaddingLeft, 0);
          if (width === 375) assertNear(actual.fontSize, 42);
          if (width === 320) assertNear(actual.fontSize, 35);
        }

        await page.screenshot({
          path: `${screenshotDir}/home-${width}-${theme}.png`,
          fullPage: true,
        });

        await page.goto(`${host}${postPath}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);

        const article = await page.evaluate(() => {
          const main = document.querySelector("main");
          const card = document.querySelector(".post-body");
          const title = document.querySelector(".post-header h1");
          const toc = document.querySelector(".post-toc");
          const cardStyle = getComputedStyle(card);
          const titleStyle = getComputedStyle(title);
          const tocStyle = getComputedStyle(toc);
          const bodyStyle = getComputedStyle(document.body);
          const wideContent = [
            ...document.querySelectorAll(
              ".post-body table, .post-body .astro-code, .post-body .katex-display",
            ),
          ];

          return {
            scrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            mainWidth: main.getBoundingClientRect().width,
            mainScrollWidth: main.scrollWidth,
            cardWidth: card.getBoundingClientRect().width,
            cardScrollWidth: card.scrollWidth,
            contentWidth:
              card.clientWidth -
              Number.parseFloat(cardStyle.paddingLeft) -
              Number.parseFloat(cardStyle.paddingRight),
            cardPaddingLeft: Number.parseFloat(cardStyle.paddingLeft),
            cardBackground: cardStyle.backgroundColor,
            titleFontFamily: titleStyle.fontFamily,
            titleFontSize: Number.parseFloat(titleStyle.fontSize),
            titleFontWeight: titleStyle.fontWeight,
            tocDisplay: tocStyle.display,
            tocWidth: toc.getBoundingClientRect().width,
            background: bodyStyle.backgroundColor,
            wideContentContained: wideContent.every(
              element => element.getBoundingClientRect().width <= card.clientWidth,
            ),
            overflowing: [...document.body.querySelectorAll("*")]
              .filter(element => {
                const rect = element.getBoundingClientRect();
                return rect.right > innerWidth + 0.5 || rect.left < -0.5;
              })
              .slice(0, 8)
              .map(element => ({
                element: `${element.tagName.toLowerCase()}.${element.className}`,
                parent: `${element.parentElement?.tagName.toLowerCase()}.${element.parentElement?.className}`,
                left: element.getBoundingClientRect().left,
                right: element.getBoundingClientRect().right,
                scrollWidth: element.scrollWidth,
                closestPre: element.closest("pre")
                  ? {
                      left: element.closest("pre").getBoundingClientRect().left,
                      right: element.closest("pre").getBoundingClientRect().right,
                      clientWidth: element.closest("pre").clientWidth,
                      scrollWidth: element.closest("pre").scrollWidth,
                      overflowX: getComputedStyle(element.closest("pre")).overflowX,
                    }
                  : null,
              })),
          };
        });

        assert.equal(
          article.scrollWidth,
          width,
          `${width}px 文章页不得横向溢出：${JSON.stringify(article)}`,
        );
        assert.equal(article.background, expectedColors[theme].background);
        assert.equal(
          article.cardBackground,
          theme === "light" ? "rgb(250, 249, 245)" : "rgb(47, 46, 42)",
        );
        assert.match(
          article.titleFontFamily,
          /^"Source Serif 4", "Noto Serif SC"/,
        );
        assert.equal(article.titleFontWeight, "500");
        assert.equal(article.wideContentContained, true);

        if (width === 1440) {
          assertNear(article.mainWidth, 1120);
          assertNear(article.cardWidth, 768);
          assertNear(article.contentWidth, 704);
          assertNear(article.cardPaddingLeft, 32);
          assertNear(article.titleFontSize, 36);
          assert.equal(article.tocDisplay, "block");
          assertNear(article.tocWidth, 176);
        } else {
          assertNear(article.cardWidth, width - 32);
          assertNear(article.cardPaddingLeft, 20);
          assertNear(article.titleFontSize, 30);
          assert.equal(article.tocDisplay, "none");
        }

        await page.screenshot({
          path: `${postScreenshotDir}/post-${width}-${theme}.png`,
          fullPage: true,
        });
        assert.deepEqual(pageErrors, []);
        await context.close();
      }
    }

    const intermediateContext = await browser.newContext({
      viewport: { width: 1024, height: 960 },
      colorScheme: "light",
    });
    const intermediatePage = await intermediateContext.newPage();
    await intermediatePage.goto(`${host}${postPath}`);
    assert.equal(
      await intermediatePage.evaluate(
        () => document.documentElement.scrollWidth,
      ),
      1024,
      "1024px 文章页不得横向溢出",
    );
    await intermediateContext.close();

    const context = await browser.newContext({
      viewport: { width: 375, height: 960 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto(host);
    await page.locator("#theme-toggle").click();
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
      "手动主题选择应在刷新后保留",
    );
    await context.close();

    for (const width of [1440, 320]) {
      const navigationContext = await browser.newContext({
        viewport: { width, height: 960 },
        hasTouch: width === 320,
      });
      const navigationPage = await navigationContext.newPage();
      await navigationPage.goto(host);

      const menu = navigationPage.locator("#article-menu");
      const trigger = navigationPage.locator("#article-menu-trigger");
      const list = navigationPage.locator("#article-menu-list");
      assert.deepEqual(await list.locator("a").evaluateAll(links =>
        links.map(link => link.getAttribute("href")),
      ), ["/posts/", "/tags/", "/archives/"]);

      if (width === 1440) {
        await menu.hover();
        await list.waitFor({ state: "visible", timeout: 1_000 });
        await navigationPage.mouse.move(width - 1, 1);
      }

      await trigger.focus();
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await list.waitFor({ state: "visible", timeout: 1_000 });
      await navigationPage.keyboard.press("Escape");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
      await list.waitFor({ state: "hidden", timeout: 1_000 });

      await trigger.click();
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await list.waitFor({ state: "visible", timeout: 1_000 });
      await trigger.click();
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      await list.waitFor({ state: "hidden", timeout: 1_000 });

      await trigger.click();
      await navigationPage.locator(".brand").click();
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      await list.waitFor({ state: "hidden", timeout: 1_000 });

      for (const path of [
        "/posts/",
        "/posts/2/",
        "/tags/",
        "/tags/data-structures-and-algorithms/",
        "/archives/",
      ]) {
        await navigationPage.goto(`${host}${path}`);
        const overflow = await navigationPage.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          elements: [...document.body.querySelectorAll("*")]
            .filter(element => {
              const rect = element.getBoundingClientRect();
              return rect.right > innerWidth + 0.5 || rect.left < -0.5;
            })
            .slice(0, 8)
            .map(element => ({
              element: `${element.tagName.toLowerCase()}.${element.className}`,
              left: element.getBoundingClientRect().left,
              right: element.getBoundingClientRect().right,
              scrollWidth: element.scrollWidth,
            })),
        }));
        assert.equal(
          overflow.scrollWidth,
          width,
          `${width}px ${path} 不得横向溢出：${JSON.stringify(overflow.elements)}`,
        );
      }

      await navigationContext.close();
    }
  } finally {
    await browser.close();
  }

  console.log("视觉尺寸与截图验收通过");
} finally {
  server.kill("SIGTERM");
}
