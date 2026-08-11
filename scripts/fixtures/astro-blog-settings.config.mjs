import { defineConfig } from "astro/config";
import baseConfig from "../../astro.config.mjs";
import { fileURLToPath } from "node:url";

export const fixtureFavicon = "/images/hero-light.svg";

const rawSettingsPath = fileURLToPath(new URL("../../blog.config.ts", import.meta.url));
const virtualSettings = "\0blog-settings-fixture";
const fixture = process.env.BLOG_SETTINGS_FIXTURE ?? "footer-long";
const outDirs = {
  "footer-long": "./dist-footer-long/",
  "footer-empty": "./dist-footer-empty/",
};
if (!(fixture in outDirs)) throw new Error("未知博客设置 fixture。");
const footerContent = process.env.BLOG_SETTINGS_FOOTER_CONTENT;

export default defineConfig({
  ...baseConfig,
  outDir: outDirs[fixture],
  vite: {
    ...baseConfig.vite,
    plugins: [
      ...(baseConfig.vite?.plugins ?? []),
      {
        name: "blog-settings-fixture",
        enforce: "pre",
        resolveId(source, importer) {
          if (
            source === "../../blog.config.ts" &&
            importer?.replaceAll("\\", "/").endsWith("/src/lib/site.ts")
          ) {
            return virtualSettings;
          }
        },
        load(id) {
          if (id === virtualSettings) {
            return `import settings from ${JSON.stringify(rawSettingsPath)};
export default {
  ...settings,
  site: { ...settings.site, favicon: ${JSON.stringify(fixtureFavicon)} },
  home: { ...settings.home, hero: { ...settings.home.hero, darkImage: undefined, alt: "" } },
  footer: { content: ${JSON.stringify(footerContent)} },
};`;
          }
        },
      },
    ],
  },
});
