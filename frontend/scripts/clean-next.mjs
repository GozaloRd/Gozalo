import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const nextDir = join(root, ".next");
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  process.stdout.write("Removed .next\n");
} else {
  process.stdout.write("No .next to remove\n");
}

const webpackCache = join(root, "node_modules", ".cache");
if (existsSync(webpackCache)) {
  rmSync(webpackCache, { recursive: true, force: true });
  process.stdout.write("Removed node_modules/.cache\n");
}
