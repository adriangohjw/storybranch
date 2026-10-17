import type { ReportEntry } from "../../../report.ts";

interface ComparisonViewerProps {
  entry: ReportEntry | null;
}

export const ComparisonViewer = ({ entry }: ComparisonViewerProps) => {
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

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <figure className="m-0">
          <figcaption className="mb-1 text-xs text-zinc-500">
            Baseline
          </figcaption>
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
          <figcaption className="mb-1 text-xs text-zinc-500">Actual</figcaption>
          {entry.actualPath === undefined ? (
            <p className="text-xs text-zinc-600">No actual</p>
          ) : (
            <img
              alt="actual"
              className="block w-full rounded border border-zinc-800 bg-zinc-900/50"
              src={`/images/actual/${file}`}
            />
          )}
        </figure>
        <figure className="m-0">
          <figcaption className="mb-1 text-xs text-zinc-500">Diff</figcaption>
          {entry.diffPath === undefined ? (
            <p className="text-xs text-zinc-600">No diff image</p>
          ) : (
            <img
              alt="diff"
              className="block w-full rounded border border-zinc-800 bg-zinc-900/50"
              src={`/images/diff/${file}`}
            />
          )}
        </figure>
      </div>
      {entry.message !== undefined && entry.message.length > 0 ? (
        <p className="mt-4 text-sm text-zinc-400">{entry.message}</p>
      ) : null}
    </div>
  );
};
