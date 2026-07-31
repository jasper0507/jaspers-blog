import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const astro = join(root, "node_modules/astro/bin/astro.mjs");
const temporaryDirectory = await mkdtemp(join(root, ".shuoshuo-fixture-"));
const outDir = join(temporaryDirectory, "dist");
const fixtureEnvironment = {
  ...process.env,
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
};

try {
  await execFileAsync(
    process.execPath,
    [astro, "build", "--force", "--outDir", outDir],
    { cwd: root, env: fixtureEnvironment },
  );

  const home = await readFile(join(outDir, "index.html"), "utf8");
  const timeline = await readFile(
    join(outDir, "shuoshuo/index.html"),
    "utf8",
  );
  const stableId = "20250101-000001";
  const olderId = "20260102-080000";
  const draftId = "20260103-080000";

  assert.match(home, new RegExp(`/shuoshuo/#${stableId}`));
  assert.match(home, /这是发布时间最新的公开说说/);
  assert.doesNotMatch(
    home,
    /class="post-body shuoshuo-body shuoshuo-summary"[^>]*(?:aria-hidden|inert|data-collapsed)/,
    "无脚本时首页说说应保持完整可读",
  );
  assert.doesNotMatch(home, /这是一条不应公开的草稿/);
  assert.ok(
    timeline.indexOf(stableId) < timeline.indexOf(olderId),
    "说说应按发布时间而非稳定 ID 倒序",
  );
  assert.match(timeline, new RegExp(`id="${stableId}"`));
  assert.match(timeline, /说说 · 2026年2月3日 09:30/);
  assert.match(timeline, /data-shuoshuo-toggle/);
  assert.doesNotMatch(
    timeline,
    /class="post-body shuoshuo-body"[^>]*data-collapsed/,
    "无脚本时长说说应保持完整可读",
  );
  assert.match(timeline, /https:\/\/example\.com\/fixture-photo\.jpg/);
  assert.doesNotMatch(timeline, new RegExp(draftId));
  assert.doesNotMatch(timeline, /这是一条不应公开的草稿/);

  const styles = (
    await Promise.all(
      (await readdir(join(outDir, "_astro")))
        .filter(file => file.endsWith(".css"))
        .map(file => readFile(join(outDir, "_astro", file), "utf8")),
    )
  ).join("\n");

  const browser = await chromium.launch({ headless: true });
  try {
    const homeScript = [...home.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .find(([, source]) => source.includes("shuoshuo-summary"));
    assert.ok(homeScript, "首页摘要增强脚本应内联");
    const homePage = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await homePage.route("https://example.com/**", route => route.abort());
    await homePage.setContent(home.replace(homeScript[0], ""));
    await homePage.addStyleTag({ content: styles });
    await homePage.addScriptTag({ content: homeScript[1] });
    const homeSummary = homePage.locator(".shuoshuo-summary");
    assert.equal(await homeSummary.getAttribute("inert"), "");
    assert.ok(
      (await homeSummary.evaluate(element => element.clientHeight)) <= 84,
      "首页说说摘要应保持约 5.2rem 高",
    );
    assert.match(
      await homePage.locator(".shuoshuo-preview .sr-only").textContent(),
      /这是发布时间最新的公开说说/,
    );
    await homeSummary.locator("a").focus();
    assert.equal(
      await homeSummary.locator("a").evaluate(
        element => element === document.activeElement,
      ),
      false,
    );
    await homePage.close();

    const inlineScript = [...timeline.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .find(([, source]) => source.includes("data-shuoshuo-toggle"));
    assert.ok(inlineScript, "说说展开脚本应内联到时间流页面");
    const pageMarkup = timeline.replace(inlineScript[0], "");

    for (const width of [1024, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.route("https://example.com/**", route => route.abort());
      await page.setContent(pageMarkup, {
        waitUntil: "domcontentloaded",
      });
      await page.addStyleTag({ content: styles });
      await page.addScriptTag({ content: inlineScript[1] });
      await page.evaluate(
        id => history.replaceState(null, "", `#${id}`),
        stableId,
      );
      const toggle = page.locator(`[data-shuoshuo-toggle="${stableId}"]`);
      const body = page.locator(`[id="${stableId}"] .shuoshuo-body`);
      const hiddenLink = body.locator("a");

      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `${width}px 说说页不得横向溢出`,
      );
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await body.getAttribute("inert"), "");
      await hiddenLink.focus();
      assert.equal(
        await hiddenLink.evaluate(
          element => element === document.activeElement,
        ),
        false,
      );
      await toggle.focus();
      await page.keyboard.press("Enter");
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await body.getAttribute("data-collapsed"), null);
      assert.equal(await body.getAttribute("inert"), null);
      await hiddenLink.focus();
      assert.equal(
        await hiddenLink.evaluate(
          element => element === document.activeElement,
        ),
        true,
      );
      await toggle.focus();
      assert.equal(await toggle.textContent(), "收起");
      await page.keyboard.press("Space");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await body.getAttribute("data-collapsed"), "");
      assert.equal(await toggle.textContent(), "展开");
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await execFileAsync(
    process.execPath,
    [
      astro,
      "build",
      "--force",
      "--outDir",
      join(temporaryDirectory, "production-dist"),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        SHUOSHUO_CONTENT_DIR: "./src/content/shuoshuo",
      },
    },
  );
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("说说 fixture 验收通过");
