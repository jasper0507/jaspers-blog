import { defineConfig } from "@playwright/test";
import fullConfig from "./playwright.config";

export default defineConfig({
  ...fullConfig,
  testDir: "tests/site/smoke",
  outputDir: "artifacts/smoke-results",
  projects: [
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
