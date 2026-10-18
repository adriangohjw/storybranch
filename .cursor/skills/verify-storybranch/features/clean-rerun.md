# Clean rerun

After the smoke baseline exists, `storybranch test` screenshots the story again, matches the baseline, prints `ok`, and exits 0. It does not start a review server.

## Sub-features

- `rerun-match` exits 0 and prints `ok`.
- `rerun-report` records the shot as `unchanged`.
- `rerun-no-review` does not print a review URL.

## How to get to it (user POV)

- Run the same `storybranch test --url <storybook> --browsers chrome` command again after approve or after accepting the shot in the review UI.

## Driving it with verify.ts

Preconditions:

- `WORK/.storybranch/baseline/smoke--default__1200x900__chrome.png` exists from approve or from review accept.
- The Storybook process from launch is still the one `doctor` reports.
- If a review server is still listening on `REVIEW_PORT`, stop it with cleanup only when the journey is finished. For this feature, pass a different free `--port` only if you set `--review`. The default recipe does not pass `--review` and does not need the port to be free.

- **Rerun.** Run `bun .cursor/skills/verify-storybranch/verify.ts cli --evidence clean-rerun -- test --url "$STORYBOOK_URL" --browsers chrome --port "$REVIEW_PORT"`. Exit code is 0. Stdout is `ok`. Stderr is empty.
- **Report.** `artifacts/$RUN_ID/clean-rerun/report.json` has one entry with `"status": "unchanged"`.
- **No review offer.** Stdout does not contain `storybranch review at`.
- **Baseline unchanged in role.** `baseline.txt` still lists `smoke--default__1200x900__chrome.png`.

## Gotchas

- A human terminal is a TTY. storybranch then skips the `ok` line even when the run is clean. `verify.ts cli` is not a TTY, so `ok` is present. An empty stdout in a TTY is not a failure by itself. Check the report.
- `--review` forces a review server even when every shot is unchanged. Leave it off for this feature.
- Changing the smoke story's pixels between capture and rerun produces `pixels smoke--default__1200x900__chrome.png` and exit 1. That is a different feature. This recipe expects the story file to stay as it was at launch.
- Approving and accepting in the same `WORK` are two ways to create the baseline. The rerun proves whichever one actually wrote the file. It does not prove the path that was skipped.
