# CI

storybranch in CI is a test: build Storybook, capture, exit 1 when a snapshot needs attention. Approval stays on a machine where someone can run `storybranch review`. There is no hosted review URL.

The published command needs **Node.js 22.18+**. This recipe uses npm. pnpm and bun use the same flags (`pnpm exec` / `bunx` in place of `npx`).

Copy [`examples/github-actions/visual-regression.yml`](../examples/github-actions/visual-regression.yml) and [`scripts/ci/storybranch-pr-comment.mjs`](../scripts/ci/storybranch-pr-comment.mjs).

## What the workflow does

1. Check out the repo with full history so `--only-changed` can find the merge base (`fetch-depth: 0`).
2. `npm ci`.
3. `npx playwright install --with-deps chromium`. GitHub-hosted runners need the system libraries (`--with-deps`). The package postinstall only installs Chromium when the package manager runs lifecycle scripts.
4. `npx storybook build`, which writes `storybook-static/`.
5. `npx storybranch test --build --exit-once`.
   - Pull requests add `--only-changed`.
   - Pushes to `main` capture every story.
6. On failure, upload one artifact named `storybranch-visual`: `.storybranch/report.json`, `actual/`, and `diff/`. Baselines stay in git and are not uploaded.
7. On a failed pull request from this repository, update one comment marked `<!-- storybranch-visual -->`. Fork pull requests do not get that token.

`--exit-once` skips the review server. Without it, a failed run starts that server and the job can sit until timeout. Do not pass `--review` or `--open` in CI.

`--only-changed` compares stories touched since the base ref (`GITHUB_BASE_REF` on `pull_request`, otherwise `origin/main`). A workflow or lockfile change still captures every story. To limit by an explicit list, pass `--changed-files` (comma-separated paths or `@changed.txt`, one path per line). The template does not wire a paths filter.

Capture Chrome only in the template. More browsers:

```bash
npx playwright install --with-deps firefox msedge webkit
npx storybranch test --build --exit-once --browsers chrome,firefox,edge,safari
```

`safari` is Playwright WebKit, not Apple Safari. Linux screenshots do not match macOS. Commit baselines from the same OS as CI.

The check fails on `new`, `changed`, `stale`, and `error`, including a first run with no baselines. Update `.storybranch/baseline/` locally (`storybranch approve` or the review UI) and commit it. CI does not accept snapshots.

## Monorepos

Each Storybook package has its own `.storybranch/`. Run from that package, or from the repo root:

```bash
npx storybook build --config-dir apps/web/.storybook --output-dir apps/web/storybook-static
npx storybranch test --build --cwd apps/web --exit-once
```

`STORYBRANCH_ROOT` is the same as `--cwd` for every command. `--cwd` wins when both are set.

Point the artifact `path` at that package (for example `apps/web/.storybranch/report.json`, `apps/web/.storybranch/actual`, `apps/web/.storybranch/diff`).

## After a failure

Download `storybranch-visual`, unpack it into the Storybook package, and run `storybranch review`. The comment lists shots that need attention and links to the workflow run.

## Hosted review (self-deployed)

When `STORYBRANCH_PROJECT_TOKEN` (or `--project-token`) **and** `STORYBRANCH_API_URL` (or `--api-url`) are set, `storybranch test` fetches that project's hosted baselines, diffs locally, uploads the run, and **exits 0** after a successful capture/upload even if pixels differ. Git `.storybranch/baseline/` is not read on this path.

Copy [`examples/github-actions/hosted-visual-review.yml`](../examples/github-actions/hosted-visual-review.yml). The check name is `storybranch / visual`. The workflow updates one PR comment in place. Run the app with [`apps/hosted-review/README.md`](../apps/hosted-review/README.md) (Postgres, S3, Docker Compose). Magic links use Resend. `STORYBRANCH_DANGEROUS_EMAIL_LOG=1` logs them instead.

A shareable review server and a static HTML report are not part of the **git-baseline** recipe above.

## This repository

`.github/workflows/ci.yml` runs the same capture against `packages/fixture` on the existing `push` workflow (Node runs the CLI; Bun still installs the workspace). That job captures Chrome, Firefox, Edge, and WebKit, one after another. Pushes that are not `main` pass `--only-changed`. `main` captures every story. The job is part of **✅ CI passed**.

**Hosted dogfood:** [`.github/workflows/hosted-visual-review.yml`](../.github/workflows/hosted-visual-review.yml) runs the same `packages/fixture` Storybook against a self-deployed [`apps/hosted-review`](../apps/hosted-review/README.md) instance. The job is skipped until repository variable `STORYBRANCH_API_URL` is set; capture also needs secret `STORYBRANCH_PROJECT_TOKEN`. Chrome only; pull requests pass `--only-changed`. The job exits 0 after a successful upload even when pixels differ, and updates commit status `storybranch / visual` plus one PR comment when `GITHUB_TOKEN` and `STORYBRANCH_PR_NUMBER` are available.

The sticky comment uses `gh pr list` for the branch, because this workflow does not also trigger on `pull_request` (that would run the other jobs twice). The example workflow above uses `pull_request` directly.

Baselines belong in `packages/fixture/.storybranch/baseline/` and must be produced on `ubuntu-latest` (or another Linux amd64 Playwright host). macOS captures will not match this CI job. After `bun install`, a CLI build, `playwright install --with-deps chromium firefox msedge webkit`, and `storybook build` into `packages/fixture/storybook-static`:

```bash
node apps/cli/bin/storybranch.js test --build --cwd packages/fixture \
  --browsers chrome,firefox,edge,safari --exit-once --auto-accept-changes
```

Commit the new files under `packages/fixture/.storybranch/baseline/`. `--auto-accept-changes` is for that one-time capture, not for the pull request check.
