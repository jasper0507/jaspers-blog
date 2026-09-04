import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const host = "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "tests/site",
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  outputDir: "artifacts/test-results",
  // 验收内容合同：webServer 先用 fixture 内容构建 dist，再起预览服务器；
  // guard 项目随后重放冲突构建，因此这里不复用旧服务器。
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4321",
    url: `${host}/`,
    reuseExistingServer: false,
    timeout: 240_000,
    cwd: root,
    env: {
      POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
      SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "fixture",
      testDir: "tests/site/fixture",
      testMatch: /\.spec\.ts$/,
    },
    {
      name: "guard",
      testDir: "tests/site/guard",
      testMatch: /\.setup\.ts$/,
      dependencies: ["fixture"],
    },
  ],
});
