import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const acceptanceModule = new URL("./acceptance-site.ts", import.meta.url);

test("预览启动失败只清理自己，保留其他场景的产物", async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "acceptance-cleanup-"));
  const current = join(temporaryRoot, "jasper-blog-acceptance-preview");
  const peer = join(temporaryRoot, "jasper-blog-acceptance-guard");
  try {
    const content = join(temporaryRoot, "content");
    await cp(join(root, "tests/fixtures/content"), content, { recursive: true });
    await cp(
      join(root, "tests/fixtures/posts-invalid-math/invalid.md"),
      join(content, "posts/invalid.md"),
    );
    await mkdir(peer);
    await writeFile(join(peer, "active-build"), "仍在构建");
    await assert.rejects(
      execFileAsync(process.execPath, [fileURLToPath(acceptanceModule)], {
        cwd: root,
        env: {
          ...process.env,
          TMPDIR: temporaryRoot,
          JASPER_ACCEPTANCE_DIST: join(current, "dist"),
          JASPER_ACCEPTANCE_CACHE: join(current, "cache"),
          JASPER_ACCEPTANCE_CONTENT: content,
        },
      }),
      { stderr: /KaTeX parse error/ },
    );
    assert.equal(await readFile(join(peer, "active-build"), "utf8"), "仍在构建");
    await assert.rejects(access(current), { code: "ENOENT" });
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("独立验收进程不会复用同一个场景目录", async () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("JASPER_ACCEPTANCE_")) delete env[key];
  }
  const script = `
    import { preview, dist } from ${JSON.stringify(acceptanceModule.href)};
    preview();
    const first = dist();
    preview();
    if (dist() !== first) throw new Error("同一运行应复用场景");
    console.log(first);
  `;
  const results = await Promise.all(
    [0, 1].map(() =>
      execFileAsync(process.execPath, ["--input-type=module", "-e", script], { cwd: root, env }),
    ),
  );
  assert.notEqual(results[0].stdout.trim(), results[1].stdout.trim());
});

test("构建内容预检拒绝未选择、空或不存在的来源，不回退到源码内容", async () => {
  for (const selected of [undefined, "", "/missing-jasper-content-directory"]) {
    const env = { ...process.env };
    delete env.BLOG_CONTENT_DIR;
    if (selected !== undefined) env.BLOG_CONTENT_DIR = selected;
    await assert.rejects(
      execFileAsync(process.execPath, ["scripts/check-site-markdown.mjs"], { cwd: root, env }),
      /必须显式设置 BLOG_CONTENT_DIR|缺少内容来源或必要状态/,
    );
  }
});
