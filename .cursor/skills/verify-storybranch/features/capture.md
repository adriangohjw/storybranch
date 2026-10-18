# Capture a missing baseline

The first `storybranch test` against the smoke Storybook screenshots `smoke--default` in Chrome, writes an actual PNG, and exits 1 because `.storybranch/baseline/` has no matching file.

## Sub-features

- `capture-run` takes the Chrome shot and writes `.storybranch/actual/<sha>/smoke--default__1200x900__chrome.png`.
- `capture-missing` prints `missing baseline smoke--default__1200x900__chrome.png` and exits 1.
- `capture-report` writes `.storybranch/report.json` with that shot at status `new`.
- `capture-review-offer` prints `storybranch review at http://127.0.0.1:$REVIEW_PORT` and leaves a review server listening there.

## How to get to it (user POV)

- From the Storybook package, run `storybranch test --url <storybook> --browsers chrome`. The fixture script equivalent is `bun run visual`, which uses port 6006 and the default review port. This harness uses the launch ports instead.

## Driving it with verify.ts

Preconditions:

- `doctor` is all `ok`.
- `WORK` has no `.storybranch/baseline/` files.
- `REVIEW_PORT` is free.

- **Capture.** Run `bun .cursor/skills/verify-storybranch/verify.ts cli --evidence capture -- test --url "$STORYBOOK_URL" --browsers chrome --port "$REVIEW_PORT"`. Exit code is 1. Stderr contains `missing baseline smoke--default__1200x900__chrome.png`. Stdout contains `storybranch review at http://127.0.0.1:$REVIEW_PORT`.
- **Actual file.** `artifacts/$RUN_ID/capture/actual.txt` lists `smoke--default__1200x900__chrome.png` under `.storybranch/actual/<sha>/`. `baseline.txt` is empty.
- **Report.** `artifacts/$RUN_ID/capture/report.json` has one entry with `"status": "new"` and `"filename": "smoke--default__1200x900__chrome.png"`.
- **Review server.** `curl -sf "http://127.0.0.1:$REVIEW_PORT/api/report"` returns JSON whose entry status is `new`.

## Gotchas

- Exit 1 on this first run is the expected result. Treating it as a harness failure hides a successful capture.
- `packages/fixture` and the repo root are the wrong cwd. `verify.ts cli` sets `STORYBRANCH_ROOT` to `WORK`. An ad-hoc `storybranch` in the repo will write a different tree.
- The smoke fixture is one story. Unset `STORYBRANCH_FIXTURE` and the same command captures the full fixture set. This map does not prove that set.
- A TTY suppresses the `ok` line on later green runs. This feature is not a green run. Failure lines still go to stderr.
- `test` starts a detached review process. Cleanup must use the same `RUN_ID` or that process keeps `REVIEW_PORT`.
