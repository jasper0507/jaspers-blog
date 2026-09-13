import { defineConfig } from "@playwright/test";
import { preview } from "./tests/site/acceptance-site.ts";

export default defineConfig({
  testDir: "tests/site/fixture",
  fullyParallel: true,
  outputDir: "artifacts/test-results",
  ...preview(),
});
