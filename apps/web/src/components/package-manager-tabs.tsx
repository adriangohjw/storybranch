import { usePackageManager } from "@/context/package-manager-context.tsx";
import {
  PACKAGE_MANAGER_LABEL,
  PACKAGE_MANAGERS,
} from "@/lib/package-managers.ts";

interface PackageManagerTabsProps {
  theme?: "dark" | "light";
}

export function PackageManagerTabs({
  theme = "light",
}: PackageManagerTabsProps) {
  const { pm, setPackageManager } = usePackageManager();

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

  return (
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
            setPackageManager(manager);
          }}
          role="tab"
          type="button"
        >
          {PACKAGE_MANAGER_LABEL[manager]}
        </button>
      ))}
    </div>
  );
}
