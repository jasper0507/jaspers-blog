import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { build } from "./acceptance-site.ts";
import { pagefindFragmentText } from "./helpers.ts";

const exec = promisify(execFile);
const packedFiles = [
  "README.md",
  "cli.js",
  "content-paths.js",
  "create-content.js",
  "package.json",
  "post-rules.js",
  "publish-content.js",
  "shanghai-time.js",
  "shuoshuo-rules.js",
];

async function packTool(workspace: string) {
  const { stdout } = await exec("npm", [
    "pack",
    "./packages/content-tools",
    "--json",
    "--pack-destination",
    workspace,
    "--cache",
    join(workspace, "cache"),
  ]);
  const [packed] = JSON.parse(stdout);
  assert.deepEqual(
    packed.files.map((file: { path: string }) => file.path).sort(),
    [...packedFiles].sort(),
  );
  return packed;
}

async function installTool(workspace: string, content: string, packed: { filename: string }) {
  await writeFile(join(content, "package.json"), '{"private":true}');
  await exec(
    "npm",
    [
      "install",
      join(workspace, packed.filename),
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      join(workspace, "cache"),
    ],
    { cwd: content },
  );
  const manifest = JSON.parse(
    await readFile(join(content, "node_modules/@jasper-blog/content-tools/package.json"), "utf8"),
  );
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  const cli = join(content, "node_modules/.bin/jasper-content");
  return (...args: string[]) =>
    exec(cli, args, {
      cwd: content,
      env: {
        ...process.env,
        HTTP_PROXY: "http://127.0.0.1:1",
        HTTPS_PROXY: "http://127.0.0.1:1",
      },
    });
}

test("实际发行包只含内容工具，空仓延续号码且不覆盖重名文件", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "content-tools-blank-"));
  try {
    const packed = await packTool(workspace);
    const content = join(workspace, "content");
    await mkdir(content);
    const run = await installTool(workspace, content, packed);
    await assert.rejects(run("new:post", "缺失计数器"), /找不到技术文章号码计数器/);
    await writeFile(join(content, "post-next-id.json"), '{"next": 30}');
    await run("new:post", "独立创建");
    const path = join(content, "posts/独立创建.md");
    const source = await readFile(path, "utf8");
    assert.match(source, /^id: 30$/m);
    assert.match(source, /^draft: false$/m);
    assert.match(source, /^publishedAt: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00"$/m);
    await assert.rejects(run("new:post", "独立创建"), /技术文章已存在/);
    assert.equal(await readFile(path, "utf8"), source);
    await rm(path);
    await run("new:post", "删除不回收");
    assert.match(await readFile(join(content, "posts/删除不回收.md"), "utf8"), /^id: 31$/m);
    await run("new:shuoshuo");
    const [shuoshuo] = await readdir(join(content, "shuoshuo"));
    assert.match(shuoshuo, /^\d{8}-\d{6}\.md$/);
    assert.match(await readFile(join(content, "shuoshuo", shuoshuo), "utf8"), /^draft: false$/m);
    await writeFile(join(content, "post-next-id.json"), "broken");
    await assert.rejects(run("new:post", "损坏计数器"), /技术文章号码计数器无效/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("发行包在已有公开内容上创建后，既有网址、草稿排除与关于我仍成立", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "content-tools-site-"));
  try {
    const packed = await packTool(workspace);
    const content = join(workspace, "content");
    await cp("tests/fixtures/content", content, { recursive: true });
    const run = await installTool(workspace, content, packed);
    await run("new:post", "独立创建");
    const created = join(content, "posts/独立创建.md");
    assert.match(await readFile(created, "utf8"), /^id: 7$/m);
    await writeFile(
      created,
      (await readFile(created, "utf8")).replace('description: ""', 'description: "独立目录摘要"') +
        "\n独立目录正文。\n",
    );
    await run("new:shuoshuo");
    const knownShuoshuo = new Set([
      "20240101-000001.md",
      "20240101-000002.md",
      "20250101-000001.md",
      "20250102-000000.md",
      "20260102-080000.md",
      "20260103-080000.md",
    ]);
    const added = (await readdir(join(content, "shuoshuo"))).find(
      name => name.endsWith(".md") && !knownShuoshuo.has(name),
    );
    assert.ok(added);
    await writeFile(
      join(content, "shuoshuo", added),
      (await readFile(join(content, "shuoshuo", added), "utf8")) + "\n独立说说正文。\n",
    );
    await run("new:post", "独立草稿");
    const draft = join(content, "posts/独立草稿.md");
    await writeFile(
      draft,
      (await readFile(draft, "utf8"))
        .replace('description: ""', 'description: "草稿摘要"')
        .replace("draft: false", "draft: true") + "\n不可公开的草稿正文。\n",
    );
    await build(content, async output => {
      assert.match(await readFile(join(output, "posts/1/index.html"), "utf8"), /Alpha 正文/);
      assert.match(
        await readFile(join(output, "posts/2/index.html"), "utf8"),
        /视觉验收专用技术文章/,
      );
      assert.match(await readFile(join(output, "posts/7/index.html"), "utf8"), /独立目录正文/);
      assert.match(await readFile(join(output, "about/index.html"), "utf8"), /我是公开示例作者/);
      assert.match(
        await readFile(join(output, `shuoshuo/${added.slice(0, -3)}/index.html`), "utf8"),
        /独立说说正文/,
      );
      assert.match(
        await readFile(join(output, "shuoshuo/20250101-000001/index.html"), "utf8"),
        /这是发布时间最新的公开说说/,
      );
      await assert.rejects(readFile(join(output, "posts/4/index.html")));
      await assert.rejects(readFile(join(output, "posts/8/index.html")));
      const rss = await readFile(join(output, "rss.xml"), "utf8");
      const sitemap = await readFile(join(output, "sitemap-0.xml"), "utf8");
      assert.match(rss, /posts\/1\//);
      assert.match(rss, /posts\/7\//);
      assert.match(sitemap, /posts\/1\//);
      assert.match(sitemap, /posts\/7\//);
      assert.doesNotMatch(rss + sitemap, /posts\/4\/|posts\/8\/|独立草稿/);
      const indexed = await pagefindFragmentText(output);
      assert.match(indexed, /Alpha 正文/);
      assert.match(indexed, /视觉验收专用技术文章/);
      assert.match(indexed, /独立目录正文/);
      assert.doesNotMatch(indexed, /不可公开的草稿正文|独立说说正文|我是公开示例作者/);
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
