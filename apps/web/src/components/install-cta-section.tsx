import { InstallCommandPanel } from "./install-command-panel.tsx";

const github = "https://github.com/adriangohjw/storybranch";

export function InstallCtaSection() {
  return (
    <section
      className="mx-auto w-full min-w-0 max-w-6xl px-5 py-16 sm:px-8 sm:py-24"
      id="install"
    >
      <div className="min-w-0 rounded-2xl border border-ink/10 bg-ink px-6 py-10 text-paper sm:px-10 sm:py-14">
        <h2 className="font-syne text-3xl font-bold tracking-tight sm:text-4xl">
          Add it to your app
        </h2>
        <p className="mt-3 max-w-xl text-base text-paper/70 sm:text-lg">
          Install{" "}
          <code className="font-mono text-[0.9em] break-all text-paper/90">
            @adriangohjw/storybranch
          </code>{" "}
          as a dev dependency. Chromium downloads in that install, then add a script and run it
          against your running Storybook URL.
        </p>
        <pre className="mt-6 max-w-2xl rounded-lg border border-white/15 bg-terminal px-4 py-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap text-paper">
          <code>{`"visual": "storybranch test --url http://127.0.0.1:6006"`}</code>
        </pre>
        <div className="mt-10 max-w-2xl">
          <InstallCommandPanel
            kinds={["addPackage", "run"]}
            showTabs={false}
            theme="dark"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-medium">
          <a
            className="text-paper underline decoration-paper/30 underline-offset-4 transition-colors hover:decoration-paper"
            href={github}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub repository
          </a>
          <a
            className="text-paper/70 underline decoration-paper/20 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper/50"
            href="#agents"
          >
            Agent snippet
          </a>
          <a
            className="text-paper/70 underline decoration-paper/20 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper/50"
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
