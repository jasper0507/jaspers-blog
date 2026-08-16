import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import rawSettings from "../../blog.config.ts";
import { fixtureSettings } from "./blog-settings.mjs";

const rawSettingsPath = fileURLToPath(new URL("../../blog.config.ts", import.meta.url));
const virtualSettings = "\0blog-settings-fixture";
const fixture = process.env.BLOG_SETTINGS_FIXTURE ?? "settings";
const outDirs = {
  settings: "./dist-settings/",
};
if (!(fixture in outDirs)) throw new Error("未知博客设置 fixture。");
Object.assign(rawSettings, fixtureSettings);
const { default: baseConfig } = await import("../../astro.config.mjs");
if (baseConfig.site !== fixtureSettings.site.url) {
  throw new Error("Astro site 未从已校验博客设置读取。");
}

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
const fixtureSettings = ${JSON.stringify(fixtureSettings)};
export default {
  ...settings,
  site: fixtureSettings.site,
  author: fixtureSettings.author,
  home: fixtureSettings.home,
};`;
          }
        },
      },
    ],
  },
});
