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

function takeFlag(args, name) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) {
      const value = args[index + 1];
      args.splice(index, 2);
      return value;
    }
  }
}

function takeRepeated(args, name) {
  const values = [];
  let value = takeFlag(args, name);
  while (value !== undefined) {
    values.push(value);
    value = takeFlag(args, name);
  }
  return values;
}

function handleApi(args) {
  const fields = takeRepeated(args, "-f");
  const path = args[0] ?? "";
  const state = loadState();
  const commit = path.match(/^repos\/([^/]+\/[^/]+)\/commits\/main$/);
  if (commit) {
    const sha = state.commits?.[commit[1]]?.main;
    if (!sha) {
      console.error(`找不到 ${commit[1]} 的 main 提交`);
      process.exit(1);
    }
    process.stdout.write(`${sha}\n`);
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
  if (sub === "list") {
    const workflow = takeFlag(args, "--workflow");
    const state = loadState();
    const runs = workflow === "publish.yml" ? state.runs : [];
    process.stdout.write(`${JSON.stringify(runs.map(({ databaseId }) => ({ databaseId })))}\n`);
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
    const tag = args.shift();
    const release = state.releases.find(item => item.tag === tag);
    if (!release) {
      console.error(`release not found: ${tag}`);
      process.exit(1);
    }
    return;
  }
  if (sub === "create") {
    const tag = args.shift();
    const title = takeFlag(args, "--title");
    const notes = takeFlag(args, "--notes");
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
    process.stdout.write(`${state.sourceRepo}\n`);
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
