import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { refreshFonts } from "./fetch-fonts.mjs";

const repositoryFonts = fileURLToPath(new URL("../public/fonts", import.meta.url));
const sampleName = (await readdir(repositoryFonts)).find(name =>
  /^noto-sans-sc-.*\.woff2$/.test(name),
);
assert.ok(sampleName, "事务验收需要一份真实的 Noto Sans SC 字体样本");
const font = await readFile(join(repositoryFonts, sampleName));
const fontUrls = [1, 2, 3].map(id => `https://fonts.gstatic.com/fixture/font.${id}.woff2`);
const remoteCss = fontUrls
  .map(
    (url, index) => `@font-face {
  font-family: 'Noto Sans SC';
  src: url(${url}) format('woff2');
  unicode-range: U+${(0x4e00 + index).toString(16)};
}`,
  )
  .join("\n");

function fixtureFetch(download = () => new Response(font)) {
  return async url => {
    if (new URL(url).hostname === "fonts.googleapis.com") return new Response(remoteCss);
    const index = fontUrls.indexOf(url);
    assert.notEqual(index, -1, `意外的字体请求：${url}`);
    return download(index);
  };
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "font-refresh-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fontsDirectory = join(root, "public/fonts");
  const cssPath = join(root, "src/styles/fonts.css");
  await mkdir(fontsDirectory, { recursive: true });
  await mkdir(join(root, "src/styles"), { recursive: true });
  for (const name of [
    "source-serif-4-latin.woff2",
    "source-serif-4-latin-italic.woff2",
    "ibm-plex-sans-latin.woff2",
    "ibm-plex-mono-latin.woff2",
    "LICENSE-noto-sans-sc.txt",
    "noto-sans-sc-old.woff2",
  ]) {
    await writeFile(join(fontsDirectory, name), `原有资源：${name}`);
  }
  await writeFile(
    cssPath,
    '/* 原有样式 */ @font-face { src: url("/fonts/noto-sans-sc-old.woff2"); }',
  );
  return { root, fontsDirectory, cssPath };
}

async function directoryFiles(directory) {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [name, content] of Object.entries(await directoryFiles(path))) {
        files[join(entry.name, name)] = content;
      }
    } else {
      files[entry.name] = await readFile(path);
    }
  }
  return files;
}

async function assets({ fontsDirectory, cssPath }) {
  return { fonts: await directoryFiles(fontsDirectory), css: await readFile(cssPath) };
}

async function assertClean(root) {
  assert.deepEqual((await readdir(root)).sort(), ["public", "src"], "完成后不得留下事务文件");
}

test("字体更新使分包与 CSS 配套，并保留拉丁资源和许可", async t => {
  const target = await fixture(t);
  const before = await assets(target);
  await refreshFonts(target.root, { fetch: fixtureFetch() });
  const after = await assets(target);

  assert.equal(after.fonts["noto-sans-sc-old.woff2"], undefined, "应淘汰旧中文分包");
  for (const [name, content] of Object.entries(before.fonts)) {
    if (name !== "noto-sans-sc-old.woff2") assert.deepEqual(after.fonts[name], content);
  }
  const notoNames = Object.keys(after.fonts).filter(name => /^noto-sans-sc-.*\.woff2$/.test(name));
  assert.equal(notoNames.length, 3);
  const css = after.css.toString("utf8");
  const references = [...css.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(references.length, 7, "样式应引用四份拉丁资源和三份中文分包");
  assert.doesNotMatch(css, /https?:\/\//);
  for (const name of references) assert.ok(after.fonts[name], `样式引用缺失的字体：${name}`);
  for (const name of notoNames) {
    assert.ok(references.includes(name));
    assert.deepEqual(after.fonts[name], font);
  }
  await assertClean(target.root);
});

test("下载失败等待本批任务结束，保留全部错误且不改动旧资源", async t => {
  const target = await fixture(t);
  const before = await assets(target);
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const firstError = new Error("第一个分包下载失败");
  const laterError = new Error("另一个分包随后失败");
  let streamEnded = false;
  const pending = refreshFonts(target.root, {
    fetch: fixtureFetch(async index => {
      if (index === 0) {
        await started.promise;
        throw firstError;
      }
      if (index === 2) {
        await release.promise;
        throw laterError;
      }
      return new Response(
        new ReadableStream({
          async start(controller) {
            started.resolve();
            await release.promise;
            controller.enqueue(font);
            controller.close();
            streamEnded = true;
          },
        }),
      );
    }),
  }).then(
    () => assert.fail("下载失败应使更新失败"),
    error => ({ error, streamEnded }),
  );

  await started.promise;
  release.resolve();
  const outcome = await pending;
  assert.ok(outcome.error instanceof AggregateError);
  assert.deepEqual(outcome.error.errors, [firstError, laterError]);
  assert.equal(outcome.streamEnded, true, "失败返回时下载流必须已经结束");
  assert.deepEqual(await assets(target), before);
  await assertClean(target.root);
});

test("无效的下载内容不会替换旧字体或 CSS", async t => {
  const target = await fixture(t);
  const before = await assets(target);
  await assert.rejects(
    refreshFonts(target.root, { fetch: fixtureFetch(() => new Response("not a font")) }),
    /下载内容不是 WOFF2 字体/,
  );
  assert.deepEqual(await assets(target), before);
  await assertClean(target.root);
});

for (const [name, fails] of [
  ["备份字体", (from, _to, target) => from === target.fontsDirectory],
  ["安装字体", (_from, to, target) => to === target.fontsDirectory],
  ["备份 CSS", (from, _to, target) => from === target.cssPath],
  ["安装 CSS", (_from, to, target) => to === target.cssPath],
]) {
  test(`${name}失败时恢复旧资源并传播原始错误`, async t => {
    const target = await fixture(t);
    const before = await assets(target);
    const failure = new Error(`${name}失败`);
    let injected = false;
    await assert.rejects(
      refreshFonts(target.root, {
        fetch: fixtureFetch(),
        rename: async (from, to) => {
          if (!injected && fails(from, to, target)) {
            injected = true;
            throw failure;
          }
          await rename(from, to);
        },
      }),
      error => error === failure,
    );
    assert.deepEqual(await assets(target), before);
    await assertClean(target.root);
  });
}

test("回滚失败仍尝试恢复其他资源，并保留恢复目录和原始错误", async t => {
  const target = await fixture(t);
  const before = await assets(target);
  const installError = new Error("安装 CSS 失败");
  const rollbackError = new Error("恢复 CSS 失败");
  let installFailed = false;
  let failure;
  await assert.rejects(
    refreshFonts(target.root, {
      fetch: fixtureFetch(),
      rename: async (from, to) => {
        if (to === target.cssPath) {
          if (installFailed) throw rollbackError;
          installFailed = true;
          throw installError;
        }
        await rename(from, to);
      },
    }),
    error => {
      failure = error;
      return error instanceof AggregateError;
    },
  );

  assert.deepEqual(failure.errors, [installError, rollbackError]);
  assert.equal((await stat(failure.recoveryDirectory)).isDirectory(), true);
  const recoveryFiles = await directoryFiles(failure.recoveryDirectory);
  assert.ok(
    Object.values(recoveryFiles).some(content => content.equals(before.css)),
    "恢复目录必须保留原 CSS",
  );
  assert.deepEqual(
    await directoryFiles(target.fontsDirectory),
    before.fonts,
    "CSS 恢复失败不应阻断字体恢复",
  );
});
