#!/usr/bin/env bun
import pc from "picocolors";

import { capture } from "./capture.ts";
import { promoteActuals } from "./images.ts";
import { reportHasAttention } from "./report.ts";
import {
  openBrowser,
  reviewPortFromEnv,
  runForegroundReview,
  spawnDetachedReview,
} from "./review-spawn.ts";

const [command, ...args] = Bun.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(name);
}

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function portFromArgs(): number {
  const fromFlag = option("--port");
  if (fromFlag !== undefined && fromFlag !== "") {
    const port = Number(fromFlag);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      console.error(`invalid --port: ${fromFlag}`);
      process.exit(1);
    }
    return port;
  }
  return reviewPortFromEnv();
}

function projectRoot(): string {
  return process.env.STORYBRANCH_REVIEW_ROOT ?? process.cwd();
}

if (command === "test") {
  const url = option("--url");
  if (url === undefined || url === "") {
    console.error("usage: storybranch test --url <storybook> [--open] [--review]");
    process.exit(1);
  }

  const { failures, report } = await capture(url, process.cwd());
  const attention = reportHasAttention(report);
  const offerReview = attention || flag("--review");
  const port = portFromArgs();

  if (offerReview) {
    spawnDetachedReview(process.cwd(), port, false);
    const reviewUrl = `http://127.0.0.1:${port}`;
    console.log(`storybranch review at ${reviewUrl}`);
    if (flag("--open")) {
      await openBrowser(reviewUrl);
    }
  }

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

if (command === "review") {
  const code = await runForegroundReview({
    once: flag("--once"),
    open: flag("--open"),
    port: portFromArgs(),
    root: projectRoot(),
  });
  process.exit(code);
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
  "usage: storybranch test --url <storybook> [--open] [--review] | storybranch review [--open] [--once] [--port <n>] | storybranch approve"
);

process.exit(1);
