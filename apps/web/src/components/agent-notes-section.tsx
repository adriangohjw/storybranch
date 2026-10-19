import { usePackageManager } from "@/context/package-manager-context.tsx";
import { agentsMarkdown } from "@/lib/package-managers.ts";

import { CopyCommand } from "./copy-command.tsx";

const gitignore = `.storybranch/actual/
.storybranch/diff/
.storybranch/report.json`;

export function AgentNotesSection() {
  const { pm } = usePackageManager();

  return (
    <>
      <h2 className="font-syne text-ink mt-12 text-2xl font-bold tracking-tight">
        AGENTS.md
      </h2>
      <p className="text-ink-muted mt-4">
        Exit 1 on the first run is the baseline set. Approve only when a person
        asked for it.
      </p>
      <div className="mt-4">
        <CopyCommand
          command={agentsMarkdown(pm)}
          compact
          prompt={false}
          scrollable
        />
      </div>

      <h2 className="font-syne text-ink mt-12 text-2xl font-bold tracking-tight">
        .gitignore
      </h2>
      <p className="text-ink-muted mt-4">
        Keep <code>.storybranch/baseline/</code> tracked.
      </p>
      <div className="mt-4">
        <CopyCommand command={gitignore} compact prompt={false} />
      </div>
    </>
  );
}
