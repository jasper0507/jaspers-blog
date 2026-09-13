import { copyFile, cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { run } from "./lib/run-command.mjs";
import { contentPaths } from "../packages/content-tools/content-paths.js";

const defaultRoot = fileURLToPath(new URL("..", import.meta.url));

function notFound(error) {
  return /not found|Could not resolve|HTTP 404/i.test(
    error instanceof Error ? error.message : String(error),
  );
}

async function copySnapshot(contentSource, outputDir) {
  const paths = contentPaths(contentSource);
  await copyFile(paths.about, join(outputDir, "about.md"));
  await copyFile(paths.counter, join(outputDir, "post-next-id.json"));
  await cp(paths.posts, join(outputDir, "posts"), { recursive: true });
  await cp(paths.shuoshuo, join(outputDir, "shuoshuo"), { recursive: true });
}

async function copyTemplate(templateDir, outputDir) {
  await copyFile(join(templateDir, "package.json"), join(outputDir, "package.json"));
  await copyFile(join(templateDir, ".gitignore"), join(outputDir, ".gitignore"));
  await copyFile(
    join(templateDir, "pin-publish-versions.js"),
    join(outputDir, "pin-publish-versions.js"),
  );
  await copyFile(join(templateDir, "README.md"), join(outputDir, "README.md"));
  await mkdir(join(outputDir, ".github/workflows"), { recursive: true });
  await copyFile(
    join(templateDir, ".github/workflows/publish.yml"),
    join(outputDir, ".github/workflows/publish.yml"),
  );
}

async function pinDependency(outputDir, tarballUrl, npmCache, env) {
  const manifest = JSON.parse(await readFile(join(outputDir, "package.json"), "utf8"));
  manifest.dependencies = {
    ...(manifest.dependencies ?? {}),
    "@jasper-blog/content-tools": tarballUrl,
  };
  await writeFile(join(outputDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", npmCache],
    { cwd: outputDir, env },
  );
}

async function applyPreparedRepo({ outputDir, contentRepo, pushUrl, env }) {
  if (!contentRepo) throw new Error("需要 contentRepo");
  const gh = args => run("gh", args, { cwd: outputDir, env });
  try {
    await gh(["repo", "view", contentRepo]);
    throw new Error(`${contentRepo} 已存在，拒绝覆盖`);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (text.includes("已存在")) throw error;
    if (!notFound(error)) throw error;
  }
  await gh([
    "repo",
    "create",
    contentRepo,
    "--private",
    "--description",
    "Jasper's Blog 私有内容仓",
  ]);
  await gh(["api", "-X", "PUT", `repos/${contentRepo}/actions/permissions`, "-F", "enabled=false"]);
  await run("git", ["init", "-b", "main"], { cwd: outputDir, env });
  await run("git", ["remote", "add", "origin", pushUrl ?? `git@github.com:${contentRepo}.git`], {
    cwd: outputDir,
    env,
  });
  await run("git", ["add", "-A"], { cwd: outputDir, env });
  await run("git", ["commit", "-m", "初始化内容仓快照"], { cwd: outputDir, env });
  await run("git", ["push", "-u", "origin", "HEAD:main"], { cwd: outputDir, env });
}

/** @param {Record<string, unknown>} [options] */
export async function prepareContentRepo({
  contentSource,
  templateDir = join(defaultRoot, "packages/content-tools/content-repo"),
  outputDir,
  tarballUrl,
  npmCache,
  applyRemote = false,
  contentRepo,
  pushUrl,
  env = process.env,
} = {}) {
  if (!contentSource || !outputDir) throw new Error("需要 contentSource 和 outputDir");
  if (!tarballUrl) throw new Error("需要发行资源地址");
  const url = new URL(tarballUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("发行资源必须是无凭据的 HTTP(S) 地址");
  }
  if (applyRemote && !/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(contentRepo ?? "")) {
    throw new Error("内容仓标识必须为 owner/repo");
  }
  await mkdir(outputDir, { recursive: true });
  if ((await readdir(outputDir)).length) throw new Error("输出目录已存在且非空，拒绝覆盖");
  await copySnapshot(contentSource, outputDir);
  await copyTemplate(templateDir, outputDir);

  await pinDependency(
    outputDir,
    tarballUrl,
    npmCache ?? join(tmpdir(), "jasper-content-npm-cache"),
    env,
  );

  if (applyRemote) {
    await applyPreparedRepo({ outputDir, contentRepo, pushUrl, env });
  }
}

async function main() {
  const { values, tokens } = parseArgs({
    options: {
      content: { type: "string" },
      output: { type: "string" },
      "tarball-url": { type: "string" },
      repo: { type: "string" },
      apply: { type: "boolean" },
    },
    tokens: true,
  });
  const seen = new Set();
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name)) throw new Error(`重复参数 --${token.name}`);
    seen.add(token.name);
  }
  await prepareContentRepo({
    contentSource: values.content ?? join(defaultRoot, "src/content"),
    outputDir: values.output,
    tarballUrl: values["tarball-url"],
    contentRepo: values.repo ?? "jasper0507/blog-content",
    applyRemote: values.apply,
  });
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
