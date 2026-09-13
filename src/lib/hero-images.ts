import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const fixtureRoot = join(root, "tests/fixtures/hero-images");

const HERO_DIRECTORY = "public/images/hero";
const HERO_PUBLIC_PREFIX = "/images/hero/";

function readDirectory(directory: string) {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`找不到主视觉目录：${directory}`, { cause: error });
    }
    throw error;
  }
}

function jpegSize(buffer: Uint8Array) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return null;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xda) return null;
    const length = (buffer[offset] << 8) | buffer[offset + 1];
    if (length < 2 || offset + length > buffer.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (buffer[offset + 3] << 8) | buffer[offset + 4],
        width: (buffer[offset + 5] << 8) | buffer[offset + 6],
      };
    }
    offset += length;
  }
  return null;
}

function isThreeByTwo(width: number, height: number) {
  return Math.abs(width * 2 - height * 3) <= 3;
}

export function readHeroImages(directory = join(process.cwd(), HERO_DIRECTORY)): string[] {
  const entries = readDirectory(directory);
  if (entries.length === 0) throw new Error("主视觉目录是空的");

  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".jpg")) {
      throw new Error(`主视觉目录含有不合格条目：${entry.name}`);
    }
    names.push(entry.name);
  }
  names.sort();

  for (const name of names) {
    const size = jpegSize(readFileSync(join(directory, name)));
    if (!size) throw new Error(`主视觉不是 JPEG：${name}`);
    if (size.width < 960 || size.height < 640 || !isThreeByTwo(size.width, size.height)) {
      throw new Error(`主视觉必须是 3:2 且至少 960×640：${name}（${size.width}×${size.height}）`);
    }
  }

  return names.map(name => `${HERO_PUBLIC_PREFIX}${name}`);
}

if (import.meta.main) {
  const valid = join(fixtureRoot, "valid");
  assert.deepEqual(readHeroImages(valid), ["/images/hero/a.jpg", "/images/hero/b.jpg"]);

  assert.throws(() => readHeroImages(join(fixtureRoot, "missing-dir")), /找不到主视觉目录/);
  assert.throws(
    () => readHeroImages(join(fixtureRoot, "wrong-ratio")),
    /必须是 3:2 且至少 960×640/,
  );
  assert.throws(() => readHeroImages(join(fixtureRoot, "too-small")), /必须是 3:2 且至少 960×640/);

  const temps: string[] = [];
  try {
    const empty = await mkdtemp(join(tmpdir(), "hero-empty-"));
    temps.push(empty);
    assert.throws(() => readHeroImages(empty), /主视觉目录是空的/);

    const extra = await mkdtemp(join(tmpdir(), "hero-extra-"));
    temps.push(extra);
    await writeFile(join(extra, "ok.jpg"), await readFile(join(valid, "a.jpg")));
    await writeFile(join(extra, "notes.txt"), "nope");
    assert.throws(() => readHeroImages(extra), /不合格条目：notes.txt/);

    const jpegName = await mkdtemp(join(tmpdir(), "hero-not-jpeg-"));
    temps.push(jpegName);
    await writeFile(join(jpegName, "photo.jpg"), "not a jpeg");
    assert.throws(() => readHeroImages(jpegName), /不是 JPEG：photo.jpg/);

    const nested = await mkdtemp(join(tmpdir(), "hero-nested-"));
    temps.push(nested);
    await writeFile(join(nested, "ok.jpg"), await readFile(join(valid, "a.jpg")));
    await mkdir(join(nested, "more"));
    assert.throws(() => readHeroImages(nested), /不合格条目：more/);

    const jpegExt = await mkdtemp(join(tmpdir(), "hero-jpeg-ext-"));
    temps.push(jpegExt);
    await writeFile(join(jpegExt, "photo.jpeg"), await readFile(join(valid, "a.jpg")));
    assert.throws(() => readHeroImages(jpegExt), /不合格条目：photo.jpeg/);
  } finally {
    await Promise.all(temps.map(dir => rm(dir, { recursive: true, force: true })));
  }

  console.log("主视觉目录验收通过");
}
