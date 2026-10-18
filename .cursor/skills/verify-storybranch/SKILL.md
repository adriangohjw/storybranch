---
name: verify-storybranch
description: Drive the storybranch CLI and localhost review UI against an isolated Storybook smoke fixture. Use when changing capture, diff, approve, review serving, or CLI flags and a user-level proof is required.
---

# Verify storybranch

storybranch is a CLI. It screenshots a running Storybook, writes PNGs under a Storybook package's `.storybranch/`, and serves a review UI when a shot needs attention. This skill drives that loop. The marketing site in `apps/web` is a separate Astro app and is outside this harness.

The fixture stories live in this repo. The package storybranch writes into does not. Every run gets a disposable package under `/tmp/storybranch-verify-$RUN_ID/` with its own git commit and empty `.storybranch/`. Storybook is the repo fixture in smoke mode (`stories-smoke/smoke.stories.tsx`, one story, `smoke--default`). Do not point the CLI at `packages/fixture` or the repo root. That writes into the checkout's `.storybranch/` tree.

Two runs can proceed together when each has its own `RUN_ID`. They must not share a Storybook port, a review port, or a work directory. This harness never binds 6006 or 4321 on purpose. Those are the documented defaults and may already belong to a human session (`bunx storybook dev -p 6006`, `storybranch review`, or `apps/web` dev, which also defaults near 4321).

## Launch

From the repo root, with Bun 1.4.3+:

```bash
RUN_ID="verify-$(date +%s)-$$"
export RUN_ID
bun .cursor/skills/verify-storybranch/verify.ts launch
```

Launch does the following, in order:

1. Installs Playwright Chromium when `chromium.executablePath()` is missing (`bunx playwright install chromium`).
2. Builds `apps/review-ui` when `apps/cli/review/public/index.html` is missing.
3. Builds `apps/cli` when `apps/cli/dist/cli.js` is missing. The `storybranch` bin loads that file.
4. Copies `packages/fixture/.storybook` into a new temp package named `storybranch-verify`, writes a private `package.json`, and creates one empty git commit. Capture stores actuals under `.storybranch/actual/<git-sha>/`, so a commit is required. The commit uses `git -c user.email=… -c user.name=…` and does not change git config.
5. Starts `bunx storybook dev` from the repo root with `STORYBRANCH_FIXTURE=smoke`, `--ci`, `--exact-port`, `--no-open`, and a free port. Logs go to `/tmp/storybranch-verify-$RUN_ID/storybook.log`.
6. Waits until `GET /index.json` lists `smoke--default`, then opens `iframe.html?id=smoke--default&viewMode=story` in Chromium and waits for `#storybook-root`.

Ready means that iframe rendered, not merely that a process is listening. Launch prints:

```text
RUN_ID=...
WORK=/tmp/storybranch-verify-.../work-...
STORYBOOK_URL=http://127.0.0.1:<storybook-port>
REVIEW_PORT=<review-port>
REPO_HEAD=<40-hex-sha>
```

`REVIEW_PORT` is reserved for this run. Pass it as `--port` on `test` and `review`. Do not pass `--open`.

If launch fails after Storybook has started, run cleanup for the same `RUN_ID` before trying again.

## Doctor

Read-only. Run it before driving whenever a port, build, or checkout looks wrong:

```bash
bun .cursor/skills/verify-storybranch/verify.ts doctor
```

It exits 0 only when all of these hold:

- `WORK` is inside `/tmp/storybranch-verify-$RUN_ID/` and its `package.json` name is `storybranch-verify`.
- That package has a 40-character git HEAD.
- The recorded Storybook pid is alive and a listener on `STORYBOOK_URL`'s port is that pid or a child.
- `GET $STORYBOOK_URL/index.json` is HTTP 200 and the body contains `smoke--default`.
- `apps/cli/review/public/index.html` and `apps/cli/dist/cli.js` exist.
- `git rev-parse HEAD` in the repo still equals `REPO_HEAD` from launch.
- `bun --version` prints a version.
- The Playwright Chromium binary exists.
- When a review pid has been recorded, that pid is alive and is listening on `REVIEW_PORT`.

Doctor does not start servers, capture shots, or write under `.storybranch/`.

## Drive

The helper runs the built CLI with cwd and `STORYBRANCH_ROOT` set to `WORK`, so project-root resolution cannot walk up into this repo.

```bash
bun .cursor/skills/verify-storybranch/verify.ts cli --evidence <feature-id> -- test --url "$STORYBOOK_URL" --browsers chrome --port "$REVIEW_PORT"
bun .cursor/skills/verify-storybranch/verify.ts cli --evidence <feature-id> -- approve
bun .cursor/skills/verify-storybranch/verify.ts cli --evidence <feature-id> -- review --port "$REVIEW_PORT"
```

`cli` prints stdout and stderr, then `exit <code>` on stderr. `test` exits 1 when any shot needs attention. That includes the first run, where every shot is `missing baseline`. A later clean run prints `ok` and exits 0. The helper is not a TTY. A human terminal is a TTY, and a clean `test` then omits the `ok` line. Assert the helper transcript, or also check `.storybranch/report.json`.

`test` detaches `storybranch review` when the run needs attention or `--review` is set, and the review UI build exists. The helper waits until something listens on `REVIEW_PORT` and records that pid for cleanup. `review` without a prior `test` stays in the foreground until Ctrl+C. Prefer the detached server that `test` already started. Do not start a second reviewer on the same port.

Browser driving uses the Cursor browser tools against `http://127.0.0.1:$REVIEW_PORT`. Stable handles in the review UI:

- Heading `storybranch review`.
- Combobox labelled `Filter`, options `All`, `Needs attention`, `Stale`, `Error`, `Unchanged`.
- Button `Accept all`.
- Button `Collapse snapshot list` (`Expand snapshot list` when collapsed).
- Snapshot tree buttons whose names are the component id `smoke`, the story `default`, and the size `1200x900`. The leaf button's accessible name includes the status (`new`, `changed`, or `unchanged`) and `chrome`.
- Button `Accept` on a shot that needs attention (`aria-label="Accept"`).
- Figcaptions `Baseline` and `This scan`. Missing baseline copy is `No baseline`. The scan image alt is `this scan`.
- Button `Toggle diff overlay` (`aria-pressed`) once a pixel diff exists. It is disabled when the shot has no diff.

`GET /api/report` returns the same inventory as `.storybranch/report.json`. Use it as a second view after a click. Do not POST `/api/accept` or `/api/accept-all` as the proof itself. Those are what the buttons call. A curl of the API after the click is the side-effect check.

Read `.cursor/skills/verify-storybranch/features/README.md` before a journey, then follow one feature file. A proof of one entry point does not cover the others.

## Evidence

Pass `--evidence <feature-id>` on every `cli` invocation. The helper writes:

`.cursor/skills/verify-storybranch/artifacts/$RUN_ID/<feature-id>/`

- `command.txt`, `stdout.txt`, `stderr.txt`, `exit.txt`
- `report.json` when the work package has one
- `baseline.txt` and `actual.txt` (`find` listings of those trees)

For the review UI, also store an accessibility snapshot and a screenshot of the same moment in that directory, taken after the click and after the UI has updated. Name them `<step>.aria.yml` and `<step>.png`. The heading `storybranch review` must be visible in the screenshot.

Proof rules:

- Exercise `storybranch test`, `approve`, or the review page. Do not call `capture()` or `promoteActuals()` from a test file and call that the proof.
- Record the command and the resulting files or UI, not only the final screen.
- A missing-baseline run is proved by stderr `missing baseline smoke--default__1200x900__chrome.png`, exit 1, a PNG under `.storybranch/actual/<sha>/`, and `report.json` status `new`.
- An approve is proved by stdout `updated 1, removed 0` and that PNG appearing under `.storybranch/baseline/`.
- A clean rerun is proved by exit 0, stdout `ok`, empty failure stderr, and every report entry `unchanged`.
- Accept in the browser is proved by the `Accept` click, then a second view: the baseline file exists and `/api/report` (or the reloaded heading and status text) shows `unchanged`.
- Chrome is the browser this harness installs. Firefox, Edge, and Safari (`webkit` is an alias) are real CLI flags. Do not claim them verified unless that browser is installed and `--browsers` included it. Safari launches Playwright WebKit, not Apple Safari. Linux WebKit screenshots do not match macOS.
- There is no dry-run mode. `test` always screenshots and writes `actual/` and `report.json`.

## Cleanup

```bash
bun .cursor/skills/verify-storybranch/verify.ts cleanup
```

Cleanup sends `SIGTERM` to the Storybook process group recorded at launch and to the review pid recorded after `test`, then `SIGKILL` if either is still alive. It deletes `/tmp/storybranch-verify-$RUN_ID/`. It does not delete `.cursor/skills/verify-storybranch/artifacts/$RUN_ID/`. It does not kill processes by name and does not touch listeners on 6006 or 4321 unless this run's recorded pid is the listener.

Run cleanup after a failed launch too, so the next attempt can reuse the `RUN_ID` only after the directory is gone. Prefer a new `RUN_ID`.

## Helpers

`verify.ts` is the harness. Invoke it with `bun` from the repo root. `RUN_ID` is required for every action.

```bash
bun .cursor/skills/verify-storybranch/verify.ts launch
bun .cursor/skills/verify-storybranch/verify.ts doctor
bun .cursor/skills/verify-storybranch/verify.ts cli --evidence capture -- test --url "$STORYBOOK_URL" --browsers chrome --port "$REVIEW_PORT"
bun .cursor/skills/verify-storybranch/verify.ts cleanup
```

`launch` prints `STORYBOOK_URL` and `REVIEW_PORT`. Export them before `cli`. The feature files are the recipes. The script does not click the review UI.
