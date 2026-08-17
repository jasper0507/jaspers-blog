import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";
import { assertFooterLayout, hasDarkHero, host, root, visualRoutes } from "../helpers.ts";

test.setTimeout(180_000);

for (const width of [1440, 375]) {
  for (const theme of ["light", "dark"] as const) {
    test(`${width}px ${theme} 全站截图`, async ({ browser }) => {
      await Promise.all(
        visualRoutes.map(([name]) =>
          mkdir(join(root, "artifacts/visual", name), { recursive: true }),
        ),
      );
      const context = await browser.newContext({
        viewport: { width, height: 960 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      for (const [name, path] of visualRoutes) {
        await page.goto(`${host}${path}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (path === "/") {
          const visibleHero = hasDarkHero ? `.hero-image-${theme}` : ".hero-image";
          assert.equal(
            await page.locator(visibleHero).evaluate(element => getComputedStyle(element).display),
            "block",
          );
          await assertFooterLayout(page, width);
        }
        await page.screenshot({
          path: join(root, `artifacts/visual/${name}/${name}-${width}-${theme}.png`),
          fullPage: true,
        });
      }
      await context.close();
    });
  }
}
