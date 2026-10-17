#!/usr/bin/env bun
import pc from "picocolors";

import { capture } from "./capture.ts";
import { promoteActuals } from "./images.ts";

const [command, ...args] = Bun.argv.slice(2);

if (command === "test") {
  const url = args[args.indexOf("--url") + 1];
  if (url === undefined || url === "") {
    console.error("usage: storybranch test --url <storybook>");
    process.exit(1);
  }
  const failures = await capture(url, process.cwd());
  if (failures.length > 0) {
    if (process.stderr.isTTY) {
      console.error(`\n${pc.bold("Failures:")}`);
    }
    for (const failure of failures) {
      console.error(failure);
    }
    process.exit(1);
  }
  if (!process.stderr.isTTY) {
    console.log("ok");
  }
  process.exit(0);
}

if (command === "approve") {
  try {
    const result = await promoteActuals(process.cwd());
    console.log(
      `updated ${result.updated.length}, removed ${result.removed.length}`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  process.exit(0);
}

console.error(
  "usage: storybranch test --url <storybook> | storybranch approve"
);
process.exit(1);
