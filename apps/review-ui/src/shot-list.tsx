import type { ReportEntry } from "@storybranch/report";

import { acceptShot } from "@/api.ts";
import { cn } from "@/lib/cn.ts";
import { badgeTone, groupEntries, needsAttention } from "@/lib/report-ui.ts";

interface ShotListProps {
  entries: ReportEntry[];
  onAccept: () => void;
  onSelect: (filename: string | null) => void;
  selectedFilename: string | null;
}

export const ShotList = ({
  entries,
  onAccept,
  onSelect,
  selectedFilename,
}: ShotListProps) => (
  <div className="space-y-4">
    {groupEntries(entries).map(([storyId, storyEntries]) => (
      <section key={storyId}>
        <h2 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {storyId}
        </h2>
        <ul className="space-y-1">
          {storyEntries.map((entry) => (
            <li
              className="flex items-center gap-1"
              key={entry.filename ?? `${entry.storyId}:error`}
            >
              <ShotRow
                entry={entry}
                onSelect={onSelect}
                selected={entry.filename === selectedFilename}
              />
              <AcceptButton entry={entry} onAccept={onAccept} />
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

interface ShotRowProps {
  entry: ReportEntry;
  onSelect: (filename: string | null) => void;
  selected: boolean;
}

const ShotRow = ({ entry, onSelect, selected }: ShotRowProps) => (
  <button
    className={cn(
      "flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
      "hover:border-zinc-600 hover:bg-zinc-800/80",
      selected ? "border-zinc-500 bg-zinc-800" : "border-transparent"
    )}
    onClick={() => {
      onSelect(entry.filename ?? null);
    }}
    type="button"
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
  </button>
);

interface AcceptButtonProps {
  entry: ReportEntry;
  onAccept: () => void;
}

const AcceptButton = ({ entry, onAccept }: AcceptButtonProps) => {
  const { filename } = entry;

  const canAccept =
    filename !== undefined &&
    needsAttention(entry.status) &&
    entry.status !== "error";

  if (!canAccept) {
    return null;
  }

  return (
    <button
      className="shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-700"
      onClick={() => {
        void (async () => {
          await acceptShot(filename);
          onAccept();
        })();
      }}
      type="button"
    >
      Accept
    </button>
  );
};
