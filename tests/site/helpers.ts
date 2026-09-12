import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { blogSettings } from "../../src/lib/site.ts";
import { dist } from "./acceptance-site.ts";

export const { site: expectedSite, home: expectedHome } = blogSettings;

export function assertInOrder(source: string, needles: string[], message: string) {
  let previous = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > previous, `${message}：${needle}`);
    previous = index;
  }
}

export async function pagefindFragmentText() {
  const fragmentDir = join(dist(), "pagefind/fragment");
  const names = await readdir(fragmentDir);
  const chunks = await Promise.all(
    names
      .filter(name => name.endsWith(".pf_fragment"))
      .map(async name => gunzipSync(await readFile(join(fragmentDir, name))).toString("utf8")),
  );
  return chunks.join("\n").replaceAll("\u200b", "");
}
