import { usePackageManager } from "@/context/package-manager-context.tsx";
import { agentsMarkdown } from "@/lib/package-managers.ts";

import { CopyCommand } from "./copy-command.tsx";

const gitignore = `.storybranch/actual/
.storybranch/diff/
.storybranch/report.json`;

export function AgentNotesSection() {
  const { pm } = usePackageManager();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="font-syne text-ink text-3xl font-bold tracking-tight sm:text-4xl">
          For agents in your app
        </h2>
        <p className="text-ink-muted mt-3 text-base sm:text-lg">
          Paste the note into that repo’s AGENTS.md, and the ignore rules into
          the app that owns the baselines.
        </p>
      </div>
      <div className="mt-10 flex max-w-3xl flex-col gap-10">
        <div className="min-w-0">
          <h3 className="font-syne text-ink text-lg font-bold">AGENTS.md</h3>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Exit 1 on the first run is the baseline set. Approve only when a
            person asked for it.
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
        <div className="min-w-0">
          <h3 className="font-syne text-ink text-lg font-bold">.gitignore</h3>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Keep{" "}
            <code className="text-ink font-mono break-all">
              .storybranch/baseline/
            </code>{" "}
            tracked.
          </p>
          <div className="mt-4">
            <CopyCommand command={gitignore} compact prompt={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
