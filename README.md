# storybranch

Local visual diffs for Storybook 10 and newer.

```bash
bun install
bunx playwright install chromium
bunx storybook dev -p 6006 --config-dir fixture/.storybook
bunx storybranch test --url http://127.0.0.1:6006
bunx storybranch approve
```

Baselines are committed from `.storybranch/baseline`. Fresh captures land in `.storybranch/actual`, and pixel diffs land in `.storybranch/diff`.
