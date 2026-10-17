import { twMerge } from "tailwind-merge";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`review UI markup is missing: ${selector}`);
  }
  return element;
}

const filterEl = requireElement<HTMLSelectElement>("#filter");
const groupsEl = requireElement<HTMLElement>("#groups");
const metaEl = requireElement<HTMLElement>("#meta");
const acceptAllEl = requireElement<HTMLButtonElement>("#accept-all");
const panelsEl = requireElement<HTMLDivElement>("#panels");
const placeholderEl = requireElement<HTMLParagraphElement>(".placeholder");
const baselineImg = requireElement<HTMLImageElement>("#baseline");
const actualImg = requireElement<HTMLImageElement>("#actual");
const diffImg = requireElement<HTMLImageElement>("#diff");
const diffPanel = requireElement<HTMLElement>("#diff-panel");
const detailEl = requireElement<HTMLElement>("#detail");

interface ReportEntry {
  actualPath?: string;
  baselinePath?: string;
  diffPath?: string;
  filename?: string;
  message?: string;
  status: string;
  storyId: string;
}

interface Report {
  commit: string;
  entries: ReportEntry[];
}

let report: Report | null = null;
let selectedFilename: string | null = null;

const badgeTone: Record<string, string> = {
  changed: "bg-amber-500/20 text-amber-300",
  error: "bg-red-500/20 text-red-300",
  new: "bg-sky-500/20 text-sky-300",
  stale: "bg-rose-500/20 text-rose-300",
  unchanged: "bg-emerald-500/20 text-emerald-300",
};

function needsAttention(status: string): boolean {
  return status !== "unchanged";
}

function matchesFilter(entry: ReportEntry, filter: string): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "attention") {
    return needsAttention(entry.status);
  }
  return entry.status === filter;
}

function groupEntries(entries: ReportEntry[]): [string, ReportEntry[]][] {
  const groups = new Map<string, ReportEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.storyId) ?? [];
    list.push(entry);
    groups.set(entry.storyId, list);
  }
  return [...groups.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

async function loadReport(): Promise<void> {
  const response = await fetch("/api/report");
  report = (await response.json()) as Report;
  metaEl.textContent = `commit ${report.commit.slice(0, 7)} · ${report.entries.length} snapshots`;
  render();
}

function render(): void {
  if (report === null) {
    return;
  }
  const filter = filterEl.value;
  const visible = report.entries.filter((entry) => matchesFilter(entry, filter));
  groupsEl.replaceChildren();
  for (const [storyId, entries] of groupEntries(visible)) {
    const section = document.createElement("section");
    section.className = "mb-4";
    const heading = document.createElement("h2");
    heading.className = "mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500";
    heading.textContent = storyId;
    section.append(heading);
    for (const entry of entries) {
      section.append(shotRow(entry));
    }
    groupsEl.append(section);
  }
  if (selectedFilename !== null) {
    const selected = report.entries.find((entry) => entry.filename === selectedFilename);
    if (selected !== undefined) {
      showViewer(selected);
    }
  }
}

function shotRow(entry: ReportEntry): HTMLDivElement {
  const selected = entry.filename === selectedFilename;
  const row = document.createElement("div");
  row.className = twMerge(
    "flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
    "hover:border-zinc-600 hover:bg-zinc-800/80",
    selected ? "border-zinc-500 bg-zinc-800" : "border-transparent"
  );
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  if (selected) {
    row.setAttribute("aria-selected", "true");
  }

  const badge = document.createElement("span");
  badge.className = twMerge(
    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
    badgeTone[entry.status] ?? "bg-zinc-700 text-zinc-200"
  );
  badge.textContent = entry.status;
  row.append(badge);

  const label = document.createElement("span");
  label.className = "min-w-0 flex-1 truncate text-zinc-200";
  label.textContent = entry.filename ?? entry.message ?? entry.storyId;
  row.append(label);

  if (
    entry.filename !== undefined &&
    needsAttention(entry.status) &&
    entry.status !== "error"
  ) {
    const accept = document.createElement("button");
    accept.className =
      "shrink-0 rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-700";
    accept.type = "button";
    accept.textContent = "Accept";
    accept.addEventListener("click", async (event) => {
      event.stopPropagation();
      await acceptShot(entry.filename as string);
    });
    row.append(accept);
  }

  row.addEventListener("click", () => {
    selectedFilename = entry.filename ?? null;
    render();
    showViewer(entry);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      row.click();
    }
  });
  return row;
}

function showViewer(entry: ReportEntry): void {
  placeholderEl.hidden = true;
  panelsEl.hidden = false;
  detailEl.textContent = entry.message ?? "";

  if (entry.filename === undefined) {
    baselineImg.removeAttribute("src");
    actualImg.removeAttribute("src");
    diffImg.removeAttribute("src");
    diffPanel.hidden = true;
    return;
  }

  const file = encodeURIComponent(entry.filename);
  baselineImg.src = entry.baselinePath ? `/images/baseline/${file}` : "";
  actualImg.src = entry.actualPath ? `/images/actual/${file}` : "";
  if (entry.diffPath) {
    diffImg.src = `/images/diff/${file}`;
    diffPanel.hidden = false;
  } else {
    diffImg.removeAttribute("src");
    diffPanel.hidden = true;
  }
}

async function acceptShot(filename: string): Promise<void> {
  await fetch(`/api/accept/${encodeURIComponent(filename)}`, { method: "POST" });
  await loadReport();
}

acceptAllEl.addEventListener("click", async () => {
  await fetch("/api/accept-all", { method: "POST" });
  await loadReport();
});

filterEl.addEventListener("change", render);

await loadReport();
