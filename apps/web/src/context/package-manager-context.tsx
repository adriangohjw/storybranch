import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getPackageManager,
  setPackageManager as persistPackageManager,
  subscribePackageManager,
} from "@/lib/package-manager-sync.ts";
import type { PackageManager } from "@/lib/package-managers.ts";

export interface PackageManagerContextValue {
  pm: PackageManager;
  setPackageManager: (pm: PackageManager) => void;
}

const PackageManagerContext = createContext<PackageManagerContextValue | null>(
  null
);

function usePackageManagerState(): PackageManagerContextValue {
  const [pm, setPm] = useState<PackageManager>(() => getPackageManager());

  useEffect(() => {
    return subscribePackageManager(setPm);
  }, []);

  return useMemo(
    () => ({
      pm,
      setPackageManager: persistPackageManager,
    }),
    [pm]
  );
}

/** Wrap a React subtree (single Astro island) so children share one subscription. */
export function PackageManagerProvider({ children }: { children: ReactNode }) {
  const value = usePackageManagerState();

  return (
    <PackageManagerContext.Provider value={value}>
      {children}
    </PackageManagerContext.Provider>
  );
}

/**
 * Selected package manager for install/run commands.
 * Syncs across Astro islands via `package-manager-sync` (localStorage + subscribe).
 */
export function usePackageManager(): PackageManagerContextValue {
  const context = useContext(PackageManagerContext);
  const local = usePackageManagerState();

  return context ?? local;
}
