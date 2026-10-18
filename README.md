# storybranch

> **Alpha / WIP** — This project is in active development. APIs and behavior may change. **Use at your own risk.**

**Open-source, self-hosted visual testing for Storybook** — the capture → diff → review loop teams know from [Chromatic](https://www.chromatic.com/), designed to **run on your machine** and **deploy on infrastructure you control**.

storybranch drives Playwright against your Storybook, saves one PNG per story, [Chromatic mode](https://www.chromatic.com/docs/modes/), and browser, compares them to baselines you keep in git, and opens a review UI when something needs your attention. Install it as a dev dependency of the Storybook app and run it from that app’s scripts. Baselines and diffs live under that package’s `.storybranch/` directory (the package with `package.json` and `.storybook/`, not necessarily the git root).

## Contents

- [Why storybranch](#why-storybranch)
- [Self-hosted and local](#self-hosted-and-local)
- [Install](#install)
- [Quick start](#quick-start)
  - [For agents](#for-agents)
- [How it works](#how-it-works)
  - [First run — missing baselines](#first-run--missing-baselines)
  - [UI change — pixel diff](#ui-change--pixel-diff)
- [Features](#features)
- [Chromatic compatibility](#chromatic-compatibility)
- [Usage](#usage)
  - [Artifacts](#artifacts)
  - [Review UI](#review-ui)
- [Project structure](#project-structure)
- [Development](#development)
  - [Review UI (HMR)](#review-ui-hmr)
  - [Landing site](#landing-site)
- [Imports](#imports)

## Why storybranch

| | Chromatic (hosted SaaS) | storybranch |
| --- | --- | --- |
| **Where it runs** | Chromatic’s cloud | Your laptop, your CI runners, your servers |
| **Baselines** | Hosted project | Committed PNGs in `.storybranch/baseline/` |
| **Review** | chromatic.com | Review UI you serve (`npm run visual:review` on localhost by default) |
| **Storybook** | Chromatic build pipeline | Any URL you point at — especially `http://127.0.0.1:…` while developing |
| **License / cost** | Commercial product | Open source ([LICENSE](LICENSE)) |

storybranch is an **open-source, self-hosted** take on that workflow: you operate the tool, you own the artifacts, and you can keep the whole loop **local** during development.

It is not a drop-in Chromatic replacement for every feature (e.g. hosted Storybook builds, TurboSnap, or Chromatic’s GitHub App integrations). It **does** cover the core visual regression workflow for Storybook using Playwright capture, pixel diffs, and an accept/reject review experience.

## Self-hosted and local

Two goals drive the design:

1. **Self-hosted** — Run storybranch wherever you already run tooling (GitHub Actions, self-hosted runners, internal CI). Snapshots and reports stay in your repo and on your disks.
2. **Local** — Point `--url` at a Storybook dev server on your machine and get pixel diffs in seconds; open the review UI on `127.0.0.1` without waiting on a remote service.

Related behavior:

- **Baselines in git** — Reference images are normal files; PRs show baseline updates like any other asset change.
- **Offline-friendly local runs** — After install, capture and review against a local Storybook work without reaching a hosted visual-testing service.
- **Chromatic modes** — Multiple snapshots per story via [modes](https://www.chromatic.com/docs/modes/) naming, aligned with how Chromatic labels variant viewports/themes. Supported `parameters.chromatic` keys, ignore regions, and media features are listed under [Chromatic compatibility](#chromatic-compatibility).
- **Chrome, Firefox, Edge, and Safari** — Each shot is `{storyId}__{label}__{browser}.png`. The default browser is `chrome`. Add `firefox`, `edge`, and `safari` in config or with `--browsers`. `webkit` is an alias for `safari` and writes `__safari.png`.

## Install

Install `@adriangohjw/storybranch` as a dev dependency of the Storybook app you want to test. Requires [Bun](https://bun.com) 1.4.3+.

**npm** (default):

```bash
npm install -D @adriangohjw/storybranch
```

**pnpm**:

```bash
pnpm add -D @adriangohjw/storybranch
```

**bun**:

```bash
bun add -d @adriangohjw/storybranch
```

The published package’s `postinstall` runs `playwright install chromium` (the `chrome` snapshot). Bun skips that unless `@adriangohjw/storybranch` is in `trustedDependencies`. pnpm skips it unless the package is allowed to build. If the script did not run, install Chromium yourself: `npx playwright install chromium` (`pnpm exec playwright install chromium`, `bunx playwright install chromium`). Firefox, Edge, and Safari are not part of that install. When you select them, also run `npx playwright install firefox`, `npx playwright install msedge`, and `npx playwright install webkit`.

Publish from the repo root with `bun run publish:cli` when you are ready to put it on npm (see [Publish](#publish)).

## Quick start

Storybook has to be running at your `--url`. Chromatic `modes` or `viewports` on a story become extra snapshots. Setting both on one story is an error.

Add scripts to the Storybook app:

```json
{
  "scripts": {
    "visual": "storybranch test --url http://127.0.0.1:6006",
    "visual:review": "storybranch review",
    "visual:approve": "storybranch approve"
  }
}
```

```bash
npm run visual
```

(`pnpm run visual` or `bun run visual` if you use those package managers.)

That script captures **Chrome** only. To capture more browsers, add `storybranch.config.json` or `storybranch.config.ts` next to `.storybook/` (keep one file). A JSON file:

```json
{
  "browsers": ["chrome", "firefox", "edge", "safari"],
  "captureParallel": false
}
```

A TypeScript file default-exports the same fields. `captureParallel: true` runs the selected browsers at the same time; the default is one browser after another. One run can override the file: `npm run visual -- --browsers chrome,firefox` and `npm run visual -- --parallel-browsers`.

`safari` (and the alias `webkit`) launches Playwright’s WebKit build, not Apple Safari. Playwright does not drive branded Safari. On Linux and Windows that build uses a different network stack and compositor than macOS, so screenshots do not match a macOS capture (fonts, painting, and PNG details such as the alpha channel). Layout and JavaScript still follow WebKit. Linux CI, including this repo’s `ubuntu-latest` WebKit job, is the cheaper check for WebKit regressions. A macOS runner is the closer stand-in for desktop Safari. Neither is iOS Safari. Capture Safari baselines on one OS and keep CI on that OS.

`visual` exits 1 when a snapshot needs attention. In a terminal you get the scan line, the attention summary, one `->` row per snapshot, and `storybranch review at http://127.0.0.1:4321` when the review UI is available. In CI or other non-TTY runs you get `missing baseline <file.png>`, `pixels <file.png>`, `size <file.png>`, or `stale <file.png>` (one per snapshot). A clean run prints `ok`. The inventory is `.storybranch/report.json`.

The first run exits 1 with every shot marked `new` (or `missing baseline` lines in CI). That is the baseline set, not a failed install. `approve` copies actuals into `.storybranch/baseline/`. Commit that directory and ignore the rest:

```gitignore
.storybranch/actual/
.storybranch/diff/
.storybranch/report.json
```

`visual:review` and `--open` are for a person.

In a monorepo with several Storybooks, run the scripts from each app package (or pass `--cwd apps/web`). Each package keeps its own `.storybranch/` tree. The CLI walks up from the current directory until it finds `package.json` and `.storybook/` together.

### For agents

Paste this into the Storybook app’s `AGENTS.md`. `@adriangohjw/storybranch` is a dev dependency. Run `npm run visual` (`pnpm run visual` or `bun run visual`).

```markdown
## storybranch

`@adriangohjw/storybranch` is a dev dependency. Storybook must already be running at your `--url`. Run `npm run visual` from the package that has `.storybook/` (or pass `--cwd`). (`pnpm run visual` or `bun run visual`.)

- `visual` runs `storybranch test --url <storybook>`. Exit 1 means a visual diff. In a terminal: scan time, status summary, and one `->` row per snapshot, plus `storybranch review at …`. In CI/non-TTY: `missing baseline`, `pixels`, `size`, `stale` per snapshot. A clean run prints `ok`.
- Default browser is `chrome`. Filenames end in `__chrome.png`, `__firefox.png`, `__edge.png`, or `__safari.png`. Extra browsers come from `storybranch.config.json` or `storybranch.config.ts` in that package, or from `--browsers`. `webkit` is an alias for `safari`. Linux WebKit shots do not match macOS; pin the runner OS.
- Read `.storybranch/report.json` in that package (`new`, `changed`, `unchanged`, `stale`, `error`).
- The first run marks every shot as `new` in the summary (or `missing baseline` lines in CI).
- Commit only `.storybranch/baseline/` in that package. Ignore `actual/`, `diff/`, and `report.json`.
- Run `npm run visual:approve` only when asked to accept the shots. `visual:review` and `--open` are for a person.
```

## How it works

1. **Capture** — `npm run visual` (`storybranch test --url <storybook>`) walks `index.json`, screenshots each story in each selected browser, and writes actuals under `.storybranch/actual/<git-sha>/`. The default browser is Chrome.
2. **Compare** — Each PNG is diffed against `.storybranch/baseline/`. New stories, pixel changes, and stale baselines show up in `report.json`.
3. **Review** — When anything needs attention, a local server serves the review UI so you can compare baseline vs this scan (with an optional diff overlay) and accept updates.
4. **Commit** — Check updated baselines into git so the next run (and CI) share the same reference images.

### First run — missing baselines

Nothing in `.storybranch/baseline/` yet, so every snapshot is **new**. The run lists them and starts review on `http://127.0.0.1:4321` (by default):

```text
$ npm run visual
storybranch review at http://127.0.0.1:4321
4 snapshots scanned · 3.1s build time
4 snapshots need attention · 4 new
-> new: hero--default__1200x900__chrome
-> new: hero--modes__narrow__chrome
```

![Review UI with new snapshots](docs/images/review-missing-baselines.png)

Use **Accept** (or `npm run visual:approve`) to copy actuals into `baseline/` and clear the failures.

### UI change — pixel diff

After you change a component, the next run marks mismatches as **changed** and highlights pixels with the diff overlay on **This scan**:

```text
$ npm run visual
storybranch review at http://127.0.0.1:4321
4 snapshots scanned · 3.4s build time
2 snapshots need attention · 2 changed
-> changed: hero--default__1200x900__chrome
-> changed: hero--modes__narrow__chrome
```

![Review UI comparing baseline and this scan with diff overlay](docs/images/review-pixel-diff.png)

The fixture story is a sample hero. The screenshot above is that hero after the primary CTA color shifts.

## Chromatic compatibility

storybranch reads `parameters.chromatic` from the merged story context Storybook already built: project (`preview`) parameters, then meta, then the story. Objects deep-merge. Arrays such as `ignoreSelectors` and `viewports` are replaced by the more specific value. The same rules are what `combineParameters` in Storybook 10 applies.

Supported keys: `delay`, `diffIncludeAntiAliasing`, `diffThreshold`, `disable`, `disableSnapshot`, `ignoreSelectors`, `pauseAnimationAtEnd`, `forcedColors` (`active` | `none`), `prefersReducedMotion` (`reduce` | `no-preference`), `media` (`print` | `screen`), `cropToViewport`, `modes`, `viewports`. Any other `chromatic` key is left unused.

Elements with `.chromatic-ignore` or `data-chromatic="ignore"`, plus `ignoreSelectors`, are excluded from the pixel diff. Open shadow roots are included. Iframe documents are not. A size or position change that moves other pixels, or that changes the screenshot size, still fails the diff. `forcedColors`, `prefersReducedMotion`, and `media` apply to every snapshot of that story, including each mode. They are not read from inside a mode object. An invalid value fails that story.

The same notes are on the site at [/chromatic](https://storybook.adriangohjw.com/chromatic).

## Features

- ⚡ [Bun](https://bun.com) workspaces + [Turborepo](https://turbo.build) monorepo; Bun for runtime, tests, and CLI
- 🎨 [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) with [Ultracite](https://www.ultracite.dev/) presets; [Lefthook](https://lefthook.dev/) (`pre-commit` fix, `pre-push` CI checks)
- 💚 CI on GitHub Actions (single **✅ CI passed** required check):
  - ✅ Lint, format, typecheck, and `turbo` **build** (parallel jobs)
  - ✅ Tests with [Playwright](https://playwright.dev/) via `bun test`
  - ✅ Workflow linting with [jactionlint](https://github.com/rhysd/actionlint)
- 📖 [Storybook](https://storybook.js.org/) fixture for development and e2e coverage
- 🖼️ Local **review UI** (Vite + React) to compare baseline / actual / diff and accept snapshots in the browser
- 🌐 **Marketing site** (`apps/web`, Astro + Tailwind) — deploy details in [`apps/web/README.md`](apps/web/README.md)
- ⚙️ VS Code extension recommendations

## Usage

```bash
npm run visual
npm run visual:review
npm run visual:approve
```

Use `pnpm run` or `bun run` with the same script names when you installed with pnpm or bun.

### Artifacts

| Path | Role |
| --- | --- |
| `.storybranch/baseline/` | Committed reference PNGs |
| `.storybranch/actual/<commit>/` | Latest capture per git SHA (gitignored) |
| `.storybranch/diff/` | Pixel diff images (gitignored) |
| `.storybranch/report.json` | Last run inventory for the review UI (gitignored) |

### Review UI

See [How it works](#how-it-works) for screenshots. On a run with **missing / changed / stale** snapshots, `visual` starts a background server on `http://127.0.0.1:4321` and prints the URL. Use the UI to filter shots, compare images, and **Accept** per snapshot or **Accept all** (baselines update immediately). `npm run visual:approve` still promotes every actual and removes stale baselines in one step.

| Script | Effect |
| --- | --- |
| `--browsers chrome,firefox,edge,safari` | Browsers for this run (default `chrome`; overrides `storybranch.config.json` or `storybranch.config.ts` in the package). `webkit` is an alias for `safari` |
| `--parallel-browsers` | Capture each browser at the same time (default is one browser after another; also `captureParallel` in config) |
| `--cwd <path>` | Resolve the Storybook package from this path (walks up to `package.json` + `.storybook/`) |
| `STORYBRANCH_ROOT` | Same as `--cwd` for all commands (env wins over process cwd, loses to `--cwd`) |
| `npm run visual -- --open` | Open the review URL in your browser when review is offered |
| `npm run visual -- --review` | Offer review even when the run is fully green |
| `npm run visual:review` | Serve the last `report.json` until Ctrl+C. Add `-- --open` to open a browser |
| `npm run visual:review -- --once` | Exit when nothing needs attention |
| `--port` / `STORYBRANCH_PORT` | Override default port `4321` (`npm run visual -- --port 4321`) |

## Project structure

```
.github
  └─ workflows
        ├─ CI (lint, jactionlint, typecheck, format, build, test → ✅ CI passed)
        └─ codeql.yml
  └─ dependabot.yml
.vscode
  └─ Recommended extensions and editor settings
apps
  ├─ cli/         # Published `@adriangohjw/storybranch` package (bin, bundled CLI, review assets)
  ├─ review-ui/   # Vite + React review SPA (`@storybranch/review-ui`)
  └─ web/         # Marketing landing page (`@storybranch/web`, Astro)
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
lefthook.yml
  └─ `pre-commit`: `turbo` lint:fix / format:fix · `pre-push`: lint / format / typecheck
```

## Development

```bash
bun install           # runs `lefthook install` via prepare (skipped when CI=true)
bunx playwright install chromium firefox msedge webkit
bun run build         # review UI, package bundle (bin loads dist/cli.js), and marketing site
bunx storybook dev -p 6006 --config-dir packages/fixture/.storybook
bun run visual          # fixture app runs the built storybranch bin
bun run lint          # turbo run lint (per-package oxlint)
bun run lint:fix
bun run format        # turbo run format (per-package oxfmt)
bun run format:fix
bun run typecheck     # turbo run typecheck (per-package `bun check`; requires Bun 1.4.3+)
bun run test          # unit tests + Playwright e2e (install Chromium, Firefox, Edge, and WebKit first)
```

### Publish

The npm package is `@adriangohjw/storybranch` (`apps/cli` only). The `storybranch` command comes from the package `bin`.

- **`prepublishOnly`** — runs fast CLI unit tests before publish (run `bun run test` from the repo root before releasing).
- **`prepack`** — builds the review UI, bundles the CLI (so `@storybranch/core` and `@storybranch/report` are not separate installs), copies the repo `LICENSE`, drops workspace `devDependencies`, and replaces monorepo `scripts` with `postinstall` (`playwright install chromium`).
- **`postpack`** — restores `apps/cli/package.json`.
- **Packing** — Bun resolves `catalog:` dependency ranges from the root catalog when the tarball is created.

`publishConfig.access` is `public`, so you do not need `--access public` on the command line.

From the repo root:

```bash
bun pm whoami                    # npm login if this fails
bun run pack:cli                 # optional: write apps/cli/*.tgz locally
bun publish --dry-run --cwd apps/cli   # optional: pack without uploading
cd apps/cli && bun pm version patch    # bump version (+ git tag/commit unless --no-git-tag-version)
bun run publish:cli              # upload to npm
```

Equivalent from `apps/cli`: `bun pm pack`, `bun publish --dry-run`, `bun pm version patch`, `bun publish`.

Use `bun publish --tolerate-republish` in CI if a job might run twice for the same version. Prereleases should use `bun publish --tag <name>` so they do not become `latest`.

### Git hooks (Lefthook)

[`lefthook.yml`](lefthook.yml):

- **`pre-commit`** — `bun run lint:fix` and `bun run format:fix` (turbo, all packages)
- **`pre-push`** — same **lint**, **format**, and **typecheck** tasks as CI (`turbo run …`, in parallel)

Skip hooks with `git commit --no-verify` / `git push --no-verify`, or `LEFTHOOK=0` before the git command.

### Review UI (HMR)

1. Run a capture so `report.json` exists (`bun run visual` after `bun run build`).
2. Terminal A: `bun run visual:review` (API on port 4321).
3. Terminal B: `bun run dev:review` (Vite dev server; proxies `/api` and `/images` to 4321).

Review UI assets are **not** committed (`apps/cli/review/public/assets/`, `index.html`). After `bun install`, run `bun run build` before `bun run visual` in this repo. CI has a dedicated **build** job (`bun run build`); tests depend on packages building via turbo. A published install already includes the built review UI and `dist/cli.js`.

### Landing site

From `apps/web` (or `bun run --filter @storybranch/web dev` at the repo root):

```bash
cd apps/web && bun run dev
```

Production hosting is **Cloudflare Pages** at [storybook.adriangohjw.com](https://storybook.adriangohjw.com) (Git integration, build watch paths on `apps/web/*`). See [`apps/web/README.md`](apps/web/README.md).

To refresh README screenshots after UI changes: `bun scripts/capture-readme-screenshots.ts` (requires Chromium from Playwright and a free port `6020` / `4322`).

The repo pins Bun via `packageManager` in `package.json`. CI reads that field through `oven-sh/setup-bun` and the shared `./tooling/github/setup` action.

Structure and tooling docs follow the same ideas as [Open Government Products Starter Kit](https://github.com/opengovsg/starter-kit) (apps vs packages vs tooling, shared CI setup and Turborepo cache).

## Imports

Third-party versions live in the root **`catalog`** in `package.json`; workspace packages reference them with `catalog:` (and each other with `workspace:*`). Cross-package imports use workspace names (e.g. `@storybranch/report`, `@storybranch/core/capture`). Within a package’s `src/`, import sibling modules with the `@/` alias (`paths` in that package’s `tsconfig.json`), not `./` or `../`; each package’s `oxlint.config.ts` composes `@storybranch/oxlint-config` blocks (e.g. `react-doctor` + `src-alias-imports` on CLI packages, `react-stack` on review UI). Shared lint/format/tsconfig live under `tooling/*` (`@storybranch/oxlint-config`, `@storybranch/oxfmt-config`, `@storybranch/tsconfig`).
