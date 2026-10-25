import type { ProofKind, ProofSummary } from "~/lib/proof";
import { proofLabel } from "~/lib/proof";
import { cn } from "~/lib/utils";

const KIND_WORD: Record<ProofKind, string> = {
  accepted: "Accepted",
  changes: "Changes requested",
  clear: "Unchanged",
  error: "Capture error",
  open: "Waiting",
};

const CELL_TONE: Record<ProofKind, string> = {
  accepted: "bg-emerald-700",
  changes: "bg-red-600",
  clear: "bg-muted-foreground/30",
  error: "bg-red-600",
  open: "bg-amber-400",
};

function Cell({ kind }: { kind: ProofKind }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3.5 w-2 rounded-[2px]", CELL_TONE[kind])}
      title={KIND_WORD[kind]}
    />
  );
}

export function Mark() {
  return (
    <span aria-hidden className="inline-flex gap-0.5">
      <Cell kind="open" />
      <Cell kind="accepted" />
      <Cell kind="changes" />
    </span>
  );
}

export function ProofKey() {
  return (
    <p className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {(["open", "error", "changes", "accepted", "clear"] as const).map(
        (kind) => (
          <span className="inline-flex items-center gap-1.5" key={kind}>
            <Cell kind={kind} />
            {KIND_WORD[kind]}
          </span>
        )
      )}
    </p>
  );
}

export function ProofStrip({ proof }: { proof: ProofSummary | null }) {
  if (proof === null || proof.total === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const extra = proof.total - proof.cells.length;

  return (
    <span
      aria-label={proofLabel(proof)}
      className="mt-2 flex max-w-70 flex-wrap items-center gap-0.5"
    >
      {proof.cells.map((kind, index) => (
        <span
          className={cn(
            "inline-block h-3.5 w-2 rounded-[2px]",
            CELL_TONE[kind]
          )}
          key={`${kind}-${index.toString()}`}
          title={KIND_WORD[kind]}
        />
      ))}
      {extra > 0 ? (
        <span className="text-muted-foreground ml-1 text-xs tabular-nums">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}
