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

From the repo root:

```bash
bun run build:web
```

## Cloudflare Pages

Production deploys use **Cloudflare Pages** connected to this GitHub repo (Workers & Pages → **storybranch** → Git integration). Cloudflare runs the build on push; there is no GitHub Actions deploy workflow.

### Build settings

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| Production branch | `main`                          |
| Root directory | `/` (repo root — Bun workspaces)   |
| Build command  | `bun install && bun run build:web` |
| Build output   | `apps/web/dist`                    |

If you set the Pages root directory to `apps/web` instead, the install step still needs the monorepo lockfile at the repo root (e.g. build command `cd ../.. && bun install && bun run build:web`, output `dist`).

### Skip builds when `apps/web` did not change

**Workers & Pages → storybranch → Settings → Build → Build watch paths:**

- **Include paths:** `apps/web/*`
- **Exclude paths:** _(leave empty)_

See [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

CI on GitHub still runs `bun run build` (including `@storybranch/web`) on every push; that only verifies the site builds, it does not deploy.
