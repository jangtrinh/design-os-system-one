#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distEntry = path.join(__dirname, "../dist/index.js");
const srcEntry = path.join(__dirname, "../src/index.ts");
const tsxBin = path.join(__dirname, "../node_modules/.bin/tsx");

let executable = "node";
let args = [distEntry, ...process.argv.slice(2)];

if (!fs.existsSync(distEntry)) {
  executable = tsxBin;
  args = [srcEntry, ...process.argv.slice(2)];
}

const child = spawn(executable, args, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

