import { useState } from "react";

import type { ReportEntry } from "@/report.ts";

import { cn } from "./lib/cn.ts";

interface ComparisonViewerProps {
  entry: ReportEntry | null;
}

export const ComparisonViewer = ({ entry }: ComparisonViewerProps) => {
  const [diffOverlay, setDiffOverlay] = useState(true);

  if (entry === null) {
    return (
      <p className="text-sm text-zinc-500">Select a snapshot to compare.</p>
    );
  }

  if (entry.filename === undefined) {
    return (
      <p className="text-sm text-red-300">{entry.message ?? "Capture error"}</p>
    );
  }

  const file = encodeURIComponent(entry.filename);
  const hasDiff = entry.diffPath !== undefined;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="m-0">
          <figcaption className="mb-1 text-xs text-zinc-500">Baseline</figcaption>
          {entry.baselinePath === undefined ? (
            <p className="text-xs text-zinc-600">No baseline</p>
          ) : (
            <img
              alt="baseline"
              className="block w-full rounded border border-zinc-800 bg-zinc-900/50"
              src={`/images/baseline/${file}`}
            />
          )}
        </figure>
        <figure className="m-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <figcaption className="text-xs text-zinc-500">This scan</figcaption>
            {hasDiff ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>Diff overlay</span>
                <button
                  aria-pressed={diffOverlay}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    diffOverlay ? "bg-sky-600" : "bg-zinc-700"
                  )}
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
            ) : null}
          </div>
          {entry.actualPath === undefined ? (
            <p className="text-xs text-zinc-600">No actual</p>
          ) : (
            <div className="relative overflow-hidden rounded border border-zinc-800 bg-zinc-900/50">
              <img
                alt="this scan"
                className="block w-full"
                src={`/images/actual/${file}`}
              />
              {hasDiff && diffOverlay ? (
                <img
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 size-full object-contain opacity-85 mix-blend-screen"
                  src={`/images/diff/${file}`}
                />
              ) : null}
            </div>
          )}
        </figure>
      </div>
      {entry.message !== undefined && entry.message.length > 0 ? (
        <p className="mt-4 text-sm text-zinc-400">{entry.message}</p>
      ) : null}
    </div>
  );
};
