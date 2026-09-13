#!/usr/bin/env node
import { createContent } from "./create-content.js";

await createContent(process.cwd(), process.argv.slice(2));
