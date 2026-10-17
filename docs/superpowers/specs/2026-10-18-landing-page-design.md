# storybranch landing page design

Date: 2026-10-18  
Status: approved for planning

## Goal

Ship a single marketing landing page for storybranch at `apps/web`, in the spirit of [jactionlint](https://jactionlint.jdx.dev/) / [mise](https://mise.jdx.dev/): brand-led hero, install command, terminal product demo, then a review-UI section. Landing only — no docs routes.

## Decisions

| Topic | Choice |
| --- | --- |
| Scope | Landing page only |
| Location | `apps/web` |
| Stack | Astro + Tailwind v4 |
| Hero demo | Terminal mock of `storybranch test` |
| Secondary demo | Static review UI mock (baseline / actual / diff) |
| Hosting | Cloudflare Pages |
| Interactivity | Static HTML + copy-to-clipboard; no React islands |

## Architecture

- Package: `apps/web` (name e.g. `@storybranch/web`)
- Astro static site output
- Tailwind CSS v4 for layout and type
- `@astrojs/cloudflare` adapter for Cloudflare Pages
- Scripts: `dev`, `build`, `preview`
- Wire into monorepo scripts/turbo when present; otherwise runnable via `bun run --cwd apps/web …`
- Single route: `/`
- Components (Astro, presentational):
  - `Nav`
  - `Hero` (brand, headline, supporting line, CTAs, install copy button)
  - `TerminalDemo` (styled mock of CLI capture output)
  - `Features` (three one-job beats)
  - `ReviewDemo` (static three-pane comparison + Accept affordance)
  - `HowItWorks` (numbered steps)
  - `InstallCTA` (closing install + GitHub)
  - `Footer`

No shared dependency on `apps/review-ui`. Demos are illustrative mocks with placeholder imagery (simple SVG/PNG fixtures or CSS-drawn panels), not a live capture pipeline.

## Page content (top → bottom)

1. **Nav** — `storybranch` wordmark + GitHub (`https://github.com/adriangohjw/storybranch`)
2. **Hero**
   - Brand name at hero level (must remain the dominant text signal)
   - One headline: local visual diffs for Storybook 10+
   - One short supporting sentence
   - CTA group: Get started (smooth-scroll to How it works) + GitHub
   - Install command with copy: primary line matching README usage, e.g. `bunx storybranch test --url http://127.0.0.1:6006`. If the package is not on the public registry yet, keep that command as the product promise and point “install from source” / clone instructions at the GitHub repo — do not invent a fake `npm i` story.
   - Dominant visual: terminal mock showing `storybranch test --url …` progress / summary and a review URL line
3. **Features** — three sections or a single section with three beats:
   - Capture Storybook stories as PNGs
   - Diff locally (baseline / actual / pixel diff under `.storybranch/`)
   - Review and accept in the browser (or `approve` from CLI)
4. **Review section** — one job: show the review UX. Static mock of baseline | actual | diff, filter/list chrome optional and minimal, Accept / Accept all as non-functional buttons (visual only)
5. **How it works** — short numbered steps:
   1. Run Storybook
   2. `bunx storybranch test --url http://127.0.0.1:6006`
   3. Review in the browser or `storybranch approve`
6. **Closing CTA** — install command again + GitHub
7. **Footer** — MIT license note, GitHub link

First viewport budget: brand, one headline, one supporting sentence, one CTA group, one dominant terminal visual. No stats strips, card grids in the hero, or secondary marketing clutter.

## Visual direction

- Reference feel: jdx product landings (clear hierarchy, terminal/code chrome, restrained motion)
- Not a clone of their brand colors or fonts
- Light-first surface with subtle atmosphere (gradient and/or light noise) — avoid flat single-color page
- Expressive, purposeful fonts (not Inter / Roboto / Arial / system UI stacks)
- Accent: Storybook-adjacent coral/pink or a clear custom pair — avoid purple-on-white / indigo AI defaults, cream+serif+terracotta, and broadsheet hairline layouts
- At least 2–3 intentional motions (e.g. hero fade/slide, terminal line reveal or soft entrance, copy-button feedback)
- Responsive: readable and composed on mobile; terminal/review mocks may simplify (stack or scroll) below `md`

## Deploy

- Cloudflare Pages project pointed at the repo
- Root directory: `apps/web`
- Build command: `bun install && bun run build` (or equivalent from monorepo root if configured)
- Output directory: `dist`
- No server routes, auth, or APIs on the landing site
- **Skip when unchanged:** Cloudflare dashboard Build watch paths → include `apps/web/*` (see [Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/)). Optionally use `.github/workflows/deploy-web.yml` with `paths: apps/web/**` instead of (not in addition to) the dashboard Git integration.

## Out of scope

- Documentation site / VitePress / multi-page guides
- Embedding the real review SPA
- npm/Homebrew install matrix beyond what README already centers on
- Custom domain setup (ops later; site must work on `*.pages.dev`)
- Publishing the package to npm as part of this work

## Success criteria

- `bun run --cwd apps/web build` produces a static site suitable for Cloudflare Pages
- Landing communicates what storybranch is and how to try it in under a minute of reading
- Visual demos make capture + review obvious without running the tool
- Mobile and desktop both load as a coherent page
- Lints/format/typecheck for the new package pass with existing repo tooling where applicable
