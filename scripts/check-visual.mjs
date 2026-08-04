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
const smokePaths = [
  "/",
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
          const description = document.querySelector(".post-preview-description");
          const descriptionStyle = description ? getComputedStyle(description) : null;
          const viewAllLink = document.querySelector(".section-heading a");
          const viewAllStyle = viewAllLink ? getComputedStyle(viewAllLink) : null;
          const caption = document.querySelector(".hero-caption");
          const viewAll = [...document.querySelectorAll(".section-heading a")].map(link => ({
            href: link.getAttribute("href"),
            text: link.textContent.trim(),
          }));
          const homeDate = postPreview?.querySelector("time")?.textContent?.trim() ?? "";
          const mediaRect = media.getBoundingClientRect();
          const feedRect = feed.getBoundingClientRect();
          const toggleRect = themeToggle.getBoundingClientRect();

          return {
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
      assert.notEqual(archive.cardBackground, "rgba(0, 0, 0, 0)", "归档卡片应有表面背景");
      assert.ok(
        archive.railDotDelta != null && archive.railDotDelta <= 1,
        `时间轴线应穿过圆点中心（偏差 ${archive.railDotDelta}px）`,
      );
      assert.equal(archive.scrollWidth, 1440, "归档页不得横向溢出");
      await archiveContext.close();
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
