import {
  PACKAGE_MANAGER_STORAGE_KEY,
  parsePackageManager,
} from "@/lib/package-managers.ts";
import type { PackageManager } from "@/lib/package-managers.ts";

export const PACKAGE_MANAGER_CHANGE_EVENT = "storybranch:package-manager";

type Listener = (pm: PackageManager) => void;

const listeners = new Set<Listener>();

function readStored(): PackageManager {
  if (typeof window === "undefined") {
    return "npm";
  }

  return parsePackageManager(localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY));
}

export function getPackageManager(): PackageManager {
  return readStored();
}

export function setPackageManager(pm: PackageManager): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PACKAGE_MANAGER_STORAGE_KEY, pm);
  window.dispatchEvent(
    new CustomEvent(PACKAGE_MANAGER_CHANGE_EVENT, { detail: pm })
  );

  for (const listener of listeners) {
    listener(pm);
  }
}

export function subscribePackageManager(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function packageManagerFromEvent(
  event: Event
): PackageManager | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined;
  }

  const detail: unknown = event.detail;

  if (detail === "npm" || detail === "pnpm" || detail === "bun") {
    return detail;
  }

  return undefined;
}
