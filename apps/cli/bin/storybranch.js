#!/usr/bin/env bun
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.join(import.meta.dir, "..");
const source = path.join(root, "src", "cli.ts");
const bundled = path.join(root, "dist", "cli.js");
const entry = existsSync(source) ? source : bundled;

await import(pathToFileURL(entry).href);
