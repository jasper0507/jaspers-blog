import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./lib/run-command.mjs";

const defaultRoot = fileURLToPath(new URL("..", import.meta.url));

function notFound(error) {
  return /not found|HTTP 404/i.test(error instanceof Error ? error.message : String(error));
}

/** @param {{ root?: string, packDestination?: string, env?: NodeJS.ProcessEnv }} [options] */
export async function releaseContentTools({
  root = defaultRoot,
  packDestination = root,
  env = process.env,
} = {}) {
  const gh = args => run("gh", args, { cwd: root, env });
  const { stdout } = await run(
    "npm",
    ["pack", "./packages/content-tools", "--json", "--pack-destination", packDestination],
    { cwd: root, env },
  );
  const [packed] = JSON.parse(stdout);
  const version = JSON.parse(
    await readFile(join(root, "packages/content-tools/package.json"), "utf8"),
  ).version;
  const tag = `content-tools-v${version}`;
  const filename = packed.filename;
  const tarballPath = join(packDestination, filename);
  const nameWithOwner = (
    await gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])
  ).stdout.trim();
  const assetUrl = `https://github.com/${nameWithOwner}/releases/download/${tag}/${filename}`;

  try {
    await gh(["release", "view", tag]);
  } catch (error) {
    if (!notFound(error)) throw error;
    await gh([
      "release",
      "create",
      tag,
      tarballPath,
      "--title",
      `content-tools ${version}`,
      "--notes",
      "内容创建与发布工具。仅含 CLI，不含网站页面、Astro 或整站依赖。",
    ]);
    return { version, tag, filename, tarballPath, assetUrl, uploaded: true };
  }
  throw new Error(`已发布 ${tag}，拒绝覆盖同版本资源`);
}

if (import.meta.main) {
  releaseContentTools()
    .then(result => {
      console.log(result.assetUrl);
    })
    .catch(error => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
