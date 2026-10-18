import type { ReportEntry } from "@storybranch/report";
import { LuCheck } from "react-icons/lu";

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
              className="flex items-center gap-0.5"
              key={
                entry.filename ?? `${entry.storyId}:${entry.browser ?? "error"}`
              }
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

function shotTitle(entry: ReportEntry): string {
  if (entry.shotLabel !== undefined && entry.browser !== undefined) {
    return `${entry.shotLabel} · ${entry.browser}`;
  }

  return entry.filename ?? entry.message ?? entry.storyId;
}

interface ShotRowProps {
  entry: ReportEntry;
  onSelect: (filename: string | null) => void;
  selected: boolean;
}

const ShotRow = ({ entry, onSelect, selected }: ShotRowProps) => (
  <button
    className={cn(
      "flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md border px-2 py-1.5 text-left transition-colors",
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
        "rounded-full px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide uppercase",
        badgeTone[entry.status]
      )}
    >
      {entry.status}
    </span>
    <span className="text-xs leading-snug break-all text-zinc-200">
      {shotTitle(entry)}
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
      aria-label="Accept"
      className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      onClick={() => {
        void (async () => {
          await acceptShot(filename);
          onAccept();
        })();
      }}
      type="button"
    >
      <LuCheck aria-hidden className="size-3.5" />
    </button>
  );
};
