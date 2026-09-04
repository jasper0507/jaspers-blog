import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { blogSettings } from "../../src/lib/site.ts";

const execFileAsync = promisify(execFile);
export const root = fileURLToPath(new URL("../../", import.meta.url));
export const host = "http://127.0.0.1:4321";
export const { site: expectedSite, home: expectedHome } = blogSettings;
export const fixtureEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo",
};
export const tagCollisionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-tag-collision",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};
export const draftTagCollisionEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-draft-tag-collision",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};
export const invalidMathEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-invalid-math",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-empty",
};
export const invalidShuoshuoEnvironment = {
  ...process.env,
  POST_CONTENT_DIR: "./tests/fixtures/posts-visual",
  SHUOSHUO_CONTENT_DIR: "./tests/fixtures/shuoshuo-invalid-summary",
};

export async function build(environment: Record<string, string | undefined>) {
  await execFileAsync("npm", ["run", "build"], {
    cwd: root,
    env: environment,
  });
}

export function assertInOrder(source: string, needles: string[], message: string) {
  let previous = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > previous, `${message}：${needle}`);
    previous = index;
  }
}

export async function pagefindFragmentText() {
  const fragmentDir = join(root, "dist/pagefind/fragment");
  const names = await readdir(fragmentDir);
  const chunks = await Promise.all(
    names
      .filter(name => name.endsWith(".pf_fragment"))
      .map(async name => gunzipSync(await readFile(join(fragmentDir, name))).toString("utf8")),
  );
  return chunks.join("\n").replaceAll("\u200b", "");
}
