import { defineConfig } from "@playwright/test";
import { preview } from "./tests/site/acceptance-site.ts";

export default defineConfig({
  testDir: "tests/site/smoke",
  outputDir: "artifacts/smoke-results",
  ...preview(),
  projects: [{ name: "firefox", use: { browserName: "firefox" } }],
});
