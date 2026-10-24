import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { origin, readDist } from "../acceptance-site.ts";
import { assertInOrder, expectedHome, expectedSite, pagefindFragmentText } from "../helpers.ts";

const host = origin();
const longShuoshuoSummary =
  "这是发布时间最新的公开说说。它故意使用与发布时间不同的文件名，用来确认稳定 ID 不会从可修改的时间重新推导。 这里继续放入足够长的正文，验证时间流默认只展示…";
const emojiShuoshuoSummary = `${"🙂".repeat(79)}…`;

test("公开内容合同", async () => {
  const [home, timeline, detail, archive, tags, rss, sitemap] = await Promise.all([
    readDist("index.html"),
    readDist("shuoshuo/index.html"),
    readDist("shuoshuo/20250101-000001/index.html"),
    readDist("archives/index.html"),
    readDist("tags/index.html"),
    readDist("rss.xml"),
    readDist("sitemap-0.xml"),
  ]);

  assert.match(home, /同时发布的 Alpha 技术文章/);
  const [heroImage] = expectedHome.hero.images;
  assert.ok(home.includes(heroImage));
  assert.match(home, new RegExp(`<noscript>[\\s\\S]*src="${heroImage}"`));
  // 首页说说预览长于 80 字摘要，图片在原位写成 [Image]。
  assert.match(home, /class="shuoshuo-preview"[^>]*>[\s\S]*?这是发布时间最新的公开说说。/);
  assert.ok(home.includes("一致地渲染：。 [Image] 隐藏"));
  assert.doesNotMatch(home, /<blockquote/);
  assert.doesNotMatch(
    `${home}${timeline}${archive}${tags}${rss}${sitemap}`,
    /不应公开的技术文章草稿|这是一条不应公开的草稿|草稿标签/,
  );
  assertInOrder(
    timeline,
    ['href="/shuoshuo/20260102-080000/"', 'href="/shuoshuo/20250102-000000/"'],
    "说说排序",
  );
  assertInOrder(archive, ["/posts/1/", "/posts/2/", "/posts/3/"], "文章排序");
  assertInOrder(tags, ['href="/tags/共同/"', 'href="/tags/astro/"'], "标签排序");
  assert.match(home, /href="\/shuoshuo\/20250101-000001\/"/);
  assert.match(timeline, /href="\/shuoshuo\/20250101-000001\/"/);
  assert.doesNotMatch(`${home}${timeline}${rss}`, /\/shuoshuo\/#/);
  assert.match(
    detail,
    /<link rel="canonical" href="https:\/\/jasper0507\.me\/shuoshuo\/20250101-000001\/"/,
  );
  assert.match(detail, /loading="lazy"/);
  assert.match(detail, /decoding="async"/);
  assert.match(detail, /<mark>说说<\/mark>/);
  const shortDetail = await readDist("shuoshuo/20250102-000000/index.html");
  assert.match(shortDetail, /<mark>相同<\/mark>/);
  assert.match(shortDetail, /<mark>编号较早<\/mark>/);
  assert.match(shortDetail, /name="description" content="这是相同 发布时间下编号较早的说说。"/);
  assert.ok(detail.includes(longShuoshuoSummary));
  assert.ok(rss.includes(`<link>${expectedSite.url}</link>`));
  assert.match(rss, /https:\/\/jasper0507\.me\/shuoshuo\/20250101-000001\//);
  for (const summary of [
    longShuoshuoSummary,
    "这是相同 发布时间下编号较早的说说。",
    emojiShuoshuoSummary,
    "[Image] [Image]",
  ]) {
    assert.ok(
      rss.includes(`<description>${summary}</description>`),
      `RSS 缺少说说摘要：${summary}`,
    );
  }
  for (const summary of [longShuoshuoSummary, emojiShuoshuoSummary, "[Image] [Image]"]) {
    assert.ok(timeline.includes(summary), `时间流缺少折叠摘要：${summary}`);
  }
  assert.equal((rss.match(/<item>/g) ?? []).length, 8);
  assert.doesNotMatch(sitemap, /\/search\/|\/rss\.xml|<loc>[^<]*#/);
  assert.match(sitemap, /\/shuoshuo\/20250101-000001\//);
  assert.match(home, /pagefind-modal-trigger/);
  assert.match(home, /pagefind-component-ui/);

  const searchIndex = JSON.parse(await readDist("pagefind/pagefind-entry.json"));
  assert.equal(searchIndex.languages["zh-cn"].page_count, 3);
  const corpus = await pagefindFragmentText();
  assert.match(corpus, /视觉验收专用技术文章/);
  assert.doesNotMatch(corpus, /mc\^2/);
});

test("站点壳、主题、菜单与搜索", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(host, { waitUntil: "networkidle" });
  assert.equal(await page.title(), expectedSite.title);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator(".hero-caption").textContent(), expectedHome.hero.caption);
  assert.equal(
    await page.locator(".hero-image").first().getAttribute("src"),
    expectedHome.hero.images[0],
  );

  const menuTrigger = page.locator("#article-menu-trigger");
  const menu = page.locator("#article-menu-list");
  await menuTrigger.click();
  await menu.waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await menuTrigger.evaluate(element => element === document.activeElement), true);

  await page.locator("#theme-toggle").click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");

  await page.keyboard.press("/");
  const searchInput = page.locator("pagefind-modal input").first();
  await searchInput.waitFor({ state: "visible" });
  await searchInput.fill("视觉验收专用技术文章");
  const result = page
    .locator("pagefind-results a, dialog.pf-modal a")
    .filter({ hasText: "视觉验收专用技术文章" })
    .first();
  await result.waitFor({ state: "visible" });
  assert.equal(new URL((await result.getAttribute("href")) ?? "", host).pathname, "/posts/2/");
  await page.keyboard.press("Escape");
  await searchInput.waitFor({ state: "hidden" });
});

async function paperColor(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--surface)";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
}

test("搜索面板跟随亮暗主题，短页不产生假滚动", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${host}/about/`, { waitUntil: "networkidle" });
  assert.match(await page.locator("main").innerText(), /我是公开示例作者/);

  const overflow = await page.evaluate(() => {
    const live = document.querySelector("[data-pf-sr-hidden]");
    const style = live ? getComputedStyle(live) : null;
    return {
      extra: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      top: style?.top ?? null,
      left: style?.left ?? null,
    };
  });
  assert.equal(overflow.top, "0px");
  assert.equal(overflow.left, "0px");
  assert.ok(overflow.extra <= 1, `短页多出 ${overflow.extra}px 滚动`);

  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") await page.locator("#theme-toggle").click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    await page.keyboard.press("/");
    const dialog = page.locator("dialog.pf-modal");
    await dialog.waitFor({ state: "visible" });
    const panel = await dialog.evaluate(element => getComputedStyle(element).backgroundColor);
    assert.equal(panel, await paperColor(page), `${theme} 面板`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
  }
});

test("主视觉只请求池中一张图片，主题切换不换图", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  const heroRequests: string[] = [];
  page.on("request", request => {
    if (/\/images\/hero\/[^/]+\.jpg$/.test(request.url())) {
      heroRequests.push(new URL(request.url()).pathname);
    }
  });
  await page.goto(host, { waitUntil: "networkidle" });

  const pinned = expectedHome.hero.images[0];
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>("#hero-image")?.dataset.loaded === "true",
  );
  assert.equal(await page.locator(".hero-media > img").count(), 1);
  assert.equal(await page.locator(".hero-image").getAttribute("src"), pinned);
  assert.deepEqual(heroRequests, [pinned]);

  await page.locator("#theme-toggle").click();
  assert.equal(await page.locator(".hero-image").getAttribute("src"), pinned);
  assert.deepEqual(heroRequests, [pinned]);
});

test("无脚本时显示主视觉回退图", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(host);

  assert.equal(await page.locator("#hero-image").isHidden(), true);
  const fallback = page.locator(".hero-media noscript .hero-image");
  assert.equal(await fallback.getAttribute("src"), expectedHome.hero.images[0]);
  assert.equal(await fallback.isVisible(), true);

  await context.close();
});

test("技术文章阅读能力", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${host}/posts/2/`);
  assert.ok(await page.locator(".post-body .katex").count());
  assert.equal(await page.locator(".post-body mark").textContent(), "高亮标记");
  assert.equal(await page.locator("#footnote-label").textContent(), "脚注");
  assert.ok(await page.locator('[aria-label="返回脚注引用"]').count());
  assert.ok(await page.locator('.astro-code[data-title="example.js"]').count());
  assert.ok(await page.locator(".astro-code .line.highlighted").count());
  assert.ok(await page.locator(".astro-code .line.diff.add").count());
  assert.ok(await page.locator(".astro-code .line.diff.remove").count());

  const tocLinks = page.locator('.post-toc a[href^="#"]');
  assert.deepEqual(
    await tocLinks.evaluateAll(links => links.map(link => link.getAttribute("href"))),
    ["#第一节", "#第一节子节", "#第二部分", "#第二节"],
  );
  // 缩进相对正文最高一级标题计算，本例最高为 h1。
  assert.deepEqual(
    await page
      .locator(".post-toc li")
      .evaluateAll(items => items.map(item => getComputedStyle(item).paddingLeft)),
    ["10.4px", "20.8px", "0px", "10.4px"],
  );
  await page
    .locator(".post-body h2")
    .nth(1)
    .evaluate(element =>
      scrollTo({
        top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
        behavior: "instant",
      }),
    );
  await page.waitForFunction(
    () =>
      document.querySelector('.post-toc a[aria-current="true"]')?.getAttribute("href") ===
      "#第二节",
  );

  const backToTop = page.locator("#back-to-top");
  await page.waitForFunction(
    () => document.querySelector("#back-to-top")?.getAttribute("data-visible") === "true",
  );
  await backToTop.click();
  await page.waitForFunction(() => scrollY < 8 && document.activeElement?.id === "post-title");
});

test("代码复制、图片灯箱与上下篇导读", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${host}/posts/2/`, { waitUntil: "networkidle" });

  const blocks = page.locator(".post-body .code-block");
  assert.equal(await blocks.count(), await page.locator(".post-body pre.astro-code").count());
  const diff = blocks.filter({ has: page.locator(".line.diff") });
  await diff.hover();
  const copy = diff.locator(".code-copy");
  await copy.click();
  await expect(copy).toHaveText("已复制");
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "const after = 2;");

  const figure = page.locator(".post-body .image-paragraph > img");
  assert.equal(
    await page.locator(".post-body p:not(.image-paragraph) img[data-zoomable]").count(),
    0,
  );
  await figure.click();
  const lightbox = page.locator("dialog.image-lightbox");
  await lightbox.waitFor({ state: "visible" });
  assert.equal(
    await lightbox.locator("img").getAttribute("src"),
    await figure.evaluate(image => (image as HTMLImageElement).currentSrc),
  );
  await page.keyboard.press("Escape");
  await lightbox.waitFor({ state: "hidden" });
  assert.equal(await figure.evaluate(image => image === document.activeElement), true);
  await page.keyboard.press("Enter");
  await lightbox.waitFor({ state: "visible" });
  await lightbox.click({ position: { x: 8, y: 8 } });
  await lightbox.waitFor({ state: "hidden" });

  // 列表按发布时间倒序：文章 2 的上一篇（更早）是 3，下一篇（更新）是 1。
  assert.equal(await page.locator('.post-pager a[rel="prev"]').getAttribute("href"), "/posts/3/");
  assert.equal(await page.locator('.post-pager a[rel="next"]').getAttribute("href"), "/posts/1/");
  assert.equal(await page.locator("[data-pagefind-body] .post-pager").count(), 0);

  await page.goto(`${host}/posts/1/`);
  assert.equal(await page.locator('.post-pager a[rel="next"]').count(), 0);
  assert.equal(await page.locator('.post-pager a[rel="prev"]').getAttribute("href"), "/posts/2/");
});

test("窄屏文章使用标题区折叠目录", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${host}/posts/2/`);
  const inline = page.locator(".post-toc-inline");
  assert.equal(await inline.isVisible(), true);
  assert.equal(await page.locator(".post-toc").isHidden(), true);
  assert.equal(await inline.getAttribute("data-pagefind-ignore"), "all");
  const links = inline.locator("a");
  assert.equal(await links.first().isHidden(), true);
  await inline.locator("summary").click();
  assert.deepEqual(await links.evaluateAll(items => items.map(item => item.getAttribute("href"))), [
    "#第一节",
    "#第一节子节",
    "#第二部分",
    "#第二节",
  ]);
  await links.last().click();
  await page.waitForFunction(() => decodeURIComponent(location.hash) === "#第二节");

  await page.setViewportSize({ width: 1440, height: 960 });
  assert.equal(await inline.isHidden(), true);
  assert.equal(await page.locator(".post-toc").isVisible(), true);

  await page.goto(`${host}/posts/1/`);
  assert.equal(await page.locator(".post-toc-inline").count(), 0);
});

test("归档卡片整张可点，标签详情页显示标签名", async ({ page }) => {
  await page.goto(`${host}/archives/`);
  const card = page.locator(".archive-card").filter({ hasText: "视觉验收专用技术文章" });
  const box = await card.boundingBox();
  assert.ok(box);
  // 点卡片右下角空白处，而不是标题文字。
  await page.mouse.click(box.x + box.width - 12, box.y + box.height - 8);
  await page.waitForURL(`${host}/posts/2/`);

  await page.goto(`${host}/archives/`);
  await card.locator('.post-tags a[href="/tags/共同/"]').click();
  await page.waitForURL(url => decodeURIComponent(url.pathname) === "/tags/共同/");
  const title = page.locator("#tag-title");
  assert.equal(await title.isVisible(), true);
  assert.equal((await title.innerText()).trim(), "#共同");
  assert.equal(await page.locator(".tag-header p").textContent(), "2 篇技术文章");
});

test("无目录的短文保留标题焦点且不显示回顶", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${host}/posts/1/`);
  assert.equal(await page.locator(".post-toc").count(), 0);
  assert.equal(await page.locator("#back-to-top").getAttribute("data-visible"), "false");
  const title = page.locator("#post-title");
  assert.equal(await title.getAttribute("tabindex"), "-1");
  await title.focus();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "post-title");
});

test("减少动态效果时回顶立即完成并交还标题焦点", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${host}/posts/2/`);
  await page
    .locator(".post-body h2")
    .nth(1)
    .evaluate(element =>
      scrollTo({
        top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.4,
        behavior: "instant",
      }),
    );
  const backToTop = page.locator("#back-to-top");
  await page.waitForFunction(
    () => document.querySelector("#back-to-top")?.getAttribute("data-visible") === "true",
  );
  await backToTop.click();
  await page.waitForFunction(() => scrollY < 8 && document.activeElement?.id === "post-title");
});

test("说说和移动端基本可用", async ({ page }) => {
  await page.goto(`${host}/shuoshuo/`);
  const toggle = page.locator('[data-shuoshuo-toggle="20250101-000001"]');
  const summary = page.locator('[data-shuoshuo-summary="20250101-000001"]');
  const body = page.locator("#shuoshuo-body-20250101-000001");
  await toggle.waitFor({ state: "visible" });
  assert.equal(await summary.isVisible(), true);
  assert.equal(await body.isHidden(), true);
  assert.equal(await body.getAttribute("inert"), null);
  assert.equal(
    await page.locator('a[href="/shuoshuo/20250101-000001/"]').first().isVisible(),
    true,
  );
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await summary.isHidden(), true);
  assert.equal(await body.isVisible(), true);

  const detailResponse = await page.goto(`${host}/shuoshuo/20250101-000001/`);
  assert.equal(detailResponse?.ok(), true);
  assert.equal(await page.locator("h1").textContent(), "说说 · 2026年2月3日 09:30");
  assert.equal(await page.locator("[data-shuoshuo-toggle]").count(), 0);
  assert.equal(await page.getByText("隐藏区域内的测试链接").isVisible(), true);

  await page.setViewportSize({ width: 320, height: 960 });
  for (const path of ["/", "/posts/2/"]) {
    const response = await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
    assert.equal(response?.ok(), true);
    // 页面壳只提供一个页面标题；正文允许作者使用 h1。
    assert.equal(await page.locator("h1:not(.post-body h1)").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    );

    if (path === "/") {
      const [feed, hero, header, theme, sectionLink, postLink, shuoshuoLink] = await Promise.all([
        page.locator(".home-feed").boundingBox(),
        page.locator(".hero-media").boundingBox(),
        page.locator(".site-header").boundingBox(),
        page.locator("#theme-toggle").boundingBox(),
        page.locator(".section-more").first().boundingBox(),
        page.locator(".post-preview h3 a").boundingBox(),
        page.locator("a.shuoshuo-preview").boundingBox(),
      ]);
      assert.ok(feed && hero && feed.y < hero.y, "移动端应先展示内容，再展示主视觉");
      assert.ok(
        header &&
          theme &&
          theme.y >= header.y &&
          theme.y + theme.height <= header.y + header.height,
        "移动端主题按钮应位于页头内",
      );
      const touchTargets = [
        ["分区链接", sectionLink],
        ["文章链接", postLink],
        ["说说链接", shuoshuoLink],
      ] as const;
      for (const [name, target] of touchTargets) {
        assert.ok(
          target && target.height >= 43.99,
          `${name}触控高度不得小于 44px，实际为 ${target?.height ?? "missing"}px`,
        );
      }
    }
  }
});

test("首页两区平分主视觉高度，分区线固定，正文在区头与底部链接之间按整行截断", async ({ page }) => {
  for (const width of [1440, 900]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`${host}/`, { waitUntil: "networkidle" });
    const layout = await page.evaluate(() => {
      const rect = (element: Element) => element.getBoundingClientRect();
      return {
        hero: rect(document.querySelector(".hero-media")!),
        sections: [...document.querySelectorAll(".feed-section")].map(section => ({
          top: rect(section).top,
          bottom: rect(section).bottom,
          overflow: section.scrollHeight - section.clientHeight,
          moreTop: rect(section.querySelector(".section-more")!).top,
          moreBottom: rect(section.querySelector(".section-more")!).bottom,
          text: [...section.querySelectorAll(".feed-clip p")].map(text => ({
            bottom: rect(text).bottom,
            lines: Math.round(rect(text).height / parseFloat(getComputedStyle(text).lineHeight)),
            clamp: getComputedStyle(text).webkitLineClamp,
            clipped: text.scrollHeight > text.clientHeight + 1,
          }))[0],
        })),
      };
    });
    const detail = JSON.stringify(layout);
    const [posts, shuoshuo] = layout.sections;
    assert.ok(
      Math.abs(posts.top - layout.hero.top) < 1 &&
        Math.abs(posts.bottom - shuoshuo.top) < 1 &&
        Math.abs(shuoshuo.bottom - layout.hero.bottom) < 1 &&
        Math.abs(posts.bottom - posts.top - (shuoshuo.bottom - shuoshuo.top)) < 1,
      `${width}px 下两区应平分主视觉高度：${detail}`,
    );
    assert.ok(
      Math.abs(shuoshuo.moreBottom - layout.hero.bottom) < 1,
      `${width}px 下说说区底部链接应落在主视觉下沿：${detail}`,
    );
    for (const section of layout.sections) {
      assert.ok(section.overflow <= 1, `${width}px 下分区内容不得溢出：${detail}`);
      const { text } = section;
      // 底部链接的 padding-top 就是截断后的最小间隔，正文只需不进入链接盒。
      assert.ok(
        text.bottom <= section.moreTop + 0.5,
        `${width}px 下正文不得压到底部链接：${detail}`,
      );
      // 只有被截断时，可见行数才必须等于截断行数，省略号才落在最后一行。
      if (text.clipped) {
        assert.equal(text.clamp, String(text.lines), `${width}px 下截断行数应与可见行数一致`);
      }
    }
    assert.ok(
      shuoshuo.text.lines >= 1 && shuoshuo.text.clipped,
      `${width}px 下长说说应至少显示一行并被截断`,
    );
  }
});

test("归档页与其他栏目共用对齐基准", async ({ page }) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`${host}/archives/`);
    const shell = await page.locator(".header-inner").evaluate(element => {
      const { left, width } = element.getBoundingClientRect();
      return {
        center: left + width / 2,
        gutter: getComputedStyle(document.documentElement).scrollbarGutter,
      };
    });
    const archive = await page
      .locator(".archive-card")
      .first()
      .evaluate(element => {
        const { left, right } = element.getBoundingClientRect();
        return { left, right };
      });

    await page.goto(`${host}/shuoshuo/`);
    const reference = await page
      .locator(".shuoshuo-card")
      .first()
      .evaluate(element => {
        const { left, right } = element.getBoundingClientRect();
        return { left, right };
      });

    assert.deepEqual(
      shell,
      { center: width / 2, gutter: width >= 480 ? "stable both-edges" : "auto" },
      `${width}px 视口下的公共壳居中基准`,
    );
    assert.deepEqual(archive, reference, `${width}px 视口下的内容边界`);
  }
});

test("未知路径使用站点 404", async ({ page }) => {
  const response = await page.goto(`${host}/not-a-page/`);
  assert.equal(response?.status(), 404);
  assert.equal((await page.locator("h1").textContent())?.trim(), "没有找到这个页面");
});

test("高亮链接在亮暗主题与交互状态下保持可读", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto(`${host}/shuoshuo/20250102-000000/`);
    const link = page.locator(".post-body a:has(mark)");
    assert.equal(await link.isVisible(), true);
    for (const state of ["default", "hover", "focus"]) {
      if (state === "hover") await link.hover();
      if (state === "focus") {
        await page.mouse.move(0, 0);
        await link.focus();
      }
      assert.ok(
        await link.evaluate(element =>
          getComputedStyle(element).textDecorationLine.includes("underline"),
        ),
        "高亮链接仍须保留下划线",
      );
      const { violations } = await new AxeBuilder({ page })
        .include(".post-body a:has(mark)")
        .withRules(["color-contrast"])
        .analyze();
      assert.deepEqual(violations, [], `${colorScheme} / ${state}`);
    }
  }
});

test("核心页面没有明显无障碍违规", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/",
    "/posts/2/",
    "/archives/",
    "/tags/共同/",
    "/shuoshuo/",
    "/shuoshuo/20250101-000001/",
  ]) {
    await page.goto(`${host}${path}`);
    const { violations } = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
      [],
      path,
    );
  }
});
