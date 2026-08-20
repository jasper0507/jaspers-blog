import { execFile } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const publishedPostDirectory = /^\d+$/;
const seedPage = `<!doctype html><html lang="zh-cn"><head><meta charset="utf-8"><title>占位</title></head><body data-pagefind-body><p>占位</p></body></html>\n`;

async function publishedPostDirectories(distDirectory) {
  try {
    const entries = await readdir(join(distDirectory, "posts"), { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && publishedPostDirectory.test(entry.name))
      .map(entry => entry.name);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function countPublishedPostPages(distDirectory) {
  return (await publishedPostDirectories(distDirectory)).length;
}

export async function indexPublishedPosts(root, distDirectory = join(root, "dist")) {
  const seedDirectory = join(distDirectory, ".pagefind-seed");
  const names = await publishedPostDirectories(distDirectory);
  const glob =
    names.length === 0
      ? ".pagefind-seed/**/*.html"
      : names.length === 1
        ? `posts/${names[0]}/**/*.html`
        : `posts/{${names.join(",")}}/**/*.html`;

  if (names.length === 0) {
    await mkdir(seedDirectory, { recursive: true });
    await writeFile(join(seedDirectory, "index.html"), seedPage);
  }

  try {
    await execFileAsync(
      join(root, "node_modules/.bin/pagefind"),
      ["--site", distDirectory, "--glob", glob],
      { cwd: root, stdio: "inherit" },
    );
  } finally {
    await rm(seedDirectory, { recursive: true, force: true });
  }
}
