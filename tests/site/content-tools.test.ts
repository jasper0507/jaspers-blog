import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { gunzipSync } from "node:zlib";
import { build } from "./acceptance-site.ts";

const exec = promisify(execFile);

test("实际发行包独立离线创建内容，延续号码且不覆盖重名文件", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "content-tools-"));
  try {
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
    assert.ok(
      packed.files.every((file: { path: string }) => !/^(src|node_modules)\//.test(file.path)),
    );
    const content = join(workspace, "content");
    await mkdir(content);
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
    const run = (...args: string[]) =>
      exec(cli, args, {
        cwd: content,
        env: {
          ...process.env,
          HTTP_PROXY: "http://127.0.0.1:1",
          HTTPS_PROXY: "http://127.0.0.1:1",
        },
      });
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
    const post = join(content, "posts/删除不回收.md");
    await writeFile(
      post,
      (await readFile(post, "utf8")).replace('description: ""', 'description: "独立目录摘要"') +
        "\n独立目录正文。\n",
    );
    await writeFile(
      join(content, "shuoshuo", shuoshuo),
      (await readFile(join(content, "shuoshuo", shuoshuo), "utf8")) + "\n独立说说正文。\n",
    );
    await run("new:post", "独立草稿");
    const draft = join(content, "posts/独立草稿.md");
    await writeFile(
      draft,
      (await readFile(draft, "utf8"))
        .replace('description: ""', 'description: "草稿摘要"')
        .replace("draft: false", "draft: true") + "\n不可公开的草稿正文。\n",
    );
    await writeFile(join(content, "about.md"), "我是独立内容仓的作者。\n");
    await build(content, async output => {
      assert.match(await readFile(join(output, "posts/31/index.html"), "utf8"), /独立目录正文/);
      assert.match(
        await readFile(join(output, "about/index.html"), "utf8"),
        /我是独立内容仓的作者/,
      );
      assert.match(
        await readFile(join(output, `shuoshuo/${shuoshuo.slice(0, -3)}/index.html`), "utf8"),
        /独立说说正文/,
      );
      await assert.rejects(readFile(join(output, "posts/32/index.html")));
      const rss = await readFile(join(output, "rss.xml"), "utf8");
      const sitemap = await readFile(join(output, "sitemap-0.xml"), "utf8");
      assert.match(rss, /posts\/31\//);
      assert.match(sitemap, /posts\/31\//);
      assert.doesNotMatch(rss + sitemap, /posts\/32\/|独立草稿/);
      const fragments = await Promise.all(
        (await readdir(join(output, "pagefind/fragment"))).map(async name =>
          gunzipSync(await readFile(join(output, "pagefind/fragment", name))).toString("utf8"),
        ),
      );
      const indexed = fragments.join("\n").replaceAll("\u200b", "");
      assert.match(indexed, /独立目录正文/);
      assert.doesNotMatch(indexed, /不可公开的草稿正文|独立说说正文|我是独立内容仓的作者/);
    });
    await writeFile(join(content, "post-next-id.json"), "broken");
    await assert.rejects(run("new:post", "损坏计数器"), /技术文章号码计数器无效/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
