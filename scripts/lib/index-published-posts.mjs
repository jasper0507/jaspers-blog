import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const publishedPostDirectory = /^\d+$/;

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

export async function indexPublishedPosts(root, distDirectory = join(root, "dist")) {
  const names = await publishedPostDirectories(distDirectory);
  if (names.length === 0) {
    await rm(join(distDirectory, "pagefind"), { recursive: true, force: true });
    return;
  }

  const glob =
    names.length === 1 ? `posts/${names[0]}/**/*.html` : `posts/{${names.join(",")}}/**/*.html`;

  await execFileAsync(
    join(root, "node_modules/.bin/pagefind"),
    ["--site", distDirectory, "--glob", glob],
    { cwd: root, stdio: "inherit" },
  );
}
