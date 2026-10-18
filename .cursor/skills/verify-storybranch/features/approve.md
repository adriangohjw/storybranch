# Approve baselines

`storybranch approve` copies the latest actuals into `.storybranch/baseline/` and removes stale baseline files. After the smoke capture, that is one new PNG and nothing removed.

## Sub-features

- `approve-copy` copies `smoke--default__1200x900__chrome.png` from the actual directory into `.storybranch/baseline/`.
- `approve-summary` prints how many files were updated and removed.

## How to get to it (user POV)

- Run `storybranch approve` from the Storybook package after a capture. The fixture script name is `visual:approve`.

## Driving it with verify.ts

Preconditions:

- The capture feature has already run in this `WORK`.
- `artifacts/$RUN_ID/capture/report.json` shows status `new` for `smoke--default__1200x900__chrome.png`.
- `doctor` is all `ok`.

- **Approve.** Run `bun .cursor/skills/verify-storybranch/verify.ts cli --evidence approve -- approve`. Exit code is 0. Stdout is `updated 1, removed 0`.
- **Baseline file.** `artifacts/$RUN_ID/approve/baseline.txt` lists `.storybranch/baseline/smoke--default__1200x900__chrome.png`.
- **Actual still present.** `artifacts/$RUN_ID/approve/actual.txt` still lists the captured PNG. Approve copies. It does not delete actuals.

## Gotchas

- Approve with an empty actual directory still exits 0 and prints `updated 0, removed 0`. That does not prove a baseline was written. Require the baseline listing.
- Approve is global for the package. It is a different entry point from the review UI `Accept` button. Passing approve does not prove the button.
- Do not approve the repo's `packages/fixture` baselines unless the human asked to update committed shots.
