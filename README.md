# storybranch

Local visual diffs for Storybook 10 and newer.

storybranch drives Playwright against your Storybook, saves one PNG per story (and per [Chromatic mode](https://www.chromatic.com/docs/modes/)), compares them to committed baselines, and opens a small review UI when something needs your attention.

## Contents

- [How it works](#how-it-works)
  - [First run — missing baselines](#first-run--missing-baselines)
  - [UI change — pixel diff](#ui-change--pixel-diff)
- [Features](#features)
- [Project structure](#project-structure)
- [Usage](#usage)
  - [Artifacts](#artifacts)
  - [Review UI](#review-ui)
- [Imports](#imports)
- [Development](#development)
  - [Review UI (HMR)](#review-ui-hmr)

## How it works

1. **Capture** — `storybranch test --url <storybook>` walks `index.json`, screenshots each story, and writes actuals under `.storybranch/actual/<git-sha>/`.
2. **Compare** — Each PNG is diffed against `.storybranch/baseline/`. New stories, pixel changes, and stale baselines show up in `report.json`.
3. **Review** — When anything needs attention, a local server serves the review UI so you can inspect baseline / actual / diff and accept updates.
4. **Commit** — Check updated baselines into git so the next run (and CI) share the same reference images.

### First run — missing baselines

Nothing in `.storybranch/baseline/` yet, so every snapshot is **new**. The CLI lists them and starts review on `http://127.0.0.1:4321` (by default):

```text
$ bunx storybranch test --url http://127.0.0.1:6006
storybranch review at http://127.0.0.1:4321
missing baseline button--default__1200x900.png
missing baseline button--modes__narrow.png
…
```

![Review UI with new snapshots](docs/images/review-missing-baselines.png)

Use **Accept** (or `storybranch approve`) to copy actuals into `baseline/` and clear the failures.

### UI change — pixel diff

After you change a component, the next run marks mismatches as **changed** and highlights pixels in the diff column:

```text
$ bunx storybranch test --url http://127.0.0.1:6006
storybranch review at http://127.0.0.1:4321
pixels button--default__1200x900.png
pixels button--modes__narrow.png
…
```

![Review UI comparing baseline, actual, and diff](docs/images/review-pixel-diff.png)

The fixture in this repo uses a tiny orange “button” story; the screenshot above is from temporarily shifting it to blue to demonstrate the diff view.

## Features

- ⚡ [Bun](https://bun.com) workspaces + [Turborepo](https://turbo.build) monorepo; Bun for runtime, tests, and CLI
- 🎨 [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) with [Ultracite](https://www.ultracite.dev/) presets
- 💚 CI on GitHub Actions:
  - ✅ Lint, format, and typecheck (parallel)
  - ✅ Tests with [Playwright](https://playwright.dev/) via `bun test`
  - ✅ Workflow linting with [jactionlint](https://github.com/rhysd/actionlint)
- 📖 [Storybook](https://storybook.js.org/) fixture for development and e2e coverage
- 🖼️ Local **review UI** (Vite + React) to compare baseline / actual / diff and accept snapshots in the browser
- ⚙️ VS Code extension recommendations

## Project structure

```
.github
  └─ workflows
        ├─ CI (lint, typecheck, format, test)
        └─ jactionlint
  └─ dependabot.yml
.vscode
  └─ Recommended extensions and editor settings
apps
  ├─ cli/         # Published `storybranch` CLI (bin) + review static assets
  ├─ review-ui/   # Vite + React review SPA (`@storybranch/review-ui`)
  └─ web/         # Landing site placeholder (`@storybranch/web`)
packages
  ├─ core/        # Capture engine (`@storybranch/core`)
  ├─ fixture/     # Minimal Storybook app for tests and manual runs
  └─ report/      # Report types and JSON I/O (`@storybranch/report`)
tooling
  ├─ github/      # Shared composite action (Bun install + Turborepo cache)
  ├─ oxlint/      # `@storybranch/oxlint-config` (base + composable presets)
  ├─ oxfmt/       # `@storybranch/oxfmt-config`
  └─ typescript/  # `@storybranch/tsconfig` (`base.json`)
patches
  └─ Bun patches for dependencies
turbo.json
  └─ Turborepo task pipeline (`build`, `lint`, `format`, `typecheck`, `test`, `dev`)
```

## Usage

```bash
bun install
bunx playwright install chromium
bunx storybook dev -p 6006 --config-dir packages/fixture/.storybook
bunx storybranch test --url http://127.0.0.1:6006
bunx storybranch review   # reopen the last run in the browser UI
bunx storybranch approve  # promote all actuals from the CLI (no UI)
```

### Artifacts

| Path | Role |
| --- | --- |
| `.storybranch/baseline/` | Committed reference PNGs |
| `.storybranch/actual/<commit>/` | Latest capture per git SHA (gitignored) |
| `.storybranch/diff/` | Pixel diff images (gitignored) |
| `.storybranch/report.json` | Last run inventory for the review UI (gitignored) |

### Review UI

See [How it works](#how-it-works) for screenshots. On a run with **missing / changed / stale** snapshots, `test` starts a background server on `http://127.0.0.1:4321` and prints the URL. Use the UI to filter shots, compare images, and **Accept** per snapshot or **Accept all** (baselines update immediately). `storybranch approve` still promotes every actual and removes stale baselines in one step.

| Command / flag | Effect |
| --- | --- |
| `test --open` | Open the review URL in your browser when review is offered |
| `test --review` | Offer review even when the run is fully green |
| `review [--open]` | Serve the last `report.json` until Ctrl+C |
| `review --once` | Exit when nothing needs attention |
| `--port` / `STORYBRANCH_PORT` | Override default port `4321` |

## Imports

Workspace packages use `workspace:*` for cross-package imports (e.g. `@storybranch/report`, `@storybranch/core/capture`). Within a package’s `src/`, import sibling modules with the `@/` alias (`paths` in that package’s `tsconfig.json`), not `./` or `../`; each package’s `oxlint.config.ts` composes `@storybranch/oxlint-config` blocks (e.g. `react-doctor` + `src-alias-imports` on CLI packages, `react-stack` on review UI). Shared lint/format/tsconfig live under `tooling/*` (`@storybranch/oxlint-config`, `@storybranch/oxfmt-config`, `@storybranch/tsconfig`).

## Development

```bash
bun install
bun run lint          # turbo run lint (per-package oxlint)
bun run lint:fix
bun run format        # turbo run format (per-package oxfmt)
bun run format:fix
bun run typecheck     # turbo run typecheck (per-package `bun check`; requires Bun 1.4.3+)
bun run build:review  # Vite production build → apps/cli/review/public/
bun run build         # turbo build (review-ui + web stub)
bun run test          # unit tests + Playwright e2e (install Chromium first)
```

### Review UI (HMR)

1. Run a capture so `report.json` exists (or run `storybranch test --url …`).
2. Terminal A: `bunx storybranch review` (API on port 4321).
3. Terminal B: `bun run dev:review` (Vite dev server; proxies `/api` and `/images` to 4321).

Review UI assets are **not** committed (`apps/cli/review/public/assets/`, `index.html`). After `bun install`, run `bun run build:review` before `storybranch review`. CI runs the same build before tests; `prepack` on the `storybranch` package (`apps/cli`) builds the UI for publish.

To refresh README screenshots after UI changes: `bun scripts/capture-readme-screenshots.ts` (requires Chromium from Playwright and a free port `6020` / `4322`).

The repo pins Bun via `packageManager` in `package.json`. CI reads that field through `oven-sh/setup-bun` and the shared `./tooling/github/setup` action.

Structure and tooling docs follow the same ideas as [Open Government Products Starter Kit](https://github.com/opengovsg/starter-kit) (apps vs packages vs tooling, shared CI setup and Turborepo cache).
