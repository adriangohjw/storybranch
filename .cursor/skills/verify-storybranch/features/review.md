# Review and accept

The review UI lists shots from the last `report.json`, shows baseline beside this scan, and accepts a shot into `.storybranch/baseline/` from the page.

## Sub-features

- `review-open` shows the heading `storybranch review` and the smoke shot in the snapshot list.
- `review-compare` selects the Chrome shot and shows `No baseline` next to this scan.
- `review-filter` limits the list to shots that need attention, then to unchanged shots.
- `review-accept` writes the baseline from the `Accept` button.

## How to get to it (user POV)

- `storybranch test` prints `storybranch review at http://127.0.0.1:<port>` when a shot needs attention, and a detached server stays up.
- `storybranch review` serves the existing report in the foreground until Ctrl+C. `visual:review` is the fixture script name.
- `--open` is a third entry. This harness refuses it because it opens the operator's browser.

## Driving it with verify.ts

Preconditions:

- The capture feature has run in this `WORK`, and approve has not.
- `doctor` reports `review-server` ok for the pid recorded after capture.
- The browser target is `http://127.0.0.1:$REVIEW_PORT`.

- **Open.** Navigate to `http://127.0.0.1:$REVIEW_PORT`. The heading is `storybranch review`. The snapshot tree shows buttons named `smoke`, `default`, and `1200x900`, and a leaf whose name includes `new` and `chrome`.
- **Compare.** Choose the leaf that includes `chrome`. The `Baseline` figure says `No baseline`. The `This scan` figure contains an image with alt `this scan`.
- **Filter attention.** Set the `Filter` combobox to `Needs attention`. The `chrome` leaf remains.
- **Accept.** Choose the button named `Accept` next to that leaf. Filter is still `Needs attention`, so the shot leaves the list. The `unchanged` status shows up in the next step.
- **Second view.** `curl -sf "http://127.0.0.1:$REVIEW_PORT/api/report"` returns status `unchanged` for `smoke--default__1200x900__chrome.png`. The file `.storybranch/baseline/smoke--default__1200x900__chrome.png` exists under `WORK`.
- **Filter unchanged.** Set `Filter` to `Unchanged`. The list keeps a `smoke` row and closes it, because a branch with nothing left to review starts collapsed. Expand `smoke`, then `default`, then `1200x900`. The leaf name includes `unchanged` and `chrome`, and the `Accept` button is gone.
- **Filter attention empty.** Set `Filter` to `Needs attention`. The list text is `No snapshots in this filter.`
- **Proof.** Save an accessibility snapshot as `artifacts/$RUN_ID/review/accepted.aria.yml` and a screenshot as `artifacts/$RUN_ID/review/accepted.png` after accept settles. Both show `storybranch review` and `unchanged`.

## Gotchas

- `Accept all` accepts every shot that needs attention. One smoke shot makes it look like `Accept`. It is a different control. The recipe uses the per-shot `Accept` button.
- Several `Accept` buttons appear when the tree has several shots. The smoke fixture has one. Scope the click to the `chrome` row.
- `Toggle diff overlay` stays disabled on a missing baseline. There is no diff image until a later run disagrees with a baseline. Do not fail this feature for a disabled overlay.
- `storybranch review` in the foreground exits when `--once` is set and nothing needs attention. After accept, a `--once` server shuts down. The detached server from `test` stays up. Keep using that one for the filter checks.
- Refreshing the page reloads `report.json`. Accept writes the baseline immediately. A reload that still says `new` means the click did not accept.
- Branches open on their own only while they contain a shot that needs attention. After accept, Filter `Unchanged` does not show the `chrome` leaf until `smoke`, `default`, and `1200x900` are expanded.
