# storybranch

Local visual diffs for Storybook. Captures stories with Playwright, pixel-diffs them against baselines in git, and opens a review UI on localhost.

Install it as a dev dependency of the Storybook app. The `storybranch` command runs on [Node.js](https://nodejs.org) 22.18+.

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

Chromatic command equivalents (`CHROMATIC_PROJECT_TOKEN` is ignored):

| Chromatic | storybranch |
| --- | --- |
| `chromatic --project-token "$CHROMATIC_PROJECT_TOKEN"` | `storybranch test --url http://127.0.0.1:6006` |
| `chromatic --only-changed` | `storybranch test --url http://127.0.0.1:6006 --only-changed` |
| `chromatic --only-changed` with a paths filter | `storybranch test --url http://127.0.0.1:6006 --changed-files @changed.txt` |
| `chromatic --exit-zero-on-changes` | `storybranch test --url http://127.0.0.1:6006 --exit-zero-on-changes` |
| `chromatic --auto-accept-changes` | `storybranch test --url http://127.0.0.1:6006 --auto-accept-changes` |
| `chromatic --exit-once-uploaded` | `storybranch test --url http://127.0.0.1:6006 --exit-once` |

`chromatic.config.json` beside `.storybook/` supplies `onlyChanged`, `externals`, `untraced`, `exitZeroOnChanges`, and `autoAcceptChanges`. `--changed-files` takes comma-separated paths or `@list.txt` (one path per line). `--exit-once-uploaded` is an alias of `--exit-once`.

When a run needs attention, review is served at `http://127.0.0.1:4321` (`--port` or `STORYBRANCH_PORT` overrides it).
