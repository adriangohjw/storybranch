import type { Report, ReportEntry } from "@storybranch/report";
import {
  browserFromFilename,
  CAPTURE_BROWSER,
  storyPartsFromId,
} from "@storybranch/report";
import { useState } from "react";
import { LuCheck } from "react-icons/lu";

import { acceptShot as postAcceptShot } from "@/api.ts";
import { cn } from "@/lib/cn.ts";
import { badgeTone, needsAttention } from "@/lib/report-ui.ts";
import { SnapshotFrame } from "@/snapshot-frame.tsx";
import type { ViewerEmptyKind } from "@/viewer-empty-state.tsx";
import { ViewerEmptyState } from "@/viewer-empty-state.tsx";

interface ComparisonViewerProps {
  acceptShot?: (filename: string) => Promise<void>;
  entry: ReportEntry | null;
  filter: string;
  imagePrefix?: string;
  onAccept: () => void;
  report: Report | null;
  showAccept?: boolean;
  visibleCount: number;
}

function shotLabelFor(entry: ReportEntry): string {
  if (entry.shotLabel !== undefined && entry.shotLabel.length > 0) {
    return entry.shotLabel;
  }

  if (entry.filename !== undefined) {
    return entry.filename;
  }

  return "capture error";
}

function browserFor(entry: ReportEntry): string {
  if (entry.browser !== undefined && entry.browser.length > 0) {
    return entry.browser;
  }

  if (entry.filename !== undefined) {
    return browserFromFilename(entry.filename) ?? CAPTURE_BROWSER;
  }

  return CAPTURE_BROWSER;
}

function emptyKindFor(
  report: Report | null,
  filter: string,
  visibleCount: number,
  entry: ReportEntry | null
): ViewerEmptyKind | null {
  if (report === null) {
    return "report-loading";
  }

  if (visibleCount === 0) {
    return filter === "attention" ? "attention-clear" : "filter-empty";
  }

  if (entry === null) {
    return "pick-snapshot";
  }

  return null;
}

export const ComparisonViewer = ({
  acceptShot,
  entry,
  filter,
  imagePrefix = "",
  onAccept,
  report,
  showAccept = true,
  visibleCount,
}: ComparisonViewerProps) => {
  const postAccept =
    acceptShot ??
    (async (filename: string) => {
      await postAcceptShot(filename);
    });

  const [diffOverlay, setDiffOverlay] = useState(true);

  const emptyKind = emptyKindFor(report, filter, visibleCount, entry);

  if (emptyKind !== null) {
    return <ViewerEmptyState kind={emptyKind} />;
  }

  if (entry === null) {
    return null;
  }

  if (entry.filename === undefined) {
    return (
      <div className="border-changes bg-changes/15 rounded-md border px-4 py-3">
        <p className="text-changes text-sm font-medium">Capture error</p>
        <p className="text-changes mt-1 text-sm">
          {entry.message ?? "This snapshot could not be captured."}
        </p>
      </div>
    );
  }

  const file = encodeURIComponent(entry.filename);
  const hasDiff = entry.diffPath !== undefined;
  const { component, story } = storyPartsFromId(entry.storyId);
  const browser = browserFor(entry);
  const label = shotLabelFor(entry);

  const canAccept = needsAttention(entry.status) && entry.status !== "error";

  return (
    <ShotCompare
      acceptShot={postAccept}
      browser={browser}
      canAccept={canAccept && showAccept}
      component={component}
      diffOverlay={diffOverlay}
      entry={entry}
      file={file}
      hasDiff={hasDiff}
      label={label}
      onAccept={onAccept}
      prefix={imagePrefix}
      setDiffOverlay={setDiffOverlay}
      story={story}
    />
  );
};

interface ShotCompareProps {
  acceptShot: (filename: string) => Promise<void>;
  browser: string;
  canAccept: boolean;
  component: string;
  diffOverlay: boolean;
  entry: ReportEntry;
  file: string;
  hasDiff: boolean;
  label: string;
  onAccept: () => void;
  prefix: string;
  setDiffOverlay: (update: (on: boolean) => boolean) => void;
  story: string;
}

const ShotCompare = ({
  acceptShot,
  browser,
  canAccept,
  component,
  diffOverlay,
  entry,
  file,
  hasDiff,
  label,
  onAccept,
  prefix,
  setDiffOverlay,
  story,
}: ShotCompareProps) => (
  <div className="specimen space-y-5 px-4 pb-4">
    <header className="border-line flex flex-wrap items-start justify-between gap-4 border-b pb-4">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              badgeTone[entry.status]
            )}
          >
            {entry.status}
          </span>
          <span className="text-ink-soft text-xs capitalize">{browser}</span>
        </div>
        <h2 className="text-ink text-base font-semibold tracking-tight">
          <span className="text-ink-soft">{component}</span>
          <span className="text-ink-soft"> / </span>
          {story}
        </h2>
        <p className="text-ink-soft text-sm">{label}</p>
        <p className="text-ink-soft text-xs tracking-tight break-all tabular-nums">
          {entry.filename}
        </p>
      </div>
      {canAccept ? (
        <button
          className="bg-ink text-paper hover:bg-ink/90 focus-visible:outline-ink inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => {
            const { filename } = entry;

            if (filename === undefined) {
              return;
            }

            void (async () => {
              await acceptShot(filename);
              onAccept();
            })();
          }}
          type="button"
        >
          <LuCheck aria-hidden className="size-4" />
          Accept snapshot
        </button>
      ) : null}
    </header>

    <div className="grid gap-5 xl:grid-cols-2">
      <figure className="m-0 space-y-2">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <figcaption className="text-ink-soft text-xs font-medium tracking-wide uppercase">
            Baseline
          </figcaption>
          <div
            aria-hidden
            className={cn(
              "text-ink-soft flex shrink-0 items-center gap-2 text-xs",
              !hasDiff && "invisible"
            )}
          >
            <span>Diff overlay</span>
            <span className="inline-block h-5 w-9 shrink-0" />
          </div>
        </div>
        <SnapshotFrame
          alt="Baseline snapshot"
          emptyLabel="No baseline yet"
          src={
            entry.baselinePath === undefined
              ? undefined
              : `${prefix}/images/baseline/${file}`
          }
        />
      </figure>
      <figure className="m-0 space-y-2">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <figcaption className="text-ink-soft text-xs font-medium tracking-wide uppercase">
            This scan
          </figcaption>
          <div
            className={cn(
              "text-ink-soft flex shrink-0 items-center gap-2 text-xs",
              !hasDiff && "invisible"
            )}
          >
            <span id="diff-overlay-label">Diff overlay</span>
            <button
              aria-labelledby="diff-overlay-label"
              aria-pressed={diffOverlay}
              className={cn(
                "focus-visible:outline-ink relative h-5 w-9 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                diffOverlay ? "bg-ink" : "bg-ink/25"
              )}
              disabled={!hasDiff}
              onClick={() => {
                setDiffOverlay((on) => !on);
              }}
              type="button"
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform",
                  diffOverlay && "translate-x-4"
                )}
              />
            </button>
          </div>
        </div>
        <SnapshotFrame
          alt="This scan"
          emptyLabel="No capture image"
          overlaySrc={
            hasDiff && diffOverlay ? `${prefix}/images/diff/${file}` : undefined
          }
          src={
            entry.actualPath === undefined
              ? undefined
              : `${prefix}/images/actual/${file}`
          }
        />
      </figure>
    </div>

    {entry.message !== undefined && entry.message.length > 0 ? (
      <p
        className={cn(
          "rounded-md border px-3 py-2 text-sm",
          entry.status === "error"
            ? "border-changes bg-changes/15 text-changes"
            : "border-line bg-paper-deep text-ink-soft"
        )}
        role={entry.status === "error" ? "alert" : undefined}
      >
        {entry.message}
      </p>
    ) : null}
  </div>
);
