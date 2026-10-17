import type { ReportEntry, ShotStatus } from "@/report.ts";

export function needsAttention(status: ShotStatus): boolean {
  return status !== "unchanged";
}

export function matchesFilter(entry: ReportEntry, filter: string): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "attention") {
    return needsAttention(entry.status);
  }

  return entry.status === filter;
}

export function groupEntries(
  entries: ReportEntry[]
): [string, ReportEntry[]][] {
  const groups = new Map<string, ReportEntry[]>();

  for (const entry of entries) {
    const list = groups.get(entry.storyId) ?? [];
    list.push(entry);
    groups.set(entry.storyId, list);
  }

  return [...groups.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

export const badgeTone: Record<ShotStatus, string> = {
  changed: "bg-amber-500/20 text-amber-300",
  error: "bg-red-500/20 text-red-300",
  new: "bg-sky-500/20 text-sky-300",
  stale: "bg-rose-500/20 text-rose-300",
  unchanged: "bg-emerald-500/20 text-emerald-300",
};
