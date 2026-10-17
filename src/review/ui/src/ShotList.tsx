import type { ReportEntry } from "../../../report.ts";

import { acceptShot } from "./api.ts";
import { cn } from "./lib/cn.ts";
import { badgeTone, groupEntries, needsAttention } from "./lib/report-ui.ts";

interface ShotListProps {
  entries: ReportEntry[];
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  selectedFilename: string | null;
}

export function ShotList({
  entries,
  onAccept,
  onSelect,
  selectedFilename,
}: ShotListProps) {
  return (
    <div className="space-y-4">
      {groupEntries(entries).map(([storyId, storyEntries]) => (
        <section key={storyId}>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {storyId}
          </h2>
          <ul className="space-y-1">
            {storyEntries.map((entry) => (
              <li key={entry.filename ?? `${entry.storyId}:error`}>
                <ShotRow
                  entry={entry}
                  onAccept={onAccept}
                  onSelect={onSelect}
                  selected={entry.filename === selectedFilename}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface ShotRowProps {
  entry: ReportEntry;
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  selected: boolean;
}

function ShotRow({ entry, onAccept, onSelect, selected }: ShotRowProps) {
  const canAccept =
    entry.filename !== undefined &&
    needsAttention(entry.status) &&
    entry.status !== "error";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
        "hover:border-zinc-600 hover:bg-zinc-800/80",
        selected ? "border-zinc-500 bg-zinc-800" : "border-transparent",
        "cursor-pointer"
      )}
      onClick={() => {
        onSelect(entry.filename ?? null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entry.filename ?? null);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
          badgeTone[entry.status]
        )}
      >
        {entry.status}
      </span>
      <span className="min-w-0 flex-1 truncate text-zinc-200">
        {entry.filename ?? entry.message ?? entry.storyId}
      </span>
      {canAccept ? (
        <button
          className="shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-700"
          onClick={async (event) => {
            event.stopPropagation();
            await acceptShot(entry.filename as string);
            onAccept();
          }}
          type="button"
        >
          Accept
        </button>
      ) : null}
    </div>
  );
}
