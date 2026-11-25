import { access, cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const input = new URL("docs/", root);
const output = new URL("dist/", root);
await Promise.all(["index.html", ".nojekyll", "app.js", "assets/"].map(path => access(new URL(path, input))));
await rm(output, { recursive: true, force: true });
await mkdir(output);
await cp(input, output, { recursive: true });
console.log(`Static site staged at ${fileURLToPath(output)}`);
