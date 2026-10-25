# `@storybranch/web`

Marketing landing page for [storybranch](https://github.com/adriangohjw/storybranch).

## Develop

```bash
bun install
bun run dev
```

Optional: set `PUBLIC_STORYBRANCH_DEMO_URL` (e.g. `https://review.example/demo`) at build time to show a **See a live demo** link in the hero that points at the hosted-review public demo.

## Build

```bash
bun run build   # → dist/
bun run preview
```

From the repo root:

```bash
bun run build
```

## Cloudflare Pages

Production deploys use **Cloudflare Pages** connected to this GitHub repo (Workers & Pages → **storybranch** → Git integration), on the custom domain [storybook.adriangohjw.com](https://storybook.adriangohjw.com). Cloudflare runs the build on push; there is no GitHub Actions deploy workflow.

Agent-oriented index: [`public/llms.txt`](public/llms.txt) is served at `/llms.txt` (see [llms.txt](https://llmstxt.org/)). The site layout sets `rel="describedby"` to that URL.

Doc pages: [`/ci`](src/pages/ci.astro) (GitHub Actions), [`/agents`](src/pages/agents.astro), [`/chromatic`](src/pages/chromatic.astro).

### Build settings

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Production branch | `main`                           |
| Root directory    | `/` (repo root — Bun workspaces) |
| Build command     | `bun install && bun run build`   |
| Build output      | `apps/web/dist`                  |

If you set the Pages root directory to `apps/web` instead, the install step still needs the monorepo lockfile at the repo root (e.g. build command `cd ../.. && bun install && bun run build`, output `dist`).

### Skip builds when `apps/web` did not change

**Workers & Pages → storybranch → Settings → Build → Build watch paths:**

- **Include paths:** `apps/web/*`
- **Exclude paths:** _(leave empty)_

See [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

CI on GitHub still runs `bun run build` (including `@storybranch/web`) on every push; that only verifies the site builds, it does not deploy.
