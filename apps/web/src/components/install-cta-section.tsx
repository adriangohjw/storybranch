import { InstallCommandPanel } from "./install-command-panel.tsx";

const github = "https://github.com/adriangohjw/storybranch";

export function InstallCtaSection() {
  return (
    <section
      className="mx-auto w-full max-w-6xl min-w-0 px-5 py-16 sm:px-8 sm:py-24"
      id="install"
    >
      <div className="border-ink/10 bg-ink text-paper min-w-0 rounded-2xl border px-6 py-10 sm:px-10 sm:py-14">
        <h2 className="font-syne text-3xl font-bold tracking-tight sm:text-4xl">
          Add it to your app
        </h2>
        <p className="text-paper/70 mt-3 max-w-xl text-base sm:text-lg">
          Install{" "}
          <code className="text-paper/90 font-mono text-[0.9em] break-all">
            @adriangohjw/storybranch
          </code>{" "}
          as a dev dependency. That install downloads Chrome. Add Firefox, Edge,
          or WebKit (`safari` or `webkit`) with Playwright when a config or
          --browsers asks for them, then run the script against your Storybook
          URL. Linux WebKit screenshots do not match macOS.
        </p>
        <pre className="bg-terminal text-paper mt-6 max-w-2xl rounded-lg border border-white/15 px-4 py-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap">
          <code>{`"visual": "storybranch test --url http://127.0.0.1:6006"`}</code>
        </pre>
        <div className="mt-10 max-w-2xl">
          <InstallCommandPanel kinds={["addPackage", "run"]} theme="dark" />
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium">
          <a
            className="text-paper decoration-paper/30 hover:decoration-paper underline underline-offset-4 transition-colors"
            href={github}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub repository
          </a>
          <a
            className="text-paper/70 decoration-paper/20 hover:text-paper hover:decoration-paper/50 underline underline-offset-4 transition-colors"
            href="/ci"
          >
            GitHub Actions CI
          </a>
          <a
            className="text-paper/70 decoration-paper/20 hover:text-paper hover:decoration-paper/50 underline underline-offset-4 transition-colors"
            href="/agents"
          >
            Agent snippet
          </a>
          <a
            className="text-paper/70 decoration-paper/20 hover:text-paper hover:decoration-paper/50 underline underline-offset-4 transition-colors"
            href={`${github}#readme`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Full README
          </a>
        </div>
      </div>
    </section>
  );
}
