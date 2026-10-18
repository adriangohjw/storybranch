# storybranch

Local visual diffs for Storybook. Captures stories with Playwright, pixel-diffs them against baselines in git, and opens a review UI on localhost.

Requires [Bun](https://bun.com).

## Install

```bash
npm install -D @adriangohjw/storybranch
npx playwright install chromium
```

(`pnpm add -D` / `pnpm exec`, or `bun add -d` / `bunx`, work too. The CLI still requires Bun 1.4.3+.)

## Usage

```bash
npx storybranch test --url http://127.0.0.1:6006
npx storybranch review
npx storybranch approve
```

Baselines are written to `.storybranch/baseline/`. Commit that directory.

When a run needs attention, the CLI serves the review UI at `http://127.0.0.1:4321` (`--port` or `STORYBRANCH_PORT` overrides it).
