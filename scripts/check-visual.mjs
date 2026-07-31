import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const host = "http://127.0.0.1:4321";
const screenshotDir = "artifacts/issue-2";
const postScreenshotDir = "artifacts/issue-3";
const postPath = "/posts/markdown-quick-start/";
const longPostPath = "/posts/dsfedmed-paper-notes/";
const widths = [1440, 768, 375, 320];
const themes = ["light", "dark"];
const smokePaths = [
  "/",
  "/posts/",
  postPath,
  longPostPath,
  "/shuoshuo/",
  "/tags/",
  "/archives/",
  "/search/",
  "/about/",
];
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
  ["node_modules/astro/bin/astro.mjs", "preview", "--host", "127.0.0.1", "--port", "4321"],
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
  throw new Error(`Astro 预览服务器未启动：${lastError?.message ?? "未知错误"}\n${serverOutput}`);
}

function assertNear(actual, expected, tolerance = 1) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `期望 ${actual} 接近 ${expected}（误差 ${tolerance}）`,
  );
}

function contrastRatio(foreground, background) {
  const luminance = color => {
    const channels = color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    assert.equal(channels?.length, 3, `无法解析颜色：${color}`);
    const [red, green, blue] = channels.map(channel => {
      const value = color.startsWith("color(") ? channel : channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
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
            gridColumns: getComputedStyle(grid)
              .gridTemplateColumns.split(" ")
              .map(Number.parseFloat),
            heroWidth: hero.getBoundingClientRect().width,
            heroPaddingLeft: Number.parseFloat(heroStyle.paddingLeft),
            fontFamily: titleStyle.fontFamily,
            fontSize: Number.parseFloat(titleStyle.fontSize),
            fontWeight: titleStyle.fontWeight,
            letterSpacing: Number.parseFloat(titleStyle.letterSpacing),
            lineHeight: Number.parseFloat(titleStyle.lineHeight),
            lineOffsets: lines.map(
              line => line.getBoundingClientRect().left - lines[0].getBoundingClientRect().left,
            ),
            lineRight: Math.max(...lines.map(line => line.getBoundingClientRect().right)),
            lineCount: lines.length,
            background: bodyStyle.backgroundColor,
            text: bodyStyle.color,
            accent: getComputedStyle(document.querySelector(".hero-kicker")).color,
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
          actual.fontResources.some(url => url.includes("/fonts/noto-serif-sc-")),
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
          const codeStyle = getComputedStyle(document.querySelector(".post-body .astro-code"));
          const formulaStyle = getComputedStyle(document.querySelector(".post-body .katex"));
          const alertFixture = document.createElement("div");
          alertFixture.innerHTML = ["note", "tip", "important", "warning", "caution"]
            .map(
              type =>
                `<aside class="markdown-alert markdown-alert-${type}"><p class="markdown-alert-title">${type}</p><p>提示块正文</p></aside>`,
            )
            .join("");
          card.append(alertFixture);
          const alertSamples = [...alertFixture.querySelectorAll(".markdown-alert")].flatMap(
            alert => {
              const background = getComputedStyle(alert).backgroundColor;
              const type = alert.className;
              return [
                [
                  getComputedStyle(alert.querySelector(".markdown-alert-title")).color,
                  background,
                  `${type} 标题`,
                ],
                [
                  getComputedStyle(alert.querySelector("p:last-child")).color,
                  background,
                  `${type} 正文`,
                ],
              ];
            },
          );
          const tokenSamples = [...document.querySelectorAll(".post-body .astro-code span[style]")]
            .filter(token => token.style.color)
            .map(token => [getComputedStyle(token).color, codeStyle.backgroundColor, "代码标记"]);
          const wideContent = [
            ...document.querySelectorAll(
              ".post-body table, .post-body .astro-code, .post-body .katex-display",
            ),
          ];

          const result = {
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
            contrastSamples: [
              [bodyStyle.color, bodyStyle.backgroundColor, "页面正文"],
              [cardStyle.color, cardStyle.backgroundColor, "技术文章正文"],
              [codeStyle.color, codeStyle.backgroundColor, "代码块"],
              ...tokenSamples,
              [formulaStyle.color, cardStyle.backgroundColor, "公式"],
              ...alertSamples,
            ],
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
          alertFixture.remove();
          return result;
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
        assert.match(article.titleFontFamily, /^"Source Serif 4", "Noto Serif SC"/);
        assert.equal(article.titleFontWeight, "500");
        assert.equal(article.wideContentContained, true);
        const insufficientContrast = article.contrastSamples.filter(
          ([foreground, background]) => contrastRatio(foreground, background) < 4.5,
        );
        assert.deepEqual(
          insufficientContrast,
          [],
          `${theme} 存在颜色对比不足：[前景色, 背景色, 元素]`,
        );

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
      await intermediatePage.evaluate(() => document.documentElement.scrollWidth),
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
    let reachedThemeToggle = false;
    for (let tabs = 0; tabs < 12; tabs += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          id: element.id,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight,
        };
      });
      assert.notEqual(focused.outlineStyle, "none", "键盘操作控件应有可见焦点");
      assert.notEqual(focused.outlineWidth, "0px", "键盘操作控件应有可见焦点");
      assert.equal(focused.visible, true, "键盘焦点应位于视口内");
      if (focused.id === "theme-toggle") {
        reachedThemeToggle = true;
        break;
      }
    }
    assert.equal(reachedThemeToggle, true, "应能仅用 Tab 到达主题按钮");
    await page.keyboard.press("Enter");
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
      "手动主题选择应在刷新后保留",
    );
    await context.close();

    for (const width of [1440, 320]) {
      const smokeContext = await browser.newContext({
        viewport: { width, height: 960 },
        colorScheme: "light",
      });
      try {
        for (const path of smokePaths) {
          const smokePage = await smokeContext.newPage();
          const pageErrors = [];
          const fontRequests = [];
          const failedRequests = [];
          const consoleErrors = [];
          smokePage.on("pageerror", error => pageErrors.push(error.message));
          smokePage.on("requestfailed", request =>
            failedRequests.push([request.url(), request.failure()?.errorText]),
          );
          smokePage.on("console", message => {
            if (message.type() === "error") consoleErrors.push(message.text());
          });
          smokePage.on("request", request => {
            if (request.resourceType() === "font") fontRequests.push(request.url());
          });
          await smokePage.goto(`${host}${path}`, { waitUntil: "networkidle" });
          await smokePage.evaluate(() => document.fonts.ready);

          const smoke = await smokePage.evaluate(() => {
            const headingLevels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
              .filter(heading => !heading.classList.contains("sr-only"))
              .map(heading => Number(heading.tagName.slice(1)));
            const unnamedActions = [
              ...document.querySelectorAll("a[href], button, input, select, textarea, summary"),
            ]
              .filter(element => !element.closest("[aria-hidden='true']"))
              .filter(element => !(element instanceof HTMLInputElement && element.disabled))
              .filter(
                element =>
                  ![
                    element.getAttribute("aria-label") ?? "",
                    element.getAttribute("title") ?? "",
                    element.textContent ?? "",
                    element.querySelector("img[alt]")?.getAttribute("alt") ?? "",
                    element instanceof HTMLInputElement ? element.placeholder : "",
                  ].some(value => value.trim()),
              )
              .map(element => element.outerHTML.slice(0, 160));
            return {
              h1Count: document.querySelectorAll("h1").length,
              headingLevels,
              emptyHeadings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(
                heading => !heading.textContent?.trim(),
              ).length,
              unnamedActions,
              scrollWidth: document.documentElement.scrollWidth,
              forbiddenUi: document.querySelectorAll(
                "[class*='comment'], [class*='share'], [class*='analytics'], a[href*='/photos'], a[href*='/source'], a[hreflang]",
              ).length,
            };
          });

          assert.equal(smoke.h1Count, 1, `${path} 应有且仅有一个主标题`);
          assert.equal(smoke.headingLevels[0], 1, `${path} 应从主标题开始`);
          assert.equal(
            smoke.headingLevels.every(
              (level, index, levels) => index === 0 || level <= levels[index - 1] + 1,
            ),
            true,
            `${path} 标题层级不得跳级：${smoke.headingLevels.join(" → ")}`,
          );
          assert.equal(smoke.emptyHeadings, 0, `${path} 标题必须具有名称`);
          assert.deepEqual(smoke.unnamedActions, [], `${path} 存在无名称操作控件`);
          assert.equal(smoke.scrollWidth, width, `${width}px ${path} 不得横向溢出`);
          if (path === longPostPath) {
            assert.equal(
              await smokePage
                .locator(".post-header h1")
                .evaluate(title => title.getBoundingClientRect().right <= innerWidth),
              true,
              `${width}px 长文章标题不得溢出`,
            );
          }
          assert.equal(smoke.forbiddenUi, 0, `${path} 不得出现规格外模块`);
          assert.ok(
            fontRequests.every(url => new URL(url).origin === host),
            `${path} 字体必须由站点自托管`,
          );

          await smokePage.keyboard.press("Tab");
          const skipLink = smokePage.locator(".skip-link");
          assert.equal(
            await skipLink.evaluate(element => element === document.activeElement),
            true,
            `${path} 首个键盘焦点应为跳转导航`,
          );
          const skipFocus = await skipLink.evaluate(element => {
            const style = getComputedStyle(element);
            return {
              outlineStyle: style.outlineStyle,
              outlineWidth: style.outlineWidth,
              top: element.getBoundingClientRect().top,
            };
          });
          assert.notEqual(skipFocus.outlineStyle, "none");
          assert.notEqual(skipFocus.outlineWidth, "0px");
          assert.ok(skipFocus.top >= 0, `${path} 跳转导航聚焦时应可见`);
          await smokePage.keyboard.press("Enter");
          await smokePage.waitForURL(/#main-content$/);

          if (path === "/search/") {
            const searchInput = smokePage.locator("pagefind-searchbox input");
            let reachedSearchInput = false;
            for (let tabs = 0; tabs < 20; tabs += 1) {
              await smokePage.keyboard.press("Tab");
              reachedSearchInput = await searchInput.evaluate(
                element => element === element.getRootNode().activeElement,
              );
              if (reachedSearchInput) break;
            }
            assert.equal(reachedSearchInput, true, "应能仅用 Tab 到达搜索输入框");
            const searchFocus = await searchInput.evaluate(element => {
              const style = getComputedStyle(element);
              return [style.outlineStyle, style.outlineWidth, style.boxShadow];
            });
            assert.equal(
              (searchFocus[0] !== "none" && searchFocus[1] !== "0px") || searchFocus[2] !== "none",
              true,
              "搜索框应有可见焦点",
            );
            await smokePage.keyboard.type("Markdown快速上手语法");
            const result = smokePage.getByRole("option", { name: /Markdown快速上手语法/ }).first();
            try {
              await result.waitFor({ state: "visible", timeout: 5_000 });
            } catch (error) {
              throw new Error(
                `搜索组件未返回结果：${JSON.stringify({
                  markup: await smokePage
                    .locator("pagefind-searchbox")
                    .evaluate(element => element.outerHTML),
                  pageErrors,
                  consoleErrors,
                  failedRequests,
                })}`,
                { cause: error },
              );
            }
            assert.equal(new URL(await result.getAttribute("href"), host).pathname, postPath);
            await smokePage.keyboard.press("Enter");
            await smokePage.waitForURL(`${host}${postPath}`);
          }

          assert.deepEqual(pageErrors, [], `${path} 不得产生页面脚本错误`);
          assert.deepEqual(consoleErrors, [], `${path} 不得产生控制台错误`);
          assert.deepEqual(
            failedRequests.filter(([url]) => new URL(url).origin === host),
            [],
            `${path} 不得有站内资源加载失败`,
          );

          await smokePage.close();
        }
      } finally {
        await smokeContext.close();
      }
    }

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
      assert.deepEqual(
        await list.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href"))),
        ["/posts/", "/tags/", "/archives/"],
      );

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
