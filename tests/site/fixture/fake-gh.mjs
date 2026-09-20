#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

function statePath() {
  const path = process.env.FAKE_GH_STATE;
  if (!path) throw new Error("FAKE_GH_STATE 未设置");
  return path;
}

function loadState() {
  return JSON.parse(readFileSync(statePath(), "utf8"));
}

function saveState(state) {
  writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`);
}

function log(entry) {
  const path = process.env.FAKE_GH_LOG;
  if (!path) return;
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

function failIf(command) {
  const listed = process.env.FAKE_GH_FAIL ?? "";
  if (listed.split(",").includes(command)) {
    console.error(`模拟 gh ${command} 失败`);
    process.exit(1);
  }
}

function takeFlag(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    for (const name of names) {
      if (current === name) {
        const value = args[index + 1];
        args.splice(index, 2);
        return value;
      }
      if (name.startsWith("--") && current.startsWith(`${name}=`)) {
        const value = current.slice(name.length + 1);
        args.splice(index, 1);
        return value;
      }
    }
  }
}

function takeRepeated(args, names) {
  const values = [];
  let value = takeFlag(args, names);
  while (value !== undefined) {
    values.push(value);
    value = takeFlag(args, names);
  }
  return values;
}

function runFields(run) {
  return {
    databaseId: run.databaseId,
    displayTitle: run.displayTitle,
    event: run.event,
    headSha: run.headSha,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.createdAt,
    url: run.url,
  };
}

function pickJson(run, fields) {
  const body = runFields(run);
  if (fields.length === 0) return body;
  return Object.fromEntries(fields.map(field => [field, body[field]]));
}

function jsonFields(args) {
  const listed = takeFlag(args, ["--json"]) ?? "";
  return listed
    .split(",")
    .map(name => name.trim())
    .filter(Boolean);
}

function handleApi(args) {
  failIf("api");
  takeFlag(args, ["-X", "--method"]);
  const jq = takeFlag(args, ["--jq"]);
  const fields = takeRepeated(args, ["-f", "--raw-field", "-F"]);
  const path = args[0] ?? "";
  const state = loadState();
  const commit = path.match(/^repos\/([^/]+\/[^/]+)\/commits\/main$/);
  if (commit) {
    const sha = state.commits?.[commit[1]]?.main;
    if (!sha) {
      console.error(`找不到 ${commit[1]} 的 main 提交`);
      process.exit(1);
    }
    process.stdout.write(jq === ".sha" ? `${sha}\n` : `${JSON.stringify({ sha })}\n`);
    return;
  }
  const dispatch = path.match(/^repos\/([^/]+\/[^/]+)\/dispatches$/);
  if (dispatch) {
    const payload = {};
    for (const field of fields) {
      const separator = field.indexOf("=");
      const key = field.slice(0, separator);
      const value = field.slice(separator + 1);
      if (key === "event_type") payload.event_type = value;
      if (key === "client_payload[request_id]") payload.request_id = value;
    }
    state.dispatches = state.dispatches ?? [];
    state.dispatches.push({ repo: dispatch[1], ...payload });
    saveState(state);
    return;
  }
  console.error(`未模拟的 gh api ${path}`);
  process.exit(1);
}

function handleRun(args) {
  const sub = args.shift();
  takeFlag(args, ["-R", "--repo"]);
  if (sub === "list") {
    failIf("run-list");
    const workflow = takeFlag(args, ["--workflow"]);
    const commit = takeFlag(args, ["--commit"]);
    const fields = jsonFields(args);
    const state = loadState();
    let runs = state.runs;
    if (commit) runs = runs.filter(run => run.headSha === commit);
    if (workflow && workflow !== "publish.yml" && workflow !== "发布网站") runs = [];
    process.stdout.write(`${JSON.stringify(runs.map(run => pickJson(run, fields)))}\n`);
    return;
  }
  console.error(`未模拟的 gh run ${sub}`);
  process.exit(1);
}

function handleRelease(args) {
  const sub = args.shift();
  const state = loadState();
  state.releases = state.releases ?? [];
  if (sub === "view") {
    failIf("release-view");
    const tag = args.shift();
    const release = state.releases.find(item => item.tag === tag);
    if (!release) {
      console.error(`release not found: ${tag}`);
      process.exit(1);
    }
    process.stdout.write(`${JSON.stringify({ tagName: tag, url: release.url ?? "" })}\n`);
    return;
  }
  if (sub === "create") {
    failIf("release-create");
    const tag = args.shift();
    const title = takeFlag(args, ["--title", "-t"]);
    const notes = takeFlag(args, ["--notes", "-n"]);
    const assets = args.filter(item => item && !item.startsWith("-"));
    if (state.releases.some(item => item.tag === tag)) {
      console.error(`already exists: ${tag}`);
      process.exit(1);
    }
    state.releases.push({ tag, title, notes, assets });
    saveState(state);
    return;
  }
  console.error(`未模拟的 gh release ${sub}`);
  process.exit(1);
}

function handleRepo(args) {
  const sub = args.shift();
  const state = loadState();
  if (sub === "view") {
    failIf("repo-view");
    const json = takeFlag(args, ["--json"]);
    const jq = takeFlag(args, ["--jq"]);
    const name = args.find(item => item && !item.startsWith("-"));
    const sourceRepo = state.sourceRepo ?? "jasper0507/jaspers-blog";
    const nameWithOwner = name ?? sourceRepo;
    if (jq === ".nameWithOwner") {
      process.stdout.write(`${nameWithOwner}\n`);
      return;
    }
    if (json === "nameWithOwner") {
      process.stdout.write(`${JSON.stringify({ nameWithOwner })}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify({ nameWithOwner, visibility: "PRIVATE" })}\n`);
    return;
  }
  console.error(`未模拟的 gh repo ${sub}`);
  process.exit(1);
}

async function runFakeGh(argv) {
  const args = [...argv];
  log({ args });
  const command = args.shift();
  if (command === "api") {
    handleApi(args);
    return;
  }
  if (command === "run") {
    handleRun(args);
    return;
  }
  if (command === "release") {
    handleRelease(args);
    return;
  }
  if (command === "repo") {
    handleRepo(args);
    return;
  }
  console.error(`未模拟的 gh ${command}`);
  process.exit(1);
}

if (import.meta.main) {
  await runFakeGh(process.argv.slice(2));
}
