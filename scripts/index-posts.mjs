import { fileURLToPath } from "node:url";
import { indexPublishedPosts } from "./lib/index-published-posts.mjs";

await indexPublishedPosts(fileURLToPath(new URL("..", import.meta.url)));
