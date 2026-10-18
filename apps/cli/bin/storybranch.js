#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

await import(
  pathToFileURL(path.join(import.meta.dirname, "../dist/cli.js")).href
);
