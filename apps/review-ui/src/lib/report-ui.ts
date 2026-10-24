import type { ReportEntry, ShotStatus } from "@storybranch/report";

export { needsAttention } from "@storybranch/report";

export function pendingApproval(status: ShotStatus): boolean {
  return status === "new" || status === "changed";
}

export function matchesFilter(entry: ReportEntry, filter: string): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "attention") {
    return pendingApproval(entry.status);
  }

  return entry.status === filter;
}

export const badgeTone: Record<ShotStatus, string> = {
  changed: "bg-pending text-ink",
  error: "bg-changes text-paper",
  new: "bg-ink text-paper",
  stale: "bg-changes text-paper",
  unchanged: "bg-accepted text-paper",
};
