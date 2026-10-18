import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  installCommand,
  PACKAGE_MANAGER_LABEL,
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_STORAGE_KEY,
  parsePackageManager,
} from "@/lib/package-managers.ts";
import type {
  InstallCommandKind,
  PackageManager,
} from "@/lib/package-managers.ts";

const PM_CHANGE_EVENT = "storybranch:package-manager";

interface InstallCommandPanelProps {
  className?: string;
  kinds: InstallCommandKind[];
  theme?: "dark" | "light";
}

function readStoredPackageManager(): PackageManager {
  if (typeof window === "undefined") {
    return "npm";
  }

  return parsePackageManager(localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY));
}

function writeStoredPackageManager(pm: PackageManager): void {
  localStorage.setItem(PACKAGE_MANAGER_STORAGE_KEY, pm);
  window.dispatchEvent(new CustomEvent(PM_CHANGE_EVENT, { detail: pm }));
}

async function copyCommand(command: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(command);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy");
  }
}

function packageManagerFromEvent(event: Event): PackageManager | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined;
  }

  if (event.detail === "npm") {
    return "npm";
  }

  if (event.detail === "pnpm") {
    return "pnpm";
  }

  if (event.detail === "bun") {
    return "bun";
  }

  return undefined;
}

export function InstallCommandPanel({
  className = "",
  kinds,
  theme = "light",
}: InstallCommandPanelProps) {
  const [pm, setPm] = useState<PackageManager>(() =>
    readStoredPackageManager()
  );

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = packageManagerFromEvent(event);

      if (next !== undefined) {
        setPm(next);
      }
    };

    window.addEventListener(PM_CHANGE_EVENT, onChange);

    return () => {
      window.removeEventListener(PM_CHANGE_EVENT, onChange);
    };
  }, []);

  const dark = theme === "dark";

  const tabListClass = dark
    ? "border-white/15 bg-white/5"
    : "border-ink/10 bg-paper-2/60";

  const tabActiveClass = dark
    ? "bg-terminal text-paper"
    : "bg-surface text-ink shadow-sm";

  const tabIdleClass = dark
    ? "text-paper/60 hover:text-paper"
    : "text-ink-muted hover:text-ink";

  const blockClass = dark
    ? "border-white/15 bg-terminal text-paper"
    : "border-ink/10 bg-surface text-ink";

  const copyButtonClass = dark
    ? "border-white/15 bg-white/10 text-paper/80 hover:bg-white/15 hover:text-paper"
    : "border-ink/10 bg-paper-2/60 text-ink-muted hover:bg-paper-2 hover:text-ink";

  const selectPm = (next: PackageManager) => {
    setPm(next);
    writeStoredPackageManager(next);
  };

  return (
    <div className={className}>
      <div
        className={`inline-flex rounded-md border p-0.5 ${tabListClass}`}
        role="tablist"
        aria-label="Package manager"
      >
        {PACKAGE_MANAGERS.map((manager) => (
          <button
            aria-selected={pm === manager}
            className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
              pm === manager ? tabActiveClass : tabIdleClass
            }`}
            key={manager}
            onClick={() => {
              selectPm(manager);
            }}
            role="tab"
            type="button"
          >
            {PACKAGE_MANAGER_LABEL[manager]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3">
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
