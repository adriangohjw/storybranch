# storybranch verification map

This directory is the maintained source for verifying storybranch's user-facing capture, approve, and review behavior. Read this index, then follow one feature file.

## Baseline preconditions

- Export `RUN_ID` and run `bun .cursor/skills/verify-storybranch/verify.ts launch` from the repo root.
- Launch prints `WORK`, `STORYBOOK_URL`, `REVIEW_PORT`, and `REPO_HEAD`. Export `STORYBOOK_URL` and `REVIEW_PORT`.
- Storybook is the repo smoke fixture: one story, `smoke--default`, Chrome viewport `1200x900`.
- `WORK` is a disposable git repo whose `.storybranch/` starts empty. Do not reuse `packages/fixture`.
- Run `bun .cursor/skills/verify-storybranch/verify.ts doctor` and require every line to start with `ok`.
- Drive only the Storybook and review ports printed by this launch.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Run the CLI through `verify.ts cli`. Keep the flags in the feature file unchanged.
- Pass `--evidence <feature-id>` so the transcript and file listings land in `artifacts/$RUN_ID/<feature-id>/`.
- Drive the review UI in a browser by role and accessible name.
- Do not pass `--open`.
- Cleanup removes `/tmp/storybranch-verify-$RUN_ID/` only. Leave `artifacts/$RUN_ID/` in place.

## Proof and skip reporting

- Capture the command or click and the resulting state.
- CLI proof is `command.txt`, `stdout.txt`, `stderr.txt`, and `exit.txt`, plus the `baseline.txt` and `actual.txt` listings.
- UI proof is an accessibility snapshot and a screenshot that shows the heading `storybranch review`, taken after the action settles.
- Mutation proof includes a second view: `report.json` or `GET /api/report`, and the baseline or actual file on disk.
- Record the feature id and the entry point with the artifacts.
- Report an unreachable entry point with the command that failed and the unmet precondition. Do not mark it verified through a different path.

## Feature entry contract

Each feature file has an H1, one paragraph, and these H2 sections in order: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify.ts`, `Gotchas`.

## Features

- [Capture a missing baseline](./capture.md) is the first `storybranch test` against the smoke story.
- [Approve baselines](./approve.md) copies that actual into `.storybranch/baseline/` from the CLI.
- [Review and accept](./review.md) compares the shot in the review UI and accepts it there.
- [Clean rerun](./clean-rerun.md) is a second `storybranch test` after the baseline exists.
