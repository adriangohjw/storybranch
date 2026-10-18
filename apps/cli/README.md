# storybranch

Local visual diffs for Storybook. Captures stories with Playwright, pixel-diffs them against baselines in git, and opens a review UI on localhost.

Install it as a dev dependency of the Storybook app. Requires [Bun](https://bun.com) 1.4.3+.

## Install

```bash
npm install -D @adriangohjw/storybranch
```

(`pnpm add -D` or `bun add -d` work too.) Install runs `playwright install chromium`. If the package manager skips lifecycle scripts, run `npx playwright install chromium` (`pnpm exec` / `bunx`). Bun needs `@adriangohjw/storybranch` in `trustedDependencies`.

## Scripts

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
npm run visual:review
npm run visual:approve
```

Baselines are written to `.storybranch/baseline/`. Commit that directory.

When a run needs attention, review is served at `http://127.0.0.1:4321` (`--port` or `STORYBRANCH_PORT` overrides it).
