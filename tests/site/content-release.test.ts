import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { releaseContentTools } from "../../scripts/release-content-tools.mjs";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const fakeGh = fileURLToPath(new URL("./fixture/fake-gh.mjs", import.meta.url));
const packedFiles = [
  "README.md",
  "cli.js",
  "content-paths.js",
  "create-content.js",
  "package.json",
  "post-rules.js",
  "publish-content.js",
  "publish-task.js",
  "shanghai-time.js",
  "shuoshuo-rules.js",
];

async function workspace(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "content-release-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bin = join(directory, "bin");
  const statePath = join(directory, "gh-state.json");
  const logPath = join(directory, "gh-log.jsonl");
  await mkdir(bin);
  const gh = join(bin, "gh");
  await writeFile(
    gh,
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(fakeGh)} "$@"\n`,
  );
  await chmod(gh, 0o755);
  await writeFile(
    statePath,
    `${JSON.stringify({ sourceRepo: "jasper0507/jaspers-blog", releases: [] })}\n`,
  );
  return {
    directory,
    statePath,
    logPath,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_GH_STATE: statePath,
      FAKE_GH_LOG: logPath,
    },
  };
}

test("发行包只含创建与发布工具，并上传到未占用的 GitHub Release", async t => {
  const testWorkspace = await workspace(t);
  const packed = await releaseContentTools({
    root,
    packDestination: testWorkspace.directory,
    env: testWorkspace.env,
  });
  const listed = await exec("tar", ["-tzf", packed.tarballPath], { encoding: "utf8" });
  const files = listed.stdout
    .trim()
    .split("\n")
    .map(name => name.replace(/^package\//, ""))
    .filter(Boolean)
    .sort();
  const state = JSON.parse(await readFile(testWorkspace.statePath, "utf8"));
  const log = await readFile(testWorkspace.logPath, "utf8");

  assert.equal(packed.tag, "content-tools-v0.1.0");
  assert.equal(packed.filename, "jasper-blog-content-tools-0.1.0.tgz");
  assert.deepEqual(files, packedFiles);
  assert.equal(state.releases.length, 1);
  assert.equal(state.releases[0].tag, packed.tag);
  assert.ok(state.releases[0].assets.some((asset: string) => asset.endsWith(packed.filename)));
  assert.match(log, /release","create"/);
  assert.doesNotMatch(listed.stdout, /astro|content-repo|posts\/|about\.md|CLOUDFLARE|\.env/);
});

test("已发布同版本时拒绝覆盖发行资源", async t => {
  const testWorkspace = await workspace(t);
  const state = JSON.parse(await readFile(testWorkspace.statePath, "utf8"));
  state.releases.push({ tag: "content-tools-v0.1.0", assets: ["existing.tgz"] });
  await writeFile(testWorkspace.statePath, `${JSON.stringify(state)}\n`);

  await assert.rejects(
    releaseContentTools({
      root,
      packDestination: testWorkspace.directory,
      env: testWorkspace.env,
    }),
    /已发布|拒绝覆盖/,
  );

  const after = JSON.parse(await readFile(testWorkspace.statePath, "utf8"));
  assert.deepEqual(after.releases, [{ tag: "content-tools-v0.1.0", assets: ["existing.tgz"] }]);
});
