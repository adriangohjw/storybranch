# storybranch

Local visual diffs for Storybook 10 and newer.

## Features

- ⚡ [Bun](https://bun.com) for runtime, package management, tests, and typechecking (`bun check`)
- 🎨 [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) with [Ultracite](https://www.ultracite.dev/) presets
- 💚 CI on GitHub Actions:
  - ✅ Lint, format, and typecheck (parallel)
  - ✅ Tests with [Playwright](https://playwright.dev/) via `bun test`
  - ✅ Workflow linting with [jactionlint](https://github.com/rhysd/actionlint)
- 📖 [Storybook](https://storybook.js.org/) fixture for development and e2e coverage
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
fixture
  └─ Minimal Storybook app used by tests and manual runs
patches
  └─ Bun patches for dependencies
src
  └─ CLI, capture logic, and unit/e2e tests
tooling
  └─ github
        └─ Shared composite action for CI setup
oxfmt.config.ts
  └─ Oxfmt configuration (extends Ultracite)
oxlint.config.ts
  └─ Oxlint configuration (extends Ultracite, type-aware)
tsconfig.json
  └─ TypeScript project options (checked by `bun check`)
```

## Usage

```bash
bun install
bunx playwright install chromium
bunx storybook dev -p 6006 --config-dir fixture/.storybook
bunx storybranch test --url http://127.0.0.1:6006
bunx storybranch approve
```

Baselines are committed from `.storybranch/baseline`. Fresh captures land in `.storybranch/actual/<commit>`, and pixel diffs land in `.storybranch/diff`.

## Imports

Code under `src/` imports other `src/` modules with the `@/` alias (`tsconfig.json` `paths`), not relative `./` paths. Oxlint enforces that for `src/**` via `no-restricted-imports` in `oxlint.config.ts`.

## Development

```bash
bun install
bun run lint          # oxlint
bun run lint:fix
bun run format        # oxfmt --check
bun run format:fix
bun run typecheck     # bun check
bun test              # unit tests + Playwright e2e (install Chromium first)
```

The repo pins Bun via `packageManager` in `package.json`. CI reads that field through `oven-sh/setup-bun` and the shared `./tooling/github/setup` action.

Structure and tooling docs follow the same ideas as [Open Government Products Starter Kit](https://github.com/opengovsg/starter-kit) (features list, tree layout, shared CI setup), adapted for a single-package Bun CLI instead of a Turborepo.
