# `@storybranch/web`

Marketing landing page for [storybranch](https://github.com/adriangohjw/storybranch).

## Develop

```bash
bun install
bun run dev
```

## Build

```bash
bun run build   # → dist/
bun run preview
```

## Cloudflare Pages

| Setting        | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Root directory | `/` (repo root — Bun workspaces)                         |
| Build command  | `bun install && bun run --filter @storybranch/web build` |
| Build output   | `apps/web/dist`                                          |

If you prefer Pages root `apps/web` instead, install still needs the monorepo lockfile (e.g. build command `cd ../.. && bun install && bun run --filter @storybranch/web build`, output `apps/web/dist`).

### Skip deploys when `apps/web` did not change

In the Cloudflare dashboard: **Workers & Pages → storybranch → Settings → Build → Build watch paths**

- **Include paths:** `apps/web/*`
- **Exclude paths:** _(leave empty)_

Pages skips the build when a push touches only files outside those paths. See [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).
