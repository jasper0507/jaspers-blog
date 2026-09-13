#!/usr/bin/env node
import { createContent } from "./create-content.js";
import { publishContent } from "./publish-content.js";

const args = process.argv.slice(2);
try {
  if (args[0] === "publish") await publishContent(process.cwd(), args.slice(1));
  else await createContent(process.cwd(), args);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
