#!/usr/bin/env node
import { createContent } from "./create-content.js";
import { publishContent } from "./publish-content.js";

const args = process.argv.slice(2);
try {
  if (args[0] === "publish") await publishContent(process.cwd(), args.slice(1));
  else if (args[0] === "new:post" || args[0] === "new:shuoshuo") {
    await createContent(process.cwd(), args);
  } else {
    throw new Error(
      '用法：jasper-content new:post "标题"、jasper-content new:shuoshuo 或 jasper-content publish',
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
