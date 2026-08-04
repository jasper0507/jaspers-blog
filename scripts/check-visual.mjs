import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const host = "http://127.0.0.1:4321";
const screenshotDir = "artifacts/visual/home";
const postScreenshotDir = "artifacts/visual/post";
const postPath = "/posts/markdown-quick-start/";
const longPostPath = "/posts/dsfedmed-paper-notes/";
const widths = [1440, 768, 375, 320];
const themes = ["light", "dark"];
const smokePaths = ["/", postPath, longPostPath, "/shuoshuo/", "/tags/", "/archives/", "/about/"];
const expectedColors = {
  light: {
    background: "rgb(245, 244, 242)",
    // Kraft 正文层（分层 A）：仅 .post-body，外壳仍用壳背景
    bodyText: "rgb(43, 38, 33)", // #2b2621
    bodyHeading: "rgb(28, 24, 21)", // #1c1815
    bodyAccent: "rgb(193, 95, 60)", // #c15f3c
    bodyInlineCode: "rgb(163, 74, 58)", // #a34a3a
    bodyInlineBg: "rgb(242, 238, 234)", // #f2eeea
    bodyCodeBg: "rgb(252, 252, 250)", // #fcfcfa
    bodyQuote: "rgb(98, 89, 80)", // #625950
    bodyQuoteBorder: "rgb(220, 210, 196)", // #dcd2c4
  },
  dark: {
    background: "rgb(38, 38, 36)",
    text: "rgb(232, 230, 222)",
    accent: "rgb(217, 119, 87)",
    bodyText: "rgb(232, 230, 222)", // #e8e6de
    bodyHeading: "rgb(245, 243, 236)", // #f5f3ec
    bodyAccent: "rgb(217, 119, 87)", // #d97757
    bodyInlineCode: "rgb(227, 154, 130)", // #e39a82
    bodyInlineBg: "rgb(54, 52, 48)", // #363430
    bodyCodeBg: "rgb(45, 44, 41)", // #2d2c29
    bodyQuote: "rgb(181, 172, 159)", // #b5ac9f
    bodyQuoteBorder: "rgb(69, 65, 58)", // #45413a
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

/** 从 getComputedStyle(...).transform 读取均匀缩放系数（默认 1）。 */
function parseCssScale(transform) {
  if (!transform || transform === "none") return 1;
  const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const value = Number.parseFloat(matrix3d[1].split(",")[0]);
    return Number.isFinite(value) ? value : 1;
  }
  const matrix = transform.match(/^matrix\((.+)\)$/);
  if (matrix) {
    const value = Number.parseFloat(matrix[1].split(",")[0]);
    return Number.isFinite(value) ? value : 1;
  }
  return 1;
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
          const media = document.querySelector(".hero-media");
          const feed = document.querySelector(".home-feed");
          const lightImage = document.querySelector(".hero-image-light");
          const darkImage = document.querySelector(".hero-image-dark");
          const themeToggle = document.querySelector("#theme-toggle");
          const bodyStyle = getComputedStyle(document.body);
          const lightStyle = getComputedStyle(lightImage);
          const darkStyle = getComputedStyle(darkImage);
          const toggleStyle = getComputedStyle(themeToggle);
          const visibleImage =
            lightStyle.display !== "none" && lightStyle.visibility !== "hidden"
              ? lightImage
              : darkImage;
          const visibleStyle = getComputedStyle(visibleImage);
          const sectionRules = [...document.querySelectorAll(".feed-section")].map(section => {
            const style = getComputedStyle(section);
            const rect = section.getBoundingClientRect();
            return {
              borderTopWidth: Number.parseFloat(style.borderTopWidth),
              borderTopStyle: style.borderTopStyle,
              sectionWidth: rect.width,
            };
          });
          const headerInner = document.querySelector(".header-inner");
          const footerInner = document.querySelector(".footer-inner");
          const headerStyle = getComputedStyle(headerInner);
          const footerStyle = getComputedStyle(footerInner);
          const headerRect = headerInner.getBoundingClientRect();
          const footerRect = footerInner.getBoundingClientRect();
          const postPreview = document.querySelector(".post-preview:not(.shuoshuo-preview)");
          const shuoshuoPreview = document.querySelector(".shuoshuo-preview");
          const shuoshuoPreviewStyle = shuoshuoPreview ? getComputedStyle(shuoshuoPreview) : null;
          const description = document.querySelector(".post-preview-description");
          const descriptionStyle = description ? getComputedStyle(description) : null;
          const viewAllLink = document.querySelector(".section-heading a");
          const viewAllStyle = viewAllLink ? getComputedStyle(viewAllLink) : null;
          const caption = document.querySelector(".hero-caption");
          const brand = document.querySelector(".brand");
          const viewAll = [...document.querySelectorAll(".section-heading a")].map(link => ({
            href: link.getAttribute("href"),
            text: link.textContent.trim(),
          }));
          const homeDate = postPreview?.querySelector("time")?.textContent?.trim() ?? "";
          const mediaRect = media.getBoundingClientRect();
          const feedRect = feed.getBoundingClientRect();
          const toggleRect = themeToggle.getBoundingClientRect();
          const shellHeight =
            (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0) +
            (main?.getBoundingClientRect().height ?? 0) +
            (document.querySelector(".site-footer")?.getBoundingClientRect().height ?? 0);
          const shellFitsViewport = shellHeight <= innerHeight + 0.5;

          return {
            brandText: brand?.textContent?.trim() ?? "",
            brandAriaLabel: brand?.getAttribute("aria-label") ?? "",
            verticalOverflow:
              document.documentElement.scrollHeight - document.documentElement.clientHeight,
            shellFitsViewport,
            scrollWidth: document.documentElement.scrollWidth,
            mainWidth: main.getBoundingClientRect().width,
            gridColumns: getComputedStyle(grid)
              .gridTemplateColumns.split(" ")
              .map(Number.parseFloat),
            mediaWidth: mediaRect.width,
            mediaTop: mediaRect.top,
            feedTop: feedRect.top,
            feedWidth: feedRect.width,
            lightDisplay: lightStyle.display,
            darkDisplay: darkStyle.display,
            lightSrc: lightImage?.getAttribute("src") ?? "",
            darkSrc: darkImage?.getAttribute("src") ?? "",
            lightAlt: lightImage?.getAttribute("alt") ?? "",
            darkAlt: darkImage?.getAttribute("alt") ?? "",
            lightNaturalWidth: lightImage?.naturalWidth ?? 0,
            darkNaturalWidth: darkImage?.naturalWidth ?? 0,
            lightNaturalHeight: lightImage?.naturalHeight ?? 0,
            imageWidth: visibleImage?.getBoundingClientRect().width ?? 0,
            imageHeight: visibleImage?.getBoundingClientRect().height ?? 0,
            visibleDisplay: visibleStyle.display,
            captionText: caption?.textContent?.trim() ?? "",
            zenText: document.body.textContent.includes("见了便做"),
            sectionRules,
            headerBorderBottom: headerStyle.borderBottomWidth,
            headerWidth: headerRect.width,
            footerBorderTop: footerStyle.borderTopWidth,
            footerWidth: footerRect.width,
            shellAligned:
              Math.abs(headerRect.left - footerRect.left) < 1 &&
              Math.abs(headerRect.width - footerRect.width) < 1,
            postPreviewOrder: postPreview
              ? [...postPreview.children].map(child => child.tagName.toLowerCase())
              : [],
            shuoshuoPreviewOrder: shuoshuoPreview
              ? [...shuoshuoPreview.children].map(child => child.tagName.toLowerCase())
              : [],
            shuoshuoPreviewBackground: shuoshuoPreviewStyle?.backgroundColor ?? "",
            shuoshuoPreviewBorderWidth: shuoshuoPreviewStyle
              ? Number.parseFloat(shuoshuoPreviewStyle.borderTopWidth)
              : 0,
            shuoshuoPreviewRadius: shuoshuoPreviewStyle
              ? Number.parseFloat(shuoshuoPreviewStyle.borderRadius)
              : 0,
            homeDate,
            descriptionWhiteSpace: descriptionStyle?.whiteSpace ?? "",
            descriptionOverflow: descriptionStyle?.overflow ?? "",
            descriptionTextOverflow: descriptionStyle?.textOverflow ?? "",
            viewAllDecoration: viewAllStyle?.textDecorationLine ?? "",
            viewAll,
            themePosition: toggleStyle.position,
            themeInHeader: Boolean(themeToggle.closest(".site-header")),
            themeNearBottomRight:
              toggleRect.bottom <= innerHeight &&
              toggleRect.right <= innerWidth &&
              toggleRect.bottom > innerHeight - 96 &&
              toggleRect.right > innerWidth - 96,
            background: bodyStyle.backgroundColor,
            text: bodyStyle.color,
            h1Count: document.querySelectorAll("h1").length,
          };
        });

        assert.equal(actual.scrollWidth, width, `${width}px 不得横向溢出`);
        assert.equal(actual.brandText, "JaspersBlog", "顶栏品牌可见文案应为 JaspersBlog");
        assert.equal(actual.brandAriaLabel, "JaspersBlog 首页", "顶栏品牌 aria-label 应对齐");
        if (actual.shellFitsViewport) {
          assert.equal(
            actual.verticalOverflow,
            0,
            `${width}px 首页内容不足一屏时不得出现假纵向滚动（overflow=${actual.verticalOverflow}）`,
          );
        }
        assert.equal(actual.background, expectedColors[theme].background);
        if (theme === "dark") {
          assert.equal(actual.text, expectedColors.dark.text);
        }
        assert.equal(actual.zenText, false, "首页不得再展示禅语三行文字");
        assert.equal(actual.h1Count, 1, "首页应保留唯一主标题");
        assert.equal(actual.captionText, "Talk is cheap. Show me the code.");
        assert.ok(actual.lightSrc, "亮色主视觉应有 src");
        assert.ok(actual.darkSrc, "暗色主视觉应有 src");
        assert.notEqual(actual.lightSrc, actual.darkSrc);
        assert.ok(actual.lightAlt.trim(), "主视觉应有 alt");
        assert.equal(actual.lightAlt, actual.darkAlt, "亮暗主视觉共用 alt");
        assert.ok(actual.lightNaturalWidth > 0, "亮色主视觉资源应成功加载");
        assert.ok(actual.darkNaturalWidth > 0, "暗色主视觉资源应成功加载");
        assert.ok(
          actual.lightNaturalWidth > actual.lightNaturalHeight,
          "主视觉应为横图（宽大于高）",
        );
        if (theme === "dark") {
          assert.notEqual(actual.darkDisplay, "none", "暗色主题应显示暗色主视觉");
          assert.equal(actual.lightDisplay, "none", "暗色主题应隐藏亮色主视觉");
        } else {
          assert.notEqual(actual.lightDisplay, "none", "亮色主题应显示亮色主视觉");
          assert.equal(actual.darkDisplay, "none", "亮色主题应隐藏暗色主视觉");
        }
        assert.ok(actual.imageWidth > 0, "主视觉应占据可见宽度");
        assert.ok(actual.imageWidth <= actual.mediaWidth + 1, "主视觉不得溢出 media 栏");
        assert.ok(actual.imageWidth > actual.imageHeight, "渲染后主视觉应为横向比例");
        assert.notEqual(actual.visibleDisplay, "none");
        assert.deepEqual(actual.postPreviewOrder.slice(0, 3), ["time", "h3", "p"]);
        assert.deepEqual(actual.shuoshuoPreviewOrder.slice(0, 2), ["time", "h3"]);
        assert.notEqual(
          actual.shuoshuoPreviewBackground,
          "rgba(0, 0, 0, 0)",
          "首页说说预览应有纸面背景",
        );
        assert.ok(actual.shuoshuoPreviewBorderWidth >= 1, "首页说说预览应有细边");
        assert.ok(actual.shuoshuoPreviewRadius >= 6, "首页说说预览应有可见圆角");
        assert.match(actual.homeDate, /^\d{4}\.\d{2}\.\d{2}$/, "首页日期应为 YYYY.MM.DD");
        assert.equal(actual.descriptionWhiteSpace, "nowrap");
        assert.equal(actual.descriptionOverflow, "hidden");
        assert.equal(actual.descriptionTextOverflow, "ellipsis");
        assert.equal(actual.viewAllDecoration, "none", "查看全部默认无下划线");
        assert.ok(
          actual.viewAll.some(
            item => item.href === "/archives/" && /^查看全部 \(\d+\)$/.test(item.text),
          ),
          "文章「查看全部 (N)」文案与链接",
        );
        assert.ok(
          actual.viewAll.some(
            item => item.href === "/shuoshuo/" && /^查看全部 \(\d+\)$/.test(item.text),
          ),
          "说说「查看全部 (N)」文案与链接",
        );
        for (const rule of actual.sectionRules) {
          assert.ok(rule.borderTopWidth >= 1, "分区线应有可见顶边");
          assert.notEqual(rule.borderTopStyle, "none");
        }
        assert.ok(Number.parseFloat(actual.headerBorderBottom) >= 1, "导航底线应可见");
        assert.ok(Number.parseFloat(actual.footerBorderTop) >= 1, "页脚线应可见");
        assert.equal(actual.shellAligned, true, "导航底线与页脚线应与内容壳左右对齐");
        assert.equal(actual.themePosition, "fixed", "主题钮应为固定悬浮");
        assert.equal(actual.themeInHeader, false, "主题钮不得放在顶栏");
        assert.equal(actual.themeNearBottomRight, true, "主题钮应在视口右下");
        if (width === 1440) {
          assertNear(actual.headerWidth, 1120);
          assertNear(actual.footerWidth, 1120);
        }

        if (width === 1440) {
          assertNear(actual.mainWidth, 1120);
          assert.equal(actual.gridColumns.length, 2);
          const [leftCol, rightCol] = actual.gridColumns;
          assert.ok(leftCol > rightCol, "桌面左栏应宽于右栏");
          assert.ok(
            leftCol / rightCol > 1.45 && leftCol / rightCol < 1.9,
            `桌面栏宽比应约 1.65：实际 ${leftCol / rightCol}`,
          );
          assertNear(actual.mediaTop, actual.feedTop, 3);
        } else {
          assertNear(actual.mainWidth, width);
          assert.equal(actual.gridColumns.length, 1);
        }

        await page.screenshot({
          path: `${screenshotDir}/home-${width}-${theme}.png`,
          fullPage: true,
        });

        await page.goto(`${host}${postPath}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);

        const article = await page.evaluate(() => {
          const main = document.querySelector("main");
          const reading = document.querySelector(".post-article");
          const body = document.querySelector(".post-body");
          const header = document.querySelector(".post-header");
          const title = document.querySelector(".post-header h1");
          const meta = document.querySelector(".post-meta");
          const toc = document.querySelector(".post-toc");
          const bodyStyle = getComputedStyle(body);
          const headerStyle = getComputedStyle(header);
          const titleStyle = getComputedStyle(title);
          const tocStyle = toc ? getComputedStyle(toc) : null;
          const pageBodyStyle = getComputedStyle(document.body);
          const codeEl = document.querySelector(".post-body .astro-code");
          const codeStyle = codeEl ? getComputedStyle(codeEl) : null;
          const formulaEl = document.querySelector(".post-body .katex");
          const formulaStyle = formulaEl ? getComputedStyle(formulaEl) : null;
          const formulaDisplay = document.querySelector(".post-body .katex-display");
          const formulaDisplayStyle = formulaDisplay ? getComputedStyle(formulaDisplay) : null;
          const h2 = document.querySelector(".post-body h2");
          const h2Style = h2 ? getComputedStyle(h2) : null;
          const quote = document.querySelector(".post-body blockquote");
          const quoteStyle = quote ? getComputedStyle(quote) : null;
          const inlineCode = document.querySelector(".post-body :not(pre) > code");
          const inlineCodeStyle = inlineCode ? getComputedStyle(inlineCode) : null;
          const table = document.querySelector(".post-body table");
          const tableTh = table?.querySelector("th");
          const tableTd = table?.querySelector("td");
          const tableThStyle = tableTh ? getComputedStyle(tableTh) : null;
          const tableTdStyle = tableTd ? getComputedStyle(tableTd) : null;
          const theadTr = table?.querySelector("thead tr");
          const theadTrStyle = theadTr ? getComputedStyle(theadTr) : null;
          const bodyLink = document.querySelector(".post-body a[href]");
          const bodyLinkStyle = bodyLink ? getComputedStyle(bodyLink) : null;
          const brand = document.querySelector(".brand");
          const brandStyle = brand ? getComputedStyle(brand) : null;
          const readingSurface =
            bodyStyle.backgroundColor === "rgba(0, 0, 0, 0)"
              ? pageBodyStyle.backgroundColor
              : bodyStyle.backgroundColor;
          const alertFixture = document.createElement("div");
          alertFixture.innerHTML = ["note", "tip", "important", "warning", "caution"]
            .map(
              type =>
                `<aside class="markdown-alert markdown-alert-${type}"><p class="markdown-alert-title">${type}</p><p>提示块正文</p></aside>`,
            )
            .join("");
          body.append(alertFixture);
          // 提示块正文对比：相对整页阅读底（分层 A 不铺正文纸带），标题用语义色对浅底
          const alertSamples = [...alertFixture.querySelectorAll(".markdown-alert")].flatMap(
            alert => {
              const type = alert.className;
              return [
                [
                  getComputedStyle(alert.querySelector(".markdown-alert-title")).color,
                  readingSurface,
                  `${type} 标题`,
                ],
                [
                  getComputedStyle(alert.querySelector("p:last-child")).color,
                  readingSurface,
                  `${type} 正文`,
                ],
              ];
            },
          );
          const tokenSamples = codeEl
            ? [...codeEl.querySelectorAll("span[style]")]
                .filter(token => token.style.color)
                .map(token => [
                  getComputedStyle(token).color,
                  codeStyle.backgroundColor,
                  "代码标记",
                ])
            : [];
          const wideContent = [
            ...document.querySelectorAll(
              ".post-body table, .post-body .astro-code, .post-body .katex-display",
            ),
          ];
          const metaText = meta?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const postTags = meta?.querySelector(".post-tags");
          const firstTagLink = postTags?.querySelector("a");
          const firstTagStyle = firstTagLink ? getComputedStyle(firstTagLink) : null;
          const firstTagLiStyle = firstTagLink?.parentElement
            ? getComputedStyle(firstTagLink.parentElement)
            : null;
          const firstTagHash = firstTagLink?.querySelector(".tag-hash");

          const result = {
            scrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            mainWidth: main.getBoundingClientRect().width,
            mainScrollWidth: main.scrollWidth,
            readingWidth: reading.getBoundingClientRect().width,
            readingScrollWidth: reading.scrollWidth,
            contentWidth:
              body.clientWidth -
              Number.parseFloat(bodyStyle.paddingLeft) -
              Number.parseFloat(bodyStyle.paddingRight),
            bodyPaddingLeft: Number.parseFloat(bodyStyle.paddingLeft),
            bodyBackground: bodyStyle.backgroundColor,
            bodyBoxShadow: bodyStyle.boxShadow,
            bodyColor: bodyStyle.color,
            bodyLineHeight: bodyStyle.lineHeight,
            bodyFontSize: Number.parseFloat(bodyStyle.fontSize),
            headerBorderBottom: Number.parseFloat(headerStyle.borderBottomWidth),
            titleFontFamily: titleStyle.fontFamily,
            titleFontSize: Number.parseFloat(titleStyle.fontSize),
            titleFontWeight: titleStyle.fontWeight,
            titleColor: titleStyle.color,
            h2Color: h2Style?.color ?? "",
            h2BorderBottomWidth: h2Style ? Number.parseFloat(h2Style.borderBottomWidth) : null,
            quoteColor: quoteStyle?.color ?? "",
            quoteBorderLeftColor: quoteStyle?.borderLeftColor ?? "",
            quoteBackground: quoteStyle?.backgroundColor ?? "",
            inlineCodeColor: inlineCodeStyle?.color ?? "",
            inlineCodeBackground: inlineCodeStyle?.backgroundColor ?? "",
            codeBackground: codeStyle?.backgroundColor ?? "",
            codeBorderColor: codeStyle?.borderTopColor ?? "",
            bodyLinkColor: bodyLinkStyle?.color ?? "",
            tableThBorderWidth: tableThStyle
              ? Number.parseFloat(tableThStyle.borderTopWidth)
              : null,
            tableTdBorderWidth: tableTdStyle
              ? Number.parseFloat(tableTdStyle.borderTopWidth)
              : null,
            tableHeadBorderBottomWidth: theadTrStyle
              ? Number.parseFloat(theadTrStyle.borderBottomWidth)
              : null,
            formulaDisplayOverflowY: formulaDisplayStyle?.overflowY ?? "",
            shellBrandColor: brandStyle?.color ?? "",
            metaText,
            hasPublishedPrefix: /发布于|更新于/.test(metaText),
            tagsInMeta: Boolean(postTags),
            tagCount: postTags?.querySelectorAll("a").length ?? 0,
            firstTagText: firstTagLink?.textContent?.replace(/\s+/g, "").trim() ?? "",
            firstTagHash: firstTagHash?.textContent ?? "",
            firstTagBorderWidth: firstTagStyle
              ? Number.parseFloat(firstTagStyle.borderTopWidth)
              : null,
            firstTagBackground: firstTagStyle?.backgroundColor ?? "",
            firstTagLiBorderWidth: firstTagLiStyle
              ? Number.parseFloat(firstTagLiStyle.borderTopWidth)
              : null,
            firstTagLiBackground: firstTagLiStyle?.backgroundColor ?? "",
            tocExists: Boolean(toc),
            tocDisplay: tocStyle?.display ?? "none",
            tocPosition: tocStyle?.position ?? "",
            tocWidth: toc ? toc.getBoundingClientRect().width : 0,
            background: pageBodyStyle.backgroundColor,
            readingSurface,
            contrastSamples: [
              [pageBodyStyle.color, pageBodyStyle.backgroundColor, "页面正文"],
              [bodyStyle.color, readingSurface, "技术文章正文"],
              ...(codeStyle ? [[codeStyle.color, codeStyle.backgroundColor, "代码块"]] : []),
              ...tokenSamples,
              ...(formulaStyle ? [[formulaStyle.color, readingSurface, "公式"]] : []),
              ...alertSamples,
            ],
            wideContentContained: wideContent.every(
              element => element.getBoundingClientRect().width <= body.clientWidth,
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
        // 去卡片：正文不再铺独立纸面底，整页落在壳背景上（不铺全页 Kraft 纸带）
        assert.ok(
          article.bodyBackground === "rgba(0, 0, 0, 0)" ||
            article.bodyBackground === article.background,
          `${theme} 正文去卡片后应透明或等同壳背景，实际 ${article.bodyBackground}`,
        );
        assert.equal(
          article.bodyBoxShadow === "none" || article.bodyBoxShadow === "",
          true,
          "正文不得再有卡片阴影/inset 边框",
        );
        assert.equal(
          article.readingSurface,
          expectedColors[theme].background,
          `${theme} 阅读底应为壳背景，不得换成 Kraft 纸面带`,
        );
        // 正文层 Kraft 色板（分层 A）
        assert.equal(
          article.bodyColor,
          expectedColors[theme].bodyText,
          `${theme} 正文色应对齐 Kraft`,
        );
        if (article.h2Color) {
          assert.equal(
            article.h2Color,
            expectedColors[theme].bodyHeading,
            `${theme} 正文 h2 应对齐 Kraft heading`,
          );
          assert.ok((article.h2BorderBottomWidth ?? 0) < 1, "Kraft 正文 h2 不应再画底部分隔线");
        }
        if (article.quoteColor) {
          assert.equal(
            article.quoteColor,
            expectedColors[theme].bodyQuote,
            `${theme} 引用文字色应对齐 Kraft`,
          );
          assert.equal(
            article.quoteBorderLeftColor,
            expectedColors[theme].bodyQuoteBorder,
            `${theme} 引用左边线应对齐 Kraft`,
          );
          assert.ok(
            article.quoteBackground === "rgba(0, 0, 0, 0)" ||
              article.quoteBackground === "transparent",
            `引用应为透明底，实际 ${article.quoteBackground}`,
          );
        }
        if (article.inlineCodeColor) {
          assert.equal(
            article.inlineCodeColor,
            expectedColors[theme].bodyInlineCode,
            `${theme} 行内码色应对齐 Kraft`,
          );
          assert.equal(
            article.inlineCodeBackground,
            expectedColors[theme].bodyInlineBg,
            `${theme} 行内码底应对齐 Kraft`,
          );
        }
        if (article.codeBackground) {
          assert.equal(
            article.codeBackground,
            expectedColors[theme].bodyCodeBg,
            `${theme} 代码块底应对齐 Kraft`,
          );
        }
        if (article.bodyLinkColor) {
          assert.equal(
            article.bodyLinkColor,
            expectedColors[theme].bodyAccent,
            `${theme} 正文链接应对齐 Kraft 强调色`,
          );
        }
        if (article.tableHeadBorderBottomWidth != null) {
          assert.ok(article.tableHeadBorderBottomWidth >= 1, "表格表头应有 Kraft 式底边线");
          assert.ok(
            (article.tableThBorderWidth ?? 0) < 1 && (article.tableTdBorderWidth ?? 0) < 1,
            "表格单元格不得再画满格边框",
          );
        }
        if (article.formulaDisplayOverflowY) {
          assert.notEqual(
            article.formulaDisplayOverflowY,
            "hidden",
            "块级公式不得 overflow-y:hidden 裁切上下标",
          );
        }
        // 外壳未被强制改成 Kraft 全站色：标题区 h1 / 品牌仍用壳 --text
        if (theme === "dark") {
          assert.equal(article.titleColor, expectedColors.dark.text, "暗色标题区应保持壳字色");
          assert.equal(
            article.shellBrandColor,
            expectedColors.dark.text,
            "暗色顶栏品牌应保持壳字色",
          );
        } else {
          // 亮色壳字 #282724，与 Kraft 正文 #2b2621 刻意分层
          assert.equal(article.titleColor, "rgb(40, 39, 36)", "亮色标题区应保持壳字色");
          assert.equal(article.shellBrandColor, "rgb(40, 39, 36)", "亮色顶栏品牌应保持壳字色");
          assert.notEqual(
            article.bodyColor,
            article.titleColor,
            "亮色正文 Kraft 色应与壳标题色分层",
          );
        }
        assert.ok(article.headerBorderBottom >= 1, "标题区与正文之间应有细分隔线");
        assert.match(
          article.metaText,
          /^\d{4}\.\d{2}\.\d{2}/,
          "元信息应以 YYYY.MM.DD 发布时间开头",
        );
        assert.equal(article.hasPublishedPrefix, false, "不得展示「发布于/更新于」");
        // 挂在技术文章上的标签：元信息行内弱化 #tag，非 pill
        assert.equal(article.tagsInMeta, true, "标签应在标题区元信息行内");
        assert.ok(article.tagCount >= 1, "单篇页应至少有一个标签");
        assert.equal(article.firstTagHash, "#", "标签应有可见 # 前缀");
        assert.match(article.firstTagText, /^#.+/, "标签文案应为 #tag 形态");
        assert.ok(
          (article.firstTagBorderWidth ?? 0) < 1 &&
            (article.firstTagLiBorderWidth ?? 0) < 1 &&
            (article.firstTagBackground === "rgba(0, 0, 0, 0)" ||
              article.firstTagBackground === "") &&
            (article.firstTagLiBackground === "rgba(0, 0, 0, 0)" ||
              article.firstTagLiBackground === ""),
          `单篇标签不得呈 pill/边框按钮：border=${article.firstTagBorderWidth}/${article.firstTagLiBorderWidth} bg=${article.firstTagBackground}/${article.firstTagLiBackground}`,
        );
        assert.match(article.titleFontFamily, /^"Source Serif 4", "Noto Serif SC"/);
        assert.equal(article.titleFontWeight, "600");
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
          assertNear(article.readingWidth, 760);
          assertNear(article.contentWidth, 760);
          assertNear(article.bodyPaddingLeft, 0);
          assertNear(article.titleFontSize, 36);
          assert.equal(article.tocExists, true);
          assert.notEqual(article.tocDisplay, "none", "≥1280px 应显示目录");
          assert.equal(article.tocPosition, "fixed");
          assertNear(article.tocWidth, 180, 4);
        } else {
          assertNear(article.readingWidth, width - 32);
          assertNear(article.bodyPaddingLeft, 0);
          assertNear(article.titleFontSize, 30);
          assert.equal(article.tocDisplay, "none", `${width}px <1280 应隐藏目录`);
        }

        await page.screenshot({
          path: `${postScreenshotDir}/post-${width}-${theme}.png`,
          fullPage: true,
        });
        assert.deepEqual(pageErrors, []);
        await context.close();
      }
    }

    {
      const archiveContext = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      });
      const archivePage = await archiveContext.newPage();
      await archivePage.goto(`${host}/archives/`, { waitUntil: "networkidle" });
      await archivePage.evaluate(() => document.fonts.ready);

      const archive = await archivePage.evaluate(() => {
        const h1 = document.querySelector("h1");
        const intro = document.querySelector(".page-intro");
        const years = [...document.querySelectorAll(".archive-year")];
        const cards = [...document.querySelectorAll(".archive-card")];
        const timeline = document.querySelector(".archive-timeline");
        const firstItem = timeline?.querySelector(":scope > li");
        const h1Style = h1 ? getComputedStyle(h1) : null;
        const firstCard = cards[0];
        const firstCardStyle = firstCard ? getComputedStyle(firstCard) : null;
        const firstTime = firstCard?.querySelector("time");
        const firstTitle = firstCard?.querySelector(".archive-card-title");
        const firstTags = firstCard?.querySelector(".post-tags");
        const firstTagLink = firstTags?.querySelector("a");
        const firstTagStyle = firstTagLink ? getComputedStyle(firstTagLink) : null;
        const firstTagLiStyle = firstTagLink?.parentElement
          ? getComputedStyle(firstTagLink.parentElement)
          : null;
        const firstTagHash = firstTagLink?.querySelector(".tag-hash");

        const isVisuallyHidden = style => {
          if (!style || !h1) return false;
          if (style.display === "none" || style.visibility === "hidden") return true;
          if (Number.parseFloat(style.opacity) === 0) return true;
          const rect = h1.getBoundingClientRect();
          if (rect.width <= 1 && rect.height <= 1) return true;
          if (style.clipPath && style.clipPath !== "none" && style.clipPath.includes("inset")) {
            return true;
          }
          if (style.position === "absolute" && (rect.width <= 1 || rect.height <= 1)) return true;
          return false;
        };

        // 轴线与圆点应对齐：translateX(-50%) 后中心落在 left 坐标上
        let railDotDelta = null;
        if (timeline && firstItem) {
          const line = getComputedStyle(timeline, "::before");
          const dot = getComputedStyle(firstItem, "::before");
          const lineLeft = Number.parseFloat(line.left);
          const dotLeft = Number.parseFloat(dot.left);
          if (Number.isFinite(lineLeft) && Number.isFinite(dotLeft)) {
            const paddingEdge = element =>
              element.getBoundingClientRect().left + element.clientLeft;
            const lineCenterX = paddingEdge(timeline) + lineLeft;
            const dotCenterX = paddingEdge(firstItem) + dotLeft;
            railDotDelta = Math.abs(lineCenterX - dotCenterX);
          }
        }

        return {
          title: document.title,
          hasIntro: Boolean(intro),
          h1Text: h1?.textContent?.trim() ?? "",
          h1Hidden: isVisuallyHidden(h1Style),
          yearCount: years.length,
          yearLabels: years.map(year => year.querySelector("h2")?.textContent?.trim() ?? ""),
          cardCount: cards.length,
          hasTimeline: Boolean(timeline),
          firstDate: firstTime?.textContent?.trim() ?? "",
          firstDateTime: firstTime?.getAttribute("datetime") ?? "",
          firstTitle: firstTitle?.textContent?.trim() ?? "",
          firstHref: firstTitle?.getAttribute("href") ?? "",
          hasTags: Boolean(firstTags),
          tagCount: firstTags?.querySelectorAll("a").length ?? 0,
          firstTagText: firstTagLink?.textContent?.replace(/\s+/g, "").trim() ?? "",
          firstTagHash: firstTagHash?.textContent ?? "",
          firstTagBorderWidth: firstTagStyle
            ? Number.parseFloat(firstTagStyle.borderTopWidth)
            : null,
          firstTagBackground: firstTagStyle?.backgroundColor ?? "",
          firstTagLiBorderWidth: firstTagLiStyle
            ? Number.parseFloat(firstTagLiStyle.borderTopWidth)
            : null,
          firstTagLiBackground: firstTagLiStyle?.backgroundColor ?? "",
          cardBackground: firstCardStyle?.backgroundColor ?? "",
          cardDisplay: firstCardStyle?.display ?? "",
          railDotDelta,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      assert.match(archive.title, /归档/);
      assert.equal(archive.hasIntro, false, "归档页不得有可见栏目 intro");
      assert.equal(archive.h1Text, "归档");
      assert.equal(archive.h1Hidden, true, "归档主标题应对视觉隐藏、仅服务无障碍");
      assert.ok(archive.yearCount >= 1, "归档应按年分组");
      assert.ok(
        archive.yearLabels.every(label => /\d{4}\s*年/.test(label)),
        `年份标签格式不符：${archive.yearLabels.join(", ")}`,
      );
      assert.equal(archive.hasTimeline, true, "归档应有时间轴");
      assert.ok(archive.cardCount >= 1, "归档应有卡片条目");
      assert.match(archive.firstDate, /^\d{4}-\d{2}-\d{2}$/, "归档日期应为 YYYY-MM-DD");
      assert.ok(archive.firstDateTime, "归档日期应有 datetime");
      assert.ok(archive.firstTitle, "归档卡片应有标题");
      assert.match(archive.firstHref, /^\/posts\/[^/]+\/$/);
      assert.equal(archive.hasTags, true, "归档卡片应展示标签");
      assert.ok(archive.tagCount >= 1, "归档卡片应至少有一个可点标签");
      assert.equal(archive.firstTagHash, "#", "归档标签应有可见 # 前缀");
      assert.match(archive.firstTagText, /^#.+/, "归档标签文案应为 #tag 形态");
      assert.ok(
        (archive.firstTagBorderWidth ?? 0) < 1 &&
          (archive.firstTagLiBorderWidth ?? 0) < 1 &&
          (archive.firstTagBackground === "rgba(0, 0, 0, 0)" ||
            archive.firstTagBackground === "") &&
          (archive.firstTagLiBackground === "rgba(0, 0, 0, 0)" ||
            archive.firstTagLiBackground === ""),
        `归档标签不得呈 pill/边框按钮：border=${archive.firstTagBorderWidth}/${archive.firstTagLiBorderWidth} bg=${archive.firstTagBackground}/${archive.firstTagLiBackground}`,
      );
      assert.notEqual(archive.cardBackground, "rgba(0, 0, 0, 0)", "归档卡片应有表面背景");
      assert.ok(
        archive.railDotDelta != null && archive.railDotDelta <= 1,
        `时间轴线应穿过圆点中心（偏差 ${archive.railDotDelta}px）`,
      );
      assert.equal(archive.scrollWidth, 1440, "归档页不得横向溢出");
      await archiveContext.close();
    }

    {
      const tagsContext = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      });
      const tagsPage = await tagsContext.newPage();
      await tagsPage.goto(`${host}/tags/`, { waitUntil: "networkidle" });
      await tagsPage.evaluate(() => document.fonts.ready);

      const tagsIndex = await tagsPage.evaluate(() => {
        const h1 = document.querySelector("h1");
        const intro = document.querySelector(".page-intro");
        const cloud = document.querySelector(".tag-cloud");
        const items = cloud ? [...cloud.querySelectorAll(":scope > li")] : [];
        const firstLink = items[0]?.querySelector("a");
        const firstCount = firstLink?.querySelector(".tag-count");
        const h1Style = h1 ? getComputedStyle(h1) : null;
        const firstLinkStyle = firstLink ? getComputedStyle(firstLink) : null;
        const firstCountStyle = firstCount ? getComputedStyle(firstCount) : null;
        const sizes = items.map(item => {
          const link = item.querySelector("a");
          return Number.parseFloat(getComputedStyle(link ?? item).fontSize);
        });

        const isVisuallyHidden = style => {
          if (!style || !h1) return false;
          if (style.display === "none" || style.visibility === "hidden") return true;
          if (Number.parseFloat(style.opacity) === 0) return true;
          const rect = h1.getBoundingClientRect();
          if (rect.width <= 1 && rect.height <= 1) return true;
          if (style.clipPath && style.clipPath !== "none" && style.clipPath.includes("inset")) {
            return true;
          }
          if (style.position === "absolute" && (rect.width <= 1 || rect.height <= 1)) return true;
          return false;
        };

        return {
          title: document.title,
          hasIntro: Boolean(intro),
          h1Text: h1?.textContent?.trim() ?? "",
          h1Hidden: isVisuallyHidden(h1Style),
          hasCloud: Boolean(cloud),
          tagCount: items.length,
          firstHref: firstLink?.getAttribute("href") ?? "",
          firstLabel: firstLink?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          firstCount: firstCount?.textContent?.trim() ?? "",
          minFontSize: sizes.length ? Math.min(...sizes) : 0,
          maxFontSize: sizes.length ? Math.max(...sizes) : 0,
          chipBackground: firstLinkStyle?.backgroundColor ?? "",
          chipBorderWidth: firstLinkStyle ? Number.parseFloat(firstLinkStyle.borderTopWidth) : 0,
          chipRadius: firstLinkStyle ? Number.parseFloat(firstLinkStyle.borderRadius) : 0,
          countBackground: firstCountStyle?.backgroundColor ?? "",
          restTransform: firstLinkStyle?.transform ?? "none",
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      assert.match(tagsIndex.title, /标签/);
      assert.equal(tagsIndex.hasIntro, false, "标签索引不得有可见栏目 intro");
      assert.equal(tagsIndex.h1Text, "标签");
      assert.equal(tagsIndex.h1Hidden, true, "标签主标题应对视觉隐藏、仅服务无障碍");
      assert.equal(tagsIndex.hasCloud, true, "标签索引应为标签云");
      assert.ok(tagsIndex.tagCount >= 1, "标签云应有条目");
      assert.match(tagsIndex.firstHref, /^\/tags\/[^/]+\/$/);
      assert.ok(tagsIndex.firstLabel, "标签云条目应有名称");
      assert.match(tagsIndex.firstCount, /^\d+$/, "标签云应展示数字计数");
      assert.ok(
        Math.abs(tagsIndex.maxFontSize - tagsIndex.minFontSize) <= 0.5,
        `标签 chip 应同字号（跨度 ${tagsIndex.maxFontSize - tagsIndex.minFontSize}px）`,
      );
      assert.notEqual(tagsIndex.chipBackground, "rgba(0, 0, 0, 0)", "标签 chip 应有表面背景");
      assert.ok(tagsIndex.chipBorderWidth >= 1, "标签 chip 应有描边");
      assert.ok(tagsIndex.chipRadius >= 6, "标签 chip 应有可见圆角");
      assert.notEqual(tagsIndex.countBackground, "rgba(0, 0, 0, 0)", "计数应为极淡角标底");
      const restScale = parseCssScale(tagsIndex.restTransform);
      assert.ok(Math.abs(restScale - 1) <= 0.02, `默认态不得缩放（scale=${restScale}）`);
      assert.equal(tagsIndex.scrollWidth, 1440, "标签索引不得横向溢出");

      const hoverTransformRule = await tagsPage.evaluate(() => {
        for (const sheet of document.styleSheets) {
          let rules;
          try {
            rules = [...sheet.cssRules];
          } catch {
            continue;
          }
          for (const rule of rules) {
            if (
              rule instanceof CSSStyleRule &&
              rule.selectorText.split(",").some(part => part.trim() === ".tag-cloud a:hover")
            ) {
              return rule.style.transform;
            }
          }
        }
        return "";
      });
      assert.match(
        hoverTransformRule,
        /scale\(\s*1\.04\s*\)/,
        `悬停规则应为 scale(1.04)，实际「${hoverTransformRule}」`,
      );

      const firstChip = tagsPage.locator(".tag-cloud a").first();
      await firstChip.hover();
      await tagsPage.waitForTimeout(200);
      const hoverScale = parseCssScale(
        await firstChip.evaluate(link => getComputedStyle(link).transform),
      );
      // 实机 :hover 在无头环境偶发不生效；样式表规则已断言，此处仅在生效时校验量级
      if (hoverScale > 1.01) {
        assert.ok(
          Math.abs(hoverScale - 1.04) <= 0.015,
          `悬停应轻微缩放至约 1.04（实际 ${hoverScale}）`,
        );
      }

      const detailHref = tagsIndex.firstHref;
      await tagsPage.goto(`${host}${detailHref}`, { waitUntil: "networkidle" });
      await tagsPage.evaluate(() => document.fonts.ready);

      const tagDetail = await tagsPage.evaluate(() => {
        const h1 = document.querySelector("h1");
        const intro = document.querySelector(".page-intro");
        const list = document.querySelector(".tag-post-list");
        const items = list ? [...list.querySelectorAll(":scope > li")] : [];
        const first = items[0];
        const firstTime = first?.querySelector("time");
        const firstTitle = first?.querySelector(".tag-post-title");
        const h1Style = h1 ? getComputedStyle(h1) : null;

        const isVisuallyHidden = style => {
          if (!style || !h1) return false;
          if (style.display === "none" || style.visibility === "hidden") return true;
          if (Number.parseFloat(style.opacity) === 0) return true;
          const rect = h1.getBoundingClientRect();
          if (rect.width <= 1 && rect.height <= 1) return true;
          if (style.clipPath && style.clipPath !== "none" && style.clipPath.includes("inset")) {
            return true;
          }
          if (style.position === "absolute" && (rect.width <= 1 || rect.height <= 1)) return true;
          return false;
        };

        return {
          hasIntro: Boolean(intro),
          h1Text: h1?.textContent?.trim() ?? "",
          h1Hidden: isVisuallyHidden(h1Style),
          hasList: Boolean(list),
          itemCount: items.length,
          firstDate: firstTime?.textContent?.trim() ?? "",
          firstDateTime: firstTime?.getAttribute("datetime") ?? "",
          firstTitle: firstTitle?.textContent?.trim() ?? "",
          firstHref: firstTitle?.getAttribute("href") ?? "",
          hasPreview: Boolean(document.querySelector(".post-preview, .post-list")),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      assert.equal(tagDetail.hasIntro, false, "标签详情不得有可见栏目 intro");
      assert.ok(tagDetail.h1Text, "标签详情应有无障碍页面名");
      assert.equal(tagDetail.h1Hidden, true, "标签详情主标题应对视觉隐藏");
      assert.equal(tagDetail.hasList, true, "标签详情应为日期+标题列表");
      assert.ok(tagDetail.itemCount >= 1, "标签详情应有文章条目");
      assert.match(tagDetail.firstDate, /^\d{4}-\d{2}-\d{2}$/, "标签详情日期应为 YYYY-MM-DD");
      assert.ok(tagDetail.firstDateTime, "标签详情日期应有 datetime");
      assert.ok(tagDetail.firstTitle, "标签详情应有标题");
      assert.match(tagDetail.firstHref, /^\/posts\/[^/]+\/$/);
      assert.equal(tagDetail.hasPreview, false, "标签详情不得复用预览列表壳");
      assert.equal(tagDetail.scrollWidth, 1440, "标签详情不得横向溢出");
      await tagsContext.close();
    }

    {
      const shuoshuoContext = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      });
      const shuoshuoPage = await shuoshuoContext.newPage();
      await shuoshuoPage.goto(`${host}/shuoshuo/`, { waitUntil: "networkidle" });
      await shuoshuoPage.evaluate(() => document.fonts.ready);

      const shuoshuo = await shuoshuoPage.evaluate(() => {
        const h1 = document.querySelector("h1");
        const intro = document.querySelector(".page-intro");
        const list = document.querySelector(".shuoshuo-list");
        const cards = [...document.querySelectorAll(".shuoshuo-card")];
        const items = list ? [...list.querySelectorAll(":scope > li")] : [];
        const h1Style = h1 ? getComputedStyle(h1) : null;
        const firstCard = cards[0];
        const firstCardStyle = firstCard ? getComputedStyle(firstCard) : null;
        const firstItemStyle = items[0] ? getComputedStyle(items[0]) : null;
        const listStyle = list ? getComputedStyle(list) : null;

        const isVisuallyHidden = style => {
          if (!style || !h1) return false;
          if (style.display === "none" || style.visibility === "hidden") return true;
          if (Number.parseFloat(style.opacity) === 0) return true;
          const rect = h1.getBoundingClientRect();
          if (rect.width <= 1 && rect.height <= 1) return true;
          if (style.clipPath && style.clipPath !== "none" && style.clipPath.includes("inset")) {
            return true;
          }
          if (style.position === "absolute" && (rect.width <= 1 || rect.height <= 1)) return true;
          return false;
        };

        let gapBetweenCards = null;
        if (items.length >= 2) {
          const a = items[0].getBoundingClientRect();
          const b = items[1].getBoundingClientRect();
          gapBetweenCards = b.top - a.bottom;
        }

        return {
          title: document.title,
          hasIntro: Boolean(intro),
          h1Text: h1?.textContent?.trim() ?? "",
          h1Hidden: isVisuallyHidden(h1Style),
          cardCount: cards.length,
          itemCount: items.length,
          cardBackground: firstCardStyle?.backgroundColor ?? "",
          cardBorderWidth: firstCardStyle ? Number.parseFloat(firstCardStyle.borderTopWidth) : 0,
          cardRadius: firstCardStyle ? Number.parseFloat(firstCardStyle.borderRadius) : 0,
          itemBorderTop: firstItemStyle ? Number.parseFloat(firstItemStyle.borderTopWidth) : 0,
          itemBorderBottom: firstItemStyle
            ? Number.parseFloat(firstItemStyle.borderBottomWidth)
            : 0,
          listGap: listStyle ? Number.parseFloat(listStyle.rowGap || listStyle.gap) : 0,
          gapBetweenCards,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      assert.match(shuoshuo.title, /说说/);
      assert.equal(shuoshuo.hasIntro, false, "说说页不得有可见栏目 intro");
      assert.equal(shuoshuo.h1Text, "说说");
      assert.equal(shuoshuo.h1Hidden, true, "说说主标题应对视觉隐藏、仅服务无障碍");
      assert.ok(shuoshuo.cardCount >= 1, "说说列表应有卡片条目");
      assert.equal(shuoshuo.cardCount, shuoshuo.itemCount, "每条说说应对应一张卡片");
      assert.notEqual(shuoshuo.cardBackground, "rgba(0, 0, 0, 0)", "说说卡片应有纸面背景");
      assert.ok(shuoshuo.cardBorderWidth >= 1, "说说卡片应有细边");
      assert.ok(shuoshuo.cardRadius >= 6, "说说卡片应有可见圆角");
      assert.equal(shuoshuo.itemBorderTop, 0, "说说列表不得用条目顶部分割线");
      assert.equal(shuoshuo.itemBorderBottom, 0, "说说列表不得用条目底部分割线");
      if (shuoshuo.itemCount >= 2) {
        assert.ok(
          (shuoshuo.gapBetweenCards ?? 0) >= 8 || shuoshuo.listGap >= 8,
          "说说卡片之间应以间距区分",
        );
      }
      assert.equal(shuoshuo.scrollWidth, 1440, "说说页不得横向溢出");
      await shuoshuoContext.close();
    }

    {
      const aboutContext = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      });
      const aboutPage = await aboutContext.newPage();
      await aboutPage.goto(`${host}/about/`, { waitUntil: "networkidle" });
      await aboutPage.evaluate(() => document.fonts.ready);

      const about = await aboutPage.evaluate(() => {
        const h1 = document.querySelector("h1");
        const intro = document.querySelector(".page-intro");
        const h1Style = h1 ? getComputedStyle(h1) : null;

        const isVisuallyHidden = style => {
          if (!style || !h1) return false;
          if (style.display === "none" || style.visibility === "hidden") return true;
          if (Number.parseFloat(style.opacity) === 0) return true;
          const rect = h1.getBoundingClientRect();
          if (rect.width <= 1 && rect.height <= 1) return true;
          if (style.clipPath && style.clipPath !== "none" && style.clipPath.includes("inset")) {
            return true;
          }
          if (style.position === "absolute" && (rect.width <= 1 || rect.height <= 1)) return true;
          return false;
        };

        return {
          title: document.title,
          hasIntro: Boolean(intro),
          h1Text: h1?.textContent?.trim() ?? "",
          h1Hidden: isVisuallyHidden(h1Style),
          bodyHasJasper: document.body.textContent.includes("Jasper"),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      assert.match(about.title, /关于/);
      assert.equal(about.hasIntro, false, "关于页不得有可见栏目 intro");
      assert.equal(about.h1Text, "关于");
      assert.equal(about.h1Hidden, true, "关于主标题应对视觉隐藏、仅服务无障碍");
      assert.equal(about.bodyHasJasper, true, "关于页应保留正文内容");
      assert.equal(about.scrollWidth, 1440, "关于页不得横向溢出");
      await aboutContext.close();
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
    assert.equal(
      await intermediatePage.evaluate(() => {
        const toc = document.querySelector(".post-toc");
        return toc ? getComputedStyle(toc).display : "none";
      }),
      "none",
      "1024px <1280 应隐藏 fixed 目录",
    );
    await intermediateContext.close();

    // 宽屏滚动：目录当前项应随滚动激活（aria-current）
    {
      const tocContext = await browser.newContext({
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      });
      const tocPage = await tocContext.newPage();
      await tocPage.goto(`${host}${longPostPath}`, { waitUntil: "networkidle" });
      await tocPage.evaluate(() => document.fonts.ready);

      const tocInitial = await tocPage.evaluate(() => {
        const toc = document.querySelector(".post-toc");
        const links = toc ? [...toc.querySelectorAll('a[href^="#"]')] : [];
        return {
          tocDisplay: toc ? getComputedStyle(toc).display : "none",
          linkCount: links.length,
          hasCurrent: links.some(link => link.getAttribute("aria-current") === "true"),
        };
      });
      assert.notEqual(tocInitial.tocDisplay, "none", "长文宽屏应显示目录");
      assert.ok(tocInitial.linkCount >= 2, "长文目录应有多个条目以便验收滚动高亮");

      // 滚到第二个 h2，等待 IntersectionObserver 更新
      const secondHeadingId = await tocPage.evaluate(() => {
        const headings = [...document.querySelectorAll(".post-body h2[id]")];
        return headings[1]?.id ?? headings[0]?.id ?? "";
      });
      assert.ok(secondHeadingId, "长文应有可滚动的 h2");
      await tocPage.evaluate(id => {
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      }, secondHeadingId);
      await tocPage.waitForTimeout(400);

      const activeHref = await tocPage.evaluate(() => {
        const current = document.querySelector('.post-toc a[aria-current="true"]');
        return current?.getAttribute("href") ?? "";
      });
      assert.equal(
        activeHref,
        `#${secondHeadingId}`,
        `滚动后目录应高亮当前节，期望 #${secondHeadingId}，实际 ${activeHref}`,
      );
      await tocContext.close();
    }

    const context = await browser.newContext({
      viewport: { width: 375, height: 960 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto(host);
    let reachedThemeToggle = false;
    for (let tabs = 0; tabs < 40; tabs += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          id: element.id,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          hasBox: rect.width > 0 && rect.height > 0,
          inViewport:
            rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth,
        };
      });
      assert.notEqual(focused.outlineStyle, "none", "键盘操作控件应有可见焦点");
      assert.notEqual(focused.outlineWidth, "0px", "键盘操作控件应有可见焦点");
      assert.equal(focused.hasBox, true, "焦点控件应有可交互尺寸");
      if (focused.id === "theme-toggle") {
        assert.equal(focused.inViewport, true, "主题浮钮聚焦时应在视口内");
        reachedThemeToggle = true;
        break;
      }
    }
    assert.equal(reachedThemeToggle, true, "应能仅用 Tab 到达右下主题按钮");
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
            // 含 sr-only：栏目页去掉可见大标题后仍以无障碍 h1 起大纲
            const headingLevels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(heading =>
              Number(heading.tagName.slice(1)),
            );
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
        ["/archives/", "/tags/"],
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

      if (width === 1440) {
        await navigationPage.goto(host);
        await navigationPage.waitForFunction(
          () =>
            customElements.get("pagefind-modal-trigger") &&
            customElements.get("pagefind-modal") &&
            document.querySelector("pagefind-modal-trigger .pf-trigger-btn") &&
            document.querySelector("dialog.pf-modal"),
        );
        const searchTrigger = navigationPage.locator("pagefind-modal-trigger .pf-trigger-btn");
        const searchModal = navigationPage.locator("dialog.pf-modal");
        const searchInput = navigationPage.locator("pagefind-modal input");
        const waitModalOpen = async expected => {
          await navigationPage.waitForFunction(
            open => document.querySelector("dialog.pf-modal")?.open === open,
            expected,
            { timeout: 5_000 },
          );
        };

        assert.equal(await searchTrigger.count(), 1, "导航应有放大镜搜索入口");
        assert.equal(
          await navigationPage.locator('header a[href="/search/"]').count(),
          0,
          "主导航不得再是独立搜索页链",
        );

        await searchTrigger.click();
        await waitModalOpen(true);
        assert.equal(
          await searchModal.evaluate(dialog => dialog.open),
          true,
          "点击放大镜应打开搜索面板",
        );
        await navigationPage.keyboard.press("Escape");
        await waitModalOpen(false);
        assert.equal(
          await searchModal.evaluate(dialog => dialog.open),
          false,
          "Esc 应关闭搜索面板",
        );

        // 离开触发钮焦点，避免个别环境下按键被按钮吞掉
        await navigationPage.locator(".brand").focus();
        await navigationPage.keyboard.press("/");
        await waitModalOpen(true);
        assert.equal(await searchModal.evaluate(dialog => dialog.open), true, "/ 应打开搜索面板");
        await navigationPage.keyboard.press("Escape");
        await waitModalOpen(false);

        await navigationPage.evaluate(() => {
          const input = document.createElement("input");
          input.id = "search-slash-probe";
          document.body.appendChild(input);
          input.focus();
        });
        await navigationPage.keyboard.type("/");
        assert.equal(
          await navigationPage.locator("#search-slash-probe").inputValue(),
          "/",
          "输入焦点下 / 不得劫持为打开搜索",
        );
        assert.equal(
          await searchModal.evaluate(dialog => dialog.open),
          false,
          "输入焦点下 / 不得打开搜索面板",
        );
        await navigationPage.locator("#search-slash-probe").evaluate(element => element.remove());

        await searchTrigger.click();
        await waitModalOpen(true);
        await searchInput.first().waitFor({ state: "visible", timeout: 5_000 });
        await searchInput.first().fill("Markdown快速上手语法");
        const result = navigationPage
          .locator("pagefind-results a, dialog.pf-modal a")
          .filter({ hasText: /Markdown快速上手语法/ })
          .first();
        try {
          await result.waitFor({ state: "visible", timeout: 5_000 });
        } catch (error) {
          throw new Error(
            `搜索面板未返回结果：${JSON.stringify({
              markup: await navigationPage.locator("pagefind-modal").evaluate(el => el.outerHTML),
            })}`,
            { cause: error },
          );
        }
        assert.equal(new URL(await result.getAttribute("href"), host).pathname, postPath);
        await navigationPage.keyboard.press("Escape");
        await waitModalOpen(false);
      }

      for (const path of [postPath, "/tags/", "/tags/数据结构与算法/", "/archives/"]) {
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
