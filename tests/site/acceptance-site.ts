import { preview as astroPreview } from "astro";
import { execFile, type ExecFileException } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync, statSync } from "node:fs";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { indexPublishedPosts } from "../../scripts/lib/index-published-posts.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const astroCli = join(root, "node_modules/astro/bin/astro.mjs");
const previewPort = 4321;
const previewOrigin = `http://127.0.0.1:${previewPort}`;

const ENV_DIST = "JASPER_ACCEPTANCE_DIST";
const ENV_CACHE = "JASPER_ACCEPTANCE_CACHE";
const ENV_CONTENT = "JASPER_ACCEPTANCE_CONTENT";

type Occupancy = {
  dist: string;
  cache: string;
  content: string;
};

function commandError(error: unknown) {
  const execError = error as ExecFileException & { stdout?: string; stderr?: string };
  return Object.assign(
    new Error(`${execError.stdout ?? ""}${execError.stderr ?? ""}${execError.message}`),
    { cause: error },
  );
}

function resolveContentDirectory(path: string, label: string) {
  if (!path) throw new Error(`${label}目录不能为空`);
  const resolved = resolve(root, path);
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
    throw new Error(`找不到${label}目录：${path}`);
  }
  return resolved;
}

function assertDistPath(path: string) {
  if (!path || isAbsolute(path) || path.split(/[\\/]/).includes("..")) {
    throw new Error(`验收产物路径无效：${path}`);
  }
}

function definedEnv(env: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function occupancyEnv(occupancy: Occupancy) {
  return {
    BLOG_CONTENT_DIR: occupancy.content,
    [ENV_DIST]: occupancy.dist,
    [ENV_CACHE]: occupancy.cache,
    [ENV_CONTENT]: occupancy.content,
  };
}

async function runBuild(occupancy: Occupancy) {
  const options = {
    cwd: root,
    env: { ...definedEnv(process.env), ...occupancyEnv(occupancy) },
    encoding: "utf8" as const,
    maxBuffer: 20 * 1024 * 1024,
  };
  try {
    await execFileAsync(process.execPath, [join(root, "scripts/check-site-markdown.mjs")], options);
    await execFileAsync(process.execPath, [astroCli, "build", "--force"], options);
    await indexPublishedPosts(root, occupancy.dist);
  } catch (error) {
    throw commandError(error);
  }
}

function removeOccupancy(workspace: string) {
  rmSync(workspace, { recursive: true, force: true });
}

async function runPreview() {
  const server = await astroPreview({
    root,
    server: { host: "127.0.0.1", port: previewPort },
  });
  await new Promise<void>(resolveWait => {
    const stop = () => {
      void server.stop().finally(resolveWait);
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}

function occupancyFromEnv(): Occupancy {
  const dist = process.env[ENV_DIST] ?? "";
  const cache = process.env[ENV_CACHE] ?? "";
  const content = process.env[ENV_CONTENT] ?? "";
  if (!dist || !cache || !content) throw new Error("验收场景缺少占用信息");
  return { dist, cache, content };
}

async function occupyAndServe() {
  const occupancy = occupancyFromEnv();
  const workspace = dirname(occupancy.dist);
  const cleanup = () => removeOccupancy(workspace);
  process.on("exit", cleanup);
  await mkdir(occupancy.dist, { recursive: true });
  await mkdir(occupancy.cache, { recursive: true });
  try {
    await runBuild(occupancy);
    await runPreview();
  } finally {
    cleanup();
  }
}

function createWorkspace() {
  return join(tmpdir(), `jasper-blog-acceptance-${process.pid}-${randomBytes(4).toString("hex")}`);
}

function webServerConfig(occupancy: Occupancy) {
  const env = { ...definedEnv(process.env), ...occupancyEnv(occupancy) };
  Object.assign(process.env, occupancyEnv(occupancy));
  return {
    webServer: {
      command: `${process.execPath} ${fileURLToPath(import.meta.url)}`,
      url: `${previewOrigin}/`,
      reuseExistingServer: false as const,
      timeout: 240_000,
      cwd: root,
      stdout: "pipe" as const,
      stderr: "pipe" as const,
      env,
    },
    globalTeardown: fileURLToPath(import.meta.url),
  };
}

export function preview() {
  // 配置进程、webServer 与测试 worker 通过继承环境共享本次场景，跨运行不共享。
  if (process.env[ENV_DIST]) return webServerConfig(occupancyFromEnv());

  const workspace = createWorkspace();
  const occupancy: Occupancy = {
    dist: join(workspace, "dist"),
    cache: join(workspace, "cache"),
    content: resolveContentDirectory("tests/fixtures/content", "公开示例内容"),
  };
  return webServerConfig(occupancy);
}

export function origin() {
  occupancyFromEnv();
  return previewOrigin;
}

export function dist() {
  return occupancyFromEnv().dist;
}

export async function readDist(path: string) {
  assertDistPath(path);
  return readFile(join(dist(), path), "utf8");
}

export async function build(
  content: string | { posts: string; shuoshuo: string },
  inspect?: (distDirectory: string) => Promise<void>,
) {
  const workspace = createWorkspace();
  const occupancy: Occupancy = {
    dist: join(workspace, "dist"),
    cache: join(workspace, "cache"),
    content:
      typeof content === "string"
        ? resolveContentDirectory(content, "内容")
        : join(workspace, "content"),
  };
  await mkdir(occupancy.dist, { recursive: true });
  await mkdir(occupancy.cache, { recursive: true });
  try {
    if (typeof content !== "string") {
      await mkdir(occupancy.content);
      await cp(
        resolveContentDirectory(content.posts, "技术文章"),
        join(occupancy.content, "posts"),
        { recursive: true },
      );
      await cp(
        resolveContentDirectory(content.shuoshuo, "说说"),
        join(occupancy.content, "shuoshuo"),
        { recursive: true },
      );
      await cp(
        resolve(root, content.posts, "../post-next-id.json"),
        join(occupancy.content, "post-next-id.json"),
      );
      await cp(join(root, "tests/fixtures/content/about.md"), join(occupancy.content, "about.md"));
    }
    await runBuild(occupancy);
    if (inspect) await inspect(occupancy.dist);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export default function teardown() {
  if (process.env[ENV_DIST]) removeOccupancy(dirname(occupancyFromEnv().dist));
}

if (import.meta.main) {
  occupyAndServe().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
