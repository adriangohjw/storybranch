import { PackageManagerProvider } from "@/context/package-manager-context.tsx";

import { InstallCommandPanel } from "./install-command-panel.tsx";
import { TerminalDemo } from "./terminal-demo.tsx";

const github = "https://github.com/adriangohjw/storybranch";

export function HeroSection() {
  return (
    <PackageManagerProvider>
    <section className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12 lg:pb-24 lg:pt-10">
      <div className="min-w-0">
        <div className="animate-rise flex flex-wrap items-center gap-3">
          <p className="font-syne text-3xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            storybranch
          </p>
          <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-accent uppercase">
            Alpha
          </span>
        </div>
        <h1 className="animate-rise-delay-1 mt-4 max-w-xl text-2xl font-semibold leading-snug text-ink sm:text-3xl">
          Local visual diffs for Storybook
        </h1>
        <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
          Capture stories as PNGs, pixel-diff against baselines on disk, and accept changes in
          a browser review UI — no cloud required.
        </p>
        <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <a
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
            href="#review"
          >
            See a review
          </a>
          <a
            className="rounded-md border border-ink/15 bg-surface/80 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/30"
            href={github}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on GitHub
          </a>
        </div>
        <div className="animate-rise-delay-3 mt-6 max-w-xl">
          <InstallCommandPanel kinds={["addPackage", "run"]} />
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Add{" "}
            <code className="font-mono break-all text-ink">
              &quot;visual&quot;: &quot;storybranch test --url http://127.0.0.1:6006&quot;
            </code>{" "}
            to the app’s scripts. Storybook must be running at that URL.
          </p>
        </div>
      </div>
      <div className="animate-rise-delay-2 min-w-0">
        <TerminalDemo />
      </div>
    </section>
    </PackageManagerProvider>
  );
}
