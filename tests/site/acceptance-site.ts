import { preview as astroPreview } from "astro";
import { execFile, type ExecFileException } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { indexPublishedPosts } from "../../scripts/lib/index-published-posts.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const astroCli = join(root, "node_modules/astro/bin/astro.mjs");
const locatorPath = join(root, "artifacts/acceptance-host.json");
const previewPort = 4321;
const previewOrigin = `http://127.0.0.1:${previewPort}`;

const ENV_DIST = "JASPER_ACCEPTANCE_DIST";
const ENV_CACHE = "JASPER_ACCEPTANCE_CACHE";
const ENV_POSTS = "JASPER_ACCEPTANCE_POSTS";
const ENV_SHUOSHUO = "JASPER_ACCEPTANCE_SHUOSHUO";

type Occupancy = {
  dist: string;
  cache: string;
  posts: string;
  shuoshuo: string;
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

function writeLocator(occupancy: Occupancy) {
  mkdirSync(dirname(locatorPath), { recursive: true });
  writeFileSync(locatorPath, `${JSON.stringify({ origin: previewOrigin, ...occupancy })}\n`);
}

function tryReadLocator(): Occupancy | undefined {
  try {
    const locator = JSON.parse(readFileSync(locatorPath, "utf8")) as Partial<Occupancy> & {
      origin?: string;
    };
    if (!locator.dist || !locator.cache || !locator.posts || !locator.shuoshuo) return undefined;
    return {
      dist: locator.dist,
      cache: locator.cache,
      posts: locator.posts,
      shuoshuo: locator.shuoshuo,
    };
  } catch {
    return undefined;
  }
}

function readLocator() {
  const occupancy = tryReadLocator();
  if (!occupancy) throw new Error("没有占用中的验收场景");
  return { origin: previewOrigin, dist: occupancy.dist };
}

function definedEnv(env: NodeJS.ProcessEnv) {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function occupancyEnv(occupancy: Occupancy) {
  return {
    POST_CONTENT_DIR: occupancy.posts,
    SHUOSHUO_CONTENT_DIR: occupancy.shuoshuo,
    [ENV_DIST]: occupancy.dist,
    [ENV_CACHE]: occupancy.cache,
    [ENV_POSTS]: occupancy.posts,
    [ENV_SHUOSHUO]: occupancy.shuoshuo,
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
  rmSync(locatorPath, { force: true });
}

function sweepStaleWorkspaces(current: string) {
  for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("jasper-blog-acceptance-")) continue;
    const workspace = join(tmpdir(), entry.name);
    if (workspace !== current) rmSync(workspace, { recursive: true, force: true });
  }
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
  const posts = process.env[ENV_POSTS] ?? "";
  const shuoshuo = process.env[ENV_SHUOSHUO] ?? "";
  if (!dist || !cache || !posts || !shuoshuo) throw new Error("验收场景缺少占用信息");
  return { dist, cache, posts, shuoshuo };
}

async function occupyAndServe() {
  const occupancy = occupancyFromEnv();
  const workspace = dirname(occupancy.dist);
  sweepStaleWorkspaces(workspace);
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
  const existing = tryReadLocator();
  if (existing) return webServerConfig(existing);

  const workspace = createWorkspace();
  const occupancy: Occupancy = {
    dist: join(workspace, "dist"),
    cache: join(workspace, "cache"),
    posts: resolveContentDirectory("tests/fixtures/posts-visual", "技术文章"),
    shuoshuo: resolveContentDirectory("tests/fixtures/shuoshuo", "说说"),
  };
  writeLocator(occupancy);
  return webServerConfig(occupancy);
}

export function origin() {
  return readLocator().origin;
}

export function dist() {
  return readLocator().dist;
}

export async function readDist(path: string) {
  assertDistPath(path);
  return readFile(join(dist(), path), "utf8");
}

export async function build(
  content: { posts: string; shuoshuo: string },
  inspect?: (distDirectory: string) => Promise<void>,
) {
  const workspace = createWorkspace();
  const occupancy: Occupancy = {
    dist: join(workspace, "dist"),
    cache: join(workspace, "cache"),
    posts: resolveContentDirectory(content.posts, "技术文章"),
    shuoshuo: resolveContentDirectory(content.shuoshuo, "说说"),
  };
  await mkdir(occupancy.dist, { recursive: true });
  await mkdir(occupancy.cache, { recursive: true });
  try {
    await runBuild(occupancy);
    if (inspect) await inspect(occupancy.dist);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export default function teardown() {
  const occupancy = tryReadLocator();
  if (occupancy) removeOccupancy(dirname(occupancy.dist));
}

if (import.meta.main) {
  occupyAndServe().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
