import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = fileURLToPath(new URL("new-shuoshuo.mjs", import.meta.url));
const workingDirectory = await mkdtemp(join(tmpdir(), "newblog-shuoshuo-"));

const formatId = date =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .filter(({ type }) => type !== "literal")
    .map(({ value }) => value)
    .join("")
    .replace(/^(\d{8})(\d{6})$/, "$1-$2");

try {
  const before = new Date();
  await execFileAsync(process.execPath, [script], {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, TZ: "UTC" },
  });
  const after = new Date();
  const directory = join(workingDirectory, "src/content/shuoshuo");
  const files = await readdir(directory);

  assert.equal(files.length, 1);
  assert.match(files[0], /^\d{8}-\d{6}\.md$/);
  assert.ok(
    [formatId(before), formatId(after)].includes(files[0].replace(/\.md$/, "")),
    "文件名应使用 Asia/Shanghai 的当前秒级时间",
  );

  const source = await readFile(join(directory, files[0]), "utf8");
  const id = files[0].replace(/\.md$/, "");
  assert.match(
    source,
    new RegExp(
      `publishedAt: ${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}T${id.slice(9, 11)}:${id.slice(11, 13)}:${id.slice(13, 15)}\\+08:00`,
    ),
  );
  assert.match(source, /^draft: true$/m);
  assert.doesNotMatch(source, /^title:/m);
  assert.match(source, /在这里写说说。/);
} finally {
  await rm(workingDirectory, { recursive: true, force: true });
}

console.log("说说创建命令验收通过");
