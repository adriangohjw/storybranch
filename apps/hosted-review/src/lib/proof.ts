import type { ReportEntry } from "@storybranch/report";

export type ProofKind = "accepted" | "changes" | "clear" | "error" | "open";

export interface ProofSummary {
  accepted: number;
  cells: ProofKind[];
  changes: number;
  clear: number;
  error: number;
  open: number;
  total: number;
  waiting: number;
}

export interface ProjectFindingRow {
  name: string;
  runCount: number;
  waiting: number;
}

const KINDS: ProofKind[] = ["accepted", "changes", "clear", "error", "open"];

export function summarizeProof(
  entries: readonly ReportEntry[],
  review: Readonly<Record<string, string>>
): ProofSummary {
  const counts: Record<ProofKind, number> = {
    accepted: 0,
    changes: 0,
    clear: 0,
    error: 0,
    open: 0,
  };

  const cells: ProofKind[] = [];

  for (const entry of entries) {
    const kind = kindFor(entry, review);
    cells.push(kind);
    counts[kind] += 1;
  }

  const total = cells.length;
  const waiting = counts.open + counts.error;

  return { ...counts, cells, total, waiting };
}

export function previewProof(summary: ProofSummary, cap = 48): ProofSummary {
  if (summary.cells.length <= cap) {
    return summary;
  }

  return { ...summary, cells: summary.cells.slice(0, cap) };
}

export function proofLabel(summary: ProofSummary): string {
  const parts: string[] = [];

  if (summary.waiting === 1) {
    parts.push("1 shot waiting");
  } else if (summary.waiting > 1) {
    parts.push(`${summary.waiting} shots waiting`);
  }

  if (summary.changes === 1) {
    parts.push("1 changes requested");
  } else if (summary.changes > 1) {
    parts.push(`${summary.changes} changes requested`);
  }

  if (summary.accepted === 1) {
    parts.push("1 accepted");
  } else if (summary.accepted > 1) {
    parts.push(`${summary.accepted} accepted`);
  }

  if (summary.clear === 1) {
    parts.push("1 unchanged");
  } else if (summary.clear > 1) {
    parts.push(`${summary.clear} unchanged`);
  }

  if (parts.length === 0) {
    return "No shots";
  }

  return parts.join(", ");
}

export function projectsFinding(rows: readonly ProjectFindingRow[]): string {
  if (rows.length === 0) {
    return "A project collects CI proofs for one repo.";
  }

  const waiting = rows
    .filter((row) => row.waiting > 0)
    .toSorted((a, b) => b.waiting - a.waiting || a.name.localeCompare(b.name));

  const [first] = waiting;

  if (first !== undefined) {
    const shots = first.waiting === 1 ? "shot" : "shots";
    const rest = waiting.length - 1;

    if (rest === 0) {
      return `${first.name} has ${first.waiting} ${shots} waiting.`;
    }

    if (rest === 1) {
      return `${first.name} has ${first.waiting} ${shots} waiting, and 1 other project does too.`;
    }

    return `${first.name} has ${first.waiting} ${shots} waiting, and ${rest} other projects do too.`;
  }

  const cold = rows.filter((row) => row.runCount === 0);

  if (cold.length === 1) {
    return `${cold[0]?.name ?? "One project"} has no run yet.`;
  }

  if (cold.length > 1) {
    return `${cold.length} projects have no run yet.`;
  }

  return "Every latest run is clear.";
}

export function runFinding(
  summary: ProofSummary | null,
  hasRuns: boolean,
  noun = "The latest run"
): string {
  if (!hasRuns) {
    return "No runs yet. A project token lets CI post the first proof.";
  }

  if (summary === null) {
    return `${noun} has no report.`;
  }

  if (summary.total === 0) {
    return `${noun} has no shots.`;
  }

  if (summary.waiting === 0) {
    return `${noun} is clear.`;
  }

  const shots = summary.waiting === 1 ? "shot" : "shots";

  if (summary.error === 0) {
    return `${noun} has ${summary.waiting} ${shots} waiting.`;
  }

  if (summary.open === 0) {
    const errors = summary.error === 1 ? "capture error" : "capture errors";

    return `${noun} has ${summary.error} ${errors}.`;
  }

  const errors = summary.error === 1 ? "capture error" : "capture errors";
  const openShots = summary.open === 1 ? "shot" : "shots";

  return `${noun} has ${summary.open} ${openShots} waiting and ${summary.error} ${errors}.`;
}

export function countsMatch(summary: ProofSummary): boolean {
  const summed = KINDS.reduce((total, kind) => total + summary[kind], 0);

  return (
    summed === summary.total && summary.waiting === summary.open + summary.error
  );
}

function kindFor(
  entry: ReportEntry,
  review: Readonly<Record<string, string>>
): ProofKind {
  const state =
    entry.filename === undefined ? undefined : review[entry.filename];

  if (state === "accepted") {
    return "accepted";
  }

  if (state === "changes_requested") {
    return "changes";
  }

  if (entry.status === "error") {
    return "error";
  }

  if (entry.status === "unchanged") {
    return "clear";
  }

  return "open";
}
