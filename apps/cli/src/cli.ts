#!/usr/bin/env bun
import { capture } from "@storybranch/core/capture";
import { promoteActuals } from "@storybranch/core/images";
import {
  resolveProjectRoot,
  resolveStartDir,
} from "@storybranch/core/project-root";
import { attentionSummary, reportHasAttention } from "@storybranch/report";
import pc from "picocolors";

import { reviewUiBuilt } from "@/review-server.ts";
import {
  openBrowser,
  reviewPortFromEnv,
  runForegroundReview,
  spawnDetachedReview,
} from "@/review-spawn.ts";

const [command, ...args] = Bun.argv.slice(2);

const usage = `storybranch — local visual diffs for Storybook

Install as a dev dependency. Typical package scripts:
  visual          storybranch test --url <storybook>
  visual:review   storybranch review
  visual:approve  storybranch approve

  storybranch test --url <storybook> [--cwd <pkg>] [--open] [--review] [--port <n>]
  storybranch review [--cwd <pkg>] [--open] [--once] [--port <n>]
  storybranch approve [--cwd <pkg>]

Run from a package that has package.json and .storybook/, or pass --cwd.
Baselines live in that package's .storybranch/baseline/ (not necessarily the git root).

test exits 1 when a snapshot needs attention.
In a terminal: a one-line summary (counts by status) and storybranch review at … when the review UI is available.
In CI / non-TTY: missing baseline <file.png>, pixels <file.png>, size <file.png>, stale <file.png> (one per snapshot).
A clean run prints ok (non-TTY stdout). Inventory: .storybranch/report.json under the package.
Commit .storybranch/baseline/. Ignore actual/, diff/, and report.json.
The first run marks every shot as new. approve copies actuals into baseline/.
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

async function packageRoot(): Promise<string> {
  const start = resolveStartDir({ flagCwd: option("--cwd") });

  try {
    return await resolveProjectRoot(start);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);

    return "";
  }
}

if (command === "test") {
  const url = option("--url");

  if (url === undefined || url === "") {
    console.error(
      "usage: storybranch test --url <storybook> [--cwd <pkg>] [--open] [--review] [--port <n>]\nrun storybranch --help for exit codes and the files to commit"
    );
    process.exit(1);
  }

  const root = await packageRoot();
  const { failures, report } = await capture(url, root);
  const attention = reportHasAttention(report);
  const offerReview = attention || flag("--review");
  const port = portFromArgs();
  let reviewAvailable = false;

  if (offerReview) {
    if (await reviewUiBuilt()) {
      spawnDetachedReview(root, port, false);
      const reviewUrl = `http://127.0.0.1:${port}`;
      console.log(`storybranch review at ${reviewUrl}`);
      reviewAvailable = true;

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
    const tty = process.stderr.isTTY;
    const summary = attentionSummary(report);

    if (tty && summary !== null) {
      console.error(`\n${summary}`);
    }

    if (!tty || !reviewAvailable) {
      for (const failure of failures) {
        console.error(failure);
      }
    }

    process.exit(1);
  }

  if (!process.stderr.isTTY) {
    console.log("ok");
  }

  process.exit(0);
}

if (command === "review") {
  const root = await packageRoot();

  const code = await runForegroundReview({
    once: flag("--once"),
    open: flag("--open"),
    port: portFromArgs(),
    root,
  });

  process.exit(code);
}

if (command === "approve") {
  const root = await packageRoot();

  try {
    const result = await promoteActuals(root);
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
