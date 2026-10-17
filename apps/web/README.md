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

Production deploys run on **push to `main`** (and on **workflow_dispatch**) via [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml):

1. [`dorny/paths-filter`](https://github.com/dorny/paths-filter) sets output `web` when `apps/web/**` or `.github/workflows/deploy-web.yml` changed; the deploy job runs only when `needs.changes.outputs.web == 'true'`. Manual runs always deploy.
2. [`tooling/github/setup-web`](../../tooling/github/setup-web/action.yml) wraps [`setup`](../../tooling/github/setup/action.yml) (Bun install + Turborepo cache) and runs `bun run build:web`.
3. `cloudflare/wrangler-action` uploads `apps/web/dist` with `pages deploy`.

### Repository secrets

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token with **Cloudflare Pages Edit** (and account access) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### Manual / dashboard deploy

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| Root directory | `/` (repo root — Bun workspaces)   |
| Build command  | `bun install && bun run build:web` |
| Build output   | `apps/web/dist`                    |

If you prefer Pages root `apps/web` instead, install still needs the monorepo lockfile (e.g. build command `cd ../.. && bun install && bun run build:web`, output `dist`).

`wrangler.toml` in this directory sets `pages_build_output_dir = "dist"` and project name `storybranch`.

### Skip dashboard builds when `apps/web` did not change

If Cloudflare Pages builds from Git **without** the GitHub workflow, use **Workers & Pages → storybranch → Settings → Build → Build watch paths**:

- **Include paths:** `apps/web/*`
- **Exclude paths:** _(leave empty)_

See [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).
