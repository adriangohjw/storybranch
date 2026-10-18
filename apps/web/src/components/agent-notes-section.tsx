import { usePackageManager } from "@/context/package-manager-context.tsx";
import { agentsMarkdown } from "@/lib/package-managers.ts";

import { CopyCommand } from "./copy-command.tsx";

const gitignore = `.storybranch/actual/
.storybranch/diff/
.storybranch/report.json`;

export function AgentNotesSection() {
  const { pm } = usePackageManager();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20" id="agents">
      <div className="max-w-2xl">
        <h2 className="font-syne text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          For agents in your app
        </h2>
        <p className="mt-3 text-base text-ink-muted sm:text-lg">
          Paste the ignore rules into the app that owns the baselines, and the note into that
          repo’s AGENTS.md.
        </p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-syne text-lg font-bold text-ink">.gitignore</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Keep{" "}
            <code className="font-mono break-all text-ink">.storybranch/baseline/</code>{" "}
            tracked.
          </p>
          <div className="mt-4">
            <CopyCommand command={gitignore} compact prompt={false} />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="font-syne text-lg font-bold text-ink">AGENTS.md</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Exit 1 on the first run is the baseline set. Approve only when a person asked for
            it.
          </p>
          <div className="mt-4">
            <CopyCommand
              command={agentsMarkdown(pm)}
              compact
              prompt={false}
              scrollable
            />
          </div>
        </div>
      </div>
    </section>
  );
}
