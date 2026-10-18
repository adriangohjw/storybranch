#!/usr/bin/env bun
import { capture } from "@storybranch/core/capture";
import { promoteActuals } from "@storybranch/core/images";
import { reportHasAttention } from "@storybranch/report";
import pc from "picocolors";

import { reviewUiBuilt } from "@/review-server.ts";
import {
  openBrowser,
  reviewPortFromEnv,
  runForegroundReview,
  spawnDetachedReview,
} from "@/review-spawn.ts";

const [command, ...args] = Bun.argv.slice(2);

const usage = `storybranch — local visual diffs for Storybook 10+

Install as a dev dependency. Typical package scripts:
  visual          storybranch test --url <storybook>
  visual:review   storybranch review
  visual:approve  storybranch approve

  storybranch test --url <storybook> [--open] [--review] [--port <n>]
  storybranch review [--open] [--once] [--port <n>]
  storybranch approve

test exits 1 when a snapshot needs attention:
  missing baseline <file.png>
  pixels <file.png>
  size <file.png>
  stale <file.png>
A clean run prints ok. Inventory: .storybranch/report.json
Commit .storybranch/baseline/. Ignore actual/, diff/, and report.json.
The first run is missing baseline for every shot. approve copies actuals into baseline/.
review and --open are for a person. Read the report and run approve only when asked to accept.
`;

if (command === undefined || command === "--help" || command === "-h") {
  console.log(usage);
  process.exit(0);
}

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
    console.error(
      "usage: storybranch test --url <storybook> [--open] [--review] [--port <n>]\nrun storybranch --help for exit codes and the files to commit"
    );
    process.exit(1);
  }

  const { failures, report } = await capture(url, process.cwd());
  const attention = reportHasAttention(report);
  const offerReview = attention || flag("--review");
  const port = portFromArgs();

  if (offerReview) {
    if (await reviewUiBuilt()) {
      spawnDetachedReview(process.cwd(), port, false);
      const reviewUrl = `http://127.0.0.1:${port}`;
      console.log(`storybranch review at ${reviewUrl}`);

      if (flag("--open")) {
        openBrowser(reviewUrl);
      }
    } else {
      console.error(
        `${pc.yellow("review UI is not built")}; run ${pc.cyan("bun run build")}`
      );
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

console.error(usage);

process.exit(1);
