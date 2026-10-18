#!/usr/bin/env bun
import { capture } from "@storybranch/core/capture";
import {
  gitChangeSet,
  loadChromaticConfig,
  testShouldFail,
} from "@storybranch/core/chromatic";
import { loadConfig, parseBrowserList } from "@storybranch/core/config";
import {
  resolveProjectRoot,
  resolveStartDir,
} from "@storybranch/core/project-root";
import { approve } from "@storybranch/core/store";
import {
  reportHasAttention,
  terminalAttentionBlock,
} from "@storybranch/report";
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

  storybranch test --url <storybook> [--browsers chrome,firefox,edge,safari] [--parallel-browsers] [--cwd <pkg>] [--open] [--review] [--port <n>]
    [--only-changed] [--exit-zero-on-changes] [--auto-accept-changes] [--exit-once]
  storybranch review [--cwd <pkg>] [--open] [--once] [--port <n>]
  storybranch approve [--cwd <pkg>]

Run from a package that has package.json and .storybook/, or pass --cwd.
Baselines live in that package's .storybranch/baseline/ (not necessarily the git root).

Chromatic scripts map onto the same command. Keep Storybook running and point --url at it.
  chromatic --project-token $CHROMATIC_PROJECT_TOKEN
    storybranch test --url http://127.0.0.1:6006
  chromatic --only-changed
    storybranch test --url http://127.0.0.1:6006 --only-changed
  chromatic --exit-zero-on-changes
    storybranch test --url http://127.0.0.1:6006 --exit-zero-on-changes
  chromatic --auto-accept-changes
    storybranch test --url http://127.0.0.1:6006 --auto-accept-changes
  chromatic --exit-once-uploaded
    storybranch test --url http://127.0.0.1:6006 --exit-once
chromatic.config.json next to .storybook/ is read for onlyChanged, externals, untraced, exitZeroOnChanges, and autoAcceptChanges. Other keys are ignored. CHROMATIC_PROJECT_TOKEN is ignored.

test exits 1 when a snapshot needs attention.
--exit-zero-on-changes and --auto-accept-changes exit 0 for visual diffs (missing baseline, pixels, size, stale). Capture errors still exit 1.
--exit-once prints the result and does not start the review server.
--only-changed captures stories whose files differ from the merge base (GITHUB_BASE_REF, then origin/HEAD, origin/main, origin/master, main, master). A non-story change captures every story. externals force a full capture. untraced paths are ignored.
In a terminal:
  N snapshots scanned · Ns build time
  N snapshots need attention · N new · N changed
  -> new: <snapshot>
  -> changed: <snapshot>
  storybranch review at … when the review UI is available.
In CI / non-TTY: missing baseline <file.png>, pixels <file.png>, size <file.png>, stale <file.png> (one per snapshot).
A clean run prints ok (non-TTY stdout). Inventory: .storybranch/report.json under the package.
Commit .storybranch/baseline/. Ignore actual/, diff/, and report.json.
The first run marks every shot as new. approve copies actuals into baseline/.
review and --open are for a person. Read the report and run approve only when asked to accept.
safari (alias webkit) launches Playwright WebKit, not Apple Safari. Install it with playwright install webkit.
Linux WebKit screenshots do not match macOS: different compositing, fonts, and image format. Pin one OS for those baselines.
Linux CI is the cheaper WebKit check. A macOS runner is the closer Safari check. Neither is iOS Safari.
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
      "usage: storybranch test --url <storybook> [--browsers chrome,firefox,edge,safari] [--parallel-browsers] [--only-changed] [--exit-zero-on-changes] [--auto-accept-changes] [--exit-once] [--cwd <pkg>] [--open] [--review] [--port <n>]\nrun storybranch --help for exit codes and the files to commit"
    );
    process.exit(1);
  }

  const root = await packageRoot();

  let config;
  let chromatic;

  try {
    config = await loadConfig(root);
    chromatic = await loadChromaticConfig(root);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (
    process.env.CHROMATIC_PROJECT_TOKEN !== undefined &&
    process.env.CHROMATIC_PROJECT_TOKEN !== ""
  ) {
    console.error(
      "CHROMATIC_PROJECT_TOKEN is ignored; storybranch does not upload builds"
    );
  }

  if (chromatic.storybookBuildDir !== undefined) {
    console.error(
      `chromatic.config.json storybookBuildDir (${chromatic.storybookBuildDir}) is ignored; pass --url`
    );
  }

  const browsersFlag = option("--browsers");
  let { browsers } = config;

  if (browsersFlag !== undefined) {
    try {
      browsers = parseBrowserList(
        browsersFlag.split(",").map((name) => name.trim())
      );
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  const onlyChanged = flag("--only-changed") || chromatic.onlyChanged;
  let changed: Awaited<ReturnType<typeof gitChangeSet>> = null;

  if (onlyChanged) {
    changed = await gitChangeSet(root);

    if (changed === null) {
      console.error(
        "onlyChanged: no merge base (set GITHUB_BASE_REF or origin/main); capturing every story"
      );
    }
  }

  const { failures, report, wroteReport } = await capture(url, root, {
    browsers,
    onlyChanged:
      changed === null
        ? undefined
        : {
            externals: chromatic.externals,
            packagePrefix: changed.packagePrefix,
            repoPaths: changed.repoPaths,
            untraced: chromatic.untraced,
          },
    parallelBrowsers: flag("--parallel-browsers") || config.captureParallel,
  });

  const autoAccept =
    flag("--auto-accept-changes") || chromatic.autoAcceptChanges;

  const exitZero =
    flag("--exit-zero-on-changes") || chromatic.exitZeroOnChanges;

  if (autoAccept && wroteReport) {
    try {
      const result = await approve(root);
      console.log(`updated ${result.updated}, removed ${result.removed}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  const attention = reportHasAttention(report) && !autoAccept;
  const offerReview = !flag("--exit-once") && (attention || flag("--review"));
  const port = portFromArgs();

  if (offerReview) {
    if (await reviewUiBuilt()) {
      spawnDetachedReview(root, port, false);
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
    const block = process.stderr.isTTY ? terminalAttentionBlock(report) : null;

    if (block === null) {
      for (const failure of failures) {
        console.error(failure);
      }
    } else {
      console.error("");

      for (const line of block) {
        console.error(line);
      }
    }

    process.exit(
      testShouldFail(failures, {
        autoAcceptChanges: autoAccept,
        exitZeroOnChanges: exitZero,
      })
        ? 1
        : 0
    );
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
    const result = await approve(root);
    console.log(`updated ${result.updated}, removed ${result.removed}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  process.exit(0);
}

console.error(usage);

process.exit(1);
