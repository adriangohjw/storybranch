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
bun run build
```

## Cloudflare

Production deploys use **Workers Builds** connected to this GitHub repo (Workers & Pages → **storybranch** → Git integration). Cloudflare runs the build on push; there is no GitHub Actions deploy workflow.

`apps/web/wrangler.jsonc` publishes the static Astro output (`./dist`) as Worker assets. That file is required: without it, `wrangler deploy` runs `astro add cloudflare`, which installs with npm and fails on this repo’s `catalog:` dependencies.

### Build settings

| Setting                | Value                                |
| ---------------------- | ------------------------------------ |
| Production branch      | `main`                               |
| Root directory         | `/` (repo root — Bun workspaces)     |
| Build command          | `bun install && bun run build`       |
| Deploy command         | `npx wrangler deploy --cwd apps/web` |
| Preview deploy command | `npx wrangler deploy --cwd apps/web` |
| Build output           | `apps/web/dist`                      |

If the root directory is `apps/web` instead, the install still needs the monorepo lockfile (`cd ../.. && bun install && bun run build`) and the deploy command is `npx wrangler deploy`.

### Skip builds when `apps/web` did not change

**Workers & Pages → storybranch → Settings → Build → Build watch paths:**

- **Include paths:** `apps/web/*`
- **Exclude paths:** _(leave empty)_

See [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

CI on GitHub still runs `bun run build` (including `@storybranch/web`) on every push; that only verifies the site builds, it does not deploy.
