# storybranch

Local visual diffs for Storybook 10 and newer.

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
  ├─ review-ui/   # Vite + React review SPA (`@storybranch/review-ui`)
  └─ web/         # Landing site placeholder (`@storybranch/web`)
packages
  ├─ tooling/     # `@storybranch/tooling` — shared oxfmt, oxlint, and tsconfig (workspace exports)
  ├─ fixture/     # Minimal Storybook app for tests and manual runs
  └─ storybranch/ # Published CLI (`storybranch`); build output in `review/public/`
patches
  └─ Bun patches for dependencies
tooling
  └─ github
        └─ Shared composite action for CI setup (Bun install + Turborepo cache)
packages/tooling/tsconfig/base.json
  └─ Shared TypeScript options (`@storybranch/tooling/tsconfig/base.json`)
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

On a run with **missing / changed / stale** snapshots, `test` starts a background server on `http://127.0.0.1:4321` and prints the URL. Use the UI to filter shots, compare images, and **Accept** per snapshot or **Accept all** (baselines update immediately). `storybranch approve` still promotes every actual and removes stale baselines in one step.

| Command / flag | Effect |
| --- | --- |
| `test --open` | Open the review URL in your browser when review is offered |
| `test --review` | Offer review even when the run is fully green |
| `review [--open]` | Serve the last `report.json` until Ctrl+C |
| `review --once` | Exit when nothing needs attention |
| `--port` / `STORYBRANCH_PORT` | Override default port `4321` |

## Imports

Code under `packages/storybranch/src/` imports other CLI modules with the `@/` alias (`packages/storybranch/tsconfig.json` `paths`), not relative `./` paths. Oxlint enforces that via `@storybranch/tooling/oxlint/cli` (except `apps/review-ui/**`, which uses `@storybranch/tooling/oxlint/react` and keeps co-located relative imports, with `@/` only for shared types like `@/report.ts`).

## Development

```bash
bun install
bun run lint          # turbo run lint (per-package oxlint)
bun run lint:fix
bun run format        # turbo run format (per-package oxfmt)
bun run format:fix
bun run typecheck     # turbo run typecheck (per-package tsc)
bun run build:review  # Vite production build → packages/storybranch/review/public/
bun run build         # turbo build (review-ui + web stub)
bun run test          # unit tests + Playwright e2e (install Chromium first)
```

### Review UI (HMR)

1. Run a capture so `report.json` exists (or run `storybranch test --url …`).
2. Terminal A: `bunx storybranch review` (API on port 4321).
3. Terminal B: `bun run dev:review` (Vite dev server; proxies `/api` and `/images` to 4321).

Review UI assets are **not** committed (`packages/storybranch/review/public/assets/`, `index.html`). After `bun install`, run `bun run build:review` before `storybranch review`. CI runs the same build before tests; `prepack` on the `storybranch` package builds the UI for publish.

The repo pins Bun via `packageManager` in `package.json`. CI reads that field through `oven-sh/setup-bun` and the shared `./tooling/github/setup` action.

Structure and tooling docs follow the same ideas as [Open Government Products Starter Kit](https://github.com/opengovsg/starter-kit) (features list, tree layout, shared CI setup and Turborepo cache in the composite action).
