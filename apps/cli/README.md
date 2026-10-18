# storybranch

Local visual diffs for Storybook. Captures stories with Playwright, pixel-diffs them against baselines in git, and opens a review UI on localhost.

Install it as a dev dependency of the Storybook app. Requires [Bun](https://bun.com) 1.4.3+.

## Install

```bash
npm install -D @adriangohjw/storybranch
npx playwright install chromium
```

(`pnpm add -D` / `pnpm run`, or `bun add -d` / `bun run`, work too.)

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
