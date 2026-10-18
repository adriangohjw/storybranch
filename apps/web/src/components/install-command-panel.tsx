import { toast } from "sonner";

import { usePackageManager } from "@/context/package-manager-context.tsx";
import { installCommand } from "@/lib/package-managers.ts";
import type { InstallCommandKind } from "@/lib/package-managers.ts";

import { PackageManagerTabs } from "./package-manager-tabs.tsx";

interface InstallCommandPanelProps {
  className?: string;
  kinds: InstallCommandKind[];
  showTabs?: boolean;
  theme?: "dark" | "light";
}

async function copyCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy");
  }
}

export function InstallCommandPanel({
  className = "",
  kinds,
  showTabs = true,
  theme = "light",
}: InstallCommandPanelProps) {
  const { pm } = usePackageManager();

  const dark = theme === "dark";

  const blockClass = dark
    ? "border-white/15 bg-terminal text-paper"
    : "border-ink/10 bg-surface text-ink";

  const copyButtonClass = dark
    ? "border-white/15 bg-white/10 text-paper/80 hover:bg-white/15 hover:text-paper"
    : "border-ink/10 bg-paper-2/60 text-ink-muted hover:bg-paper-2 hover:text-ink";

  return (
    <div className={className}>
      {showTabs ? <PackageManagerTabs theme={theme} /> : null}
      <div className={showTabs ? "mt-3 flex flex-col gap-3" : "flex flex-col gap-3"}>
        {kinds.map((kind) => {
          const command = installCommand(kind, pm);

          return (
            <div
              className={`flex items-start rounded-lg border shadow-sm ${blockClass}`}
              key={kind}
            >
              <code className="min-w-0 flex-1 px-4 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap sm:text-sm">
                <span className="text-moss select-none">$ </span>
                {command}
              </code>
              <button
                aria-label="Copy install command"
                className={`shrink-0 self-stretch border-l px-4 text-xs font-semibold tracking-wide transition-colors ${copyButtonClass}`}
                onClick={() => {
                  void copyCommand(command);
                }}
                type="button"
              >
                Copy
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
