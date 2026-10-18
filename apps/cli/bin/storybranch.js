#!/usr/bin/env bun
import path from "node:path";
import { pathToFileURL } from "node:url";

await import(pathToFileURL(path.join(import.meta.dir, "../dist/cli.js")).href);
