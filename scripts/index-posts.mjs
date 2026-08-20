import { execFile } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const postsDirectory = join(root, "dist/posts");
const seedDirectory = join(root, "dist/.pagefind-seed");

async function publishedPostCount() {
  try {
    const entries = await readdir(postsDirectory, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name)).length;
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
}

const count = await publishedPostCount();
const glob = count > 0 ? "posts/**/*.html" : ".pagefind-seed/**/*.html";

if (count === 0) {
  await mkdir(seedDirectory, { recursive: true });
  await writeFile(
    join(seedDirectory, "index.html"),
    `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>占位</title></head><body data-pagefind-body><p>占位</p></body></html>\n`,
  );
}

try {
  await execFileAsync(
    join(root, "node_modules/.bin/pagefind"),
    ["--site", "dist", "--glob", glob],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
} finally {
  await rm(seedDirectory, { recursive: true, force: true });
}
