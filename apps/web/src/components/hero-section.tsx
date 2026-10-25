import { Mark } from "@storybranch/brand";

import { PackageManagerProvider } from "@/context/package-manager-context.tsx";

import { InstallCommandPanel } from "./install-command-panel.tsx";
import { TerminalDemo } from "./terminal-demo.tsx";

const github = "https://github.com/adriangohjw/storybranch";

const hostedDemoUrl = import.meta.env.PUBLIC_STORYBRANCH_DEMO_URL;

export function HeroSection() {
  return (
    <PackageManagerProvider>
      <section className="mx-auto grid w-full max-w-6xl min-w-0 gap-10 px-5 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12 lg:pt-10 lg:pb-24">
        <div className="min-w-0">
          <div className="animate-rise flex flex-wrap items-center gap-3">
            <p className="font-syne text-ink flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <Mark className="inline-flex gap-1 sm:gap-1.5 [&_span]:h-8 [&_span]:w-3 sm:[&_span]:h-10 sm:[&_span]:w-3.5 lg:[&_span]:h-12 lg:[&_span]:w-4" />
              storybranch
            </p>
            <span className="border-accent/25 bg-accent/10 text-accent rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
              Alpha
            </span>
          </div>
          <h1 className="animate-rise-delay-1 text-ink mt-4 max-w-xl text-2xl leading-snug font-semibold sm:text-3xl">
            Local visual diffs for Storybook
          </h1>
          <p className="animate-rise-delay-2 text-ink-muted mt-4 max-w-md text-base leading-relaxed sm:text-lg">
            Capture stories as PNGs in Chrome, Firefox, Edge, and Safari,
            pixel-diff against baselines on disk, and accept changes in a local
            review UI. No cloud account. Team review is an optional app you host
            yourself.
          </p>
          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <a
              className="bg-accent hover:bg-accent-deep rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              href="#review"
            >
              See a review
            </a>
            {typeof hostedDemoUrl === "string" && hostedDemoUrl.length > 0 ? (
              <a
                className="border-ink/15 bg-surface/80 text-ink hover:border-ink/30 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors"
                href={hostedDemoUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                See a live demo
              </a>
            ) : null}
            <a
              className="border-ink/15 bg-surface/80 text-ink hover:border-ink/30 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors"
              href={github}
              rel="noopener noreferrer"
              target="_blank"
            >
              View on GitHub
            </a>
          </div>
          <div className="animate-rise-delay-3 mt-6 max-w-xl">
            <InstallCommandPanel kinds={["addPackage", "run"]} />
            <p className="text-ink-muted mt-2 text-xs leading-relaxed">
              Add{" "}
              <code className="text-ink font-mono break-all">
                &quot;visual&quot;: &quot;storybranch test --url
                http://127.0.0.1:6006&quot;
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
