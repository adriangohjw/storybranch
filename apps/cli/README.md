# storybranch

Local visual diffs for Storybook. Captures stories with Playwright, pixel-diffs them against baselines in git, and opens a review UI on localhost.

Requires [Bun](https://bun.com).

## Install

```bash
bun add -d @adriangohjw/storybranch
bunx playwright install chromium
```

## Usage

```bash
bunx storybranch test --url http://127.0.0.1:6006
bunx storybranch review
bunx storybranch approve
```

Baselines are written to `.storybranch/baseline/`. Commit that directory.

When a run needs attention, the CLI serves the review UI at `http://127.0.0.1:4321` (`--port` or `STORYBRANCH_PORT` overrides it).
