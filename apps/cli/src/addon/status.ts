export type ShotStatus = "changed" | "error" | "new" | "stale" | "unchanged";

export type SidebarStatus =
  | "status-value:error"
  | "status-value:success"
  | "status-value:warning";

export interface ShotEntry {
  browser?: string;
  message?: string;
  shotLabel?: string;
  status?: string;
  storyId?: string;
}

export interface StoryVisualStatus {
  detail: string;
  sidebar: SidebarStatus;
  status: ShotStatus;
  storyId: string;
}

export interface ReportDocument {
  entries: ShotEntry[];
}

export interface AddonPayload {
  error: string | null;
  reviewUrl: string | null;
  running: boolean;
  stories: StoryVisualStatus[];
  summary: string;
}

const rank: Record<ShotStatus, number> = {
  changed: 3,
  error: 4,
  new: 2,
  stale: 1,
  unchanged: 0,
};

// status-value:new is a sidebar icon, but the testing widget only counts
// error, warning, and success. Warning is what highlights a story that
// still needs a baseline decision.
const sidebar: Record<ShotStatus, SidebarStatus> = {
  changed: "status-value:warning",
  error: "status-value:error",
  new: "status-value:warning",
  stale: "status-value:warning",
  unchanged: "status-value:success",
};

function isShotStatus(value: string): value is ShotStatus {
  return value in rank;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isShotEntry(value: unknown): value is ShotEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if ("browser" in value && !isOptionalString(value.browser)) {
    return false;
  }

  if ("message" in value && !isOptionalString(value.message)) {
    return false;
  }

  if ("shotLabel" in value && !isOptionalString(value.shotLabel)) {
    return false;
  }

  if ("status" in value && !isOptionalString(value.status)) {
    return false;
  }

  if ("storyId" in value && !isOptionalString(value.storyId)) {
    return false;
  }

  return true;
}

export function isReportDocument(value: unknown): value is ReportDocument {
  if (typeof value !== "object" || value === null || !("entries" in value)) {
    return false;
  }

  return Array.isArray(value.entries) && value.entries.every(isShotEntry);
}

function isSidebarStatus(value: string): value is SidebarStatus {
  return (
    value === "status-value:error" ||
    value === "status-value:success" ||
    value === "status-value:warning"
  );
}

function isStoryVisualStatus(value: unknown): value is StoryVisualStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("detail" in value) || typeof value.detail !== "string") {
    return false;
  }

  if (
    !("sidebar" in value) ||
    typeof value.sidebar !== "string" ||
    !isSidebarStatus(value.sidebar)
  ) {
    return false;
  }

  if (
    !("status" in value) ||
    typeof value.status !== "string" ||
    !isShotStatus(value.status)
  ) {
    return false;
  }

  if (!("storyId" in value) || typeof value.storyId !== "string") {
    return false;
  }

  return true;
}

export function isAddonPayload(value: unknown): value is AddonPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("error" in value) || !isNullableString(value.error)) {
    return false;
  }

  if (!("reviewUrl" in value) || !isNullableString(value.reviewUrl)) {
    return false;
  }

  if (!("running" in value) || typeof value.running !== "boolean") {
    return false;
  }

  if (!("stories" in value) || !Array.isArray(value.stories)) {
    return false;
  }

  if (!("summary" in value) || typeof value.summary !== "string") {
    return false;
  }

  return value.stories.every(isStoryVisualStatus);
}

function shotDetail(entry: ShotEntry): string {
  return [entry.status, entry.shotLabel, entry.browser]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");
}

export function storyStatuses(
  entries: readonly ShotEntry[]
): StoryVisualStatus[] {
  const grouped = new Map<
    string,
    { rank: number; shots: string[]; status: ShotStatus }
  >();

  for (const entry of entries) {
    if (entry.storyId === undefined || entry.storyId === "") {
      continue;
    }

    if (entry.status === undefined || !isShotStatus(entry.status)) {
      continue;
    }

    const shot = shotDetail(entry);
    const current = grouped.get(entry.storyId);

    if (current === undefined) {
      grouped.set(entry.storyId, {
        rank: rank[entry.status],
        shots: [shot],
        status: entry.status,
      });
      continue;
    }

    current.shots.push(shot);

    if (rank[entry.status] > current.rank) {
      current.rank = rank[entry.status];
      current.status = entry.status;
    }
  }

  return [...grouped.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([storyId, story]) => ({
      detail: story.shots.join("; "),
      sidebar: sidebar[story.status],
      status: story.status,
      storyId,
    }));
}

export function summary(stories: readonly StoryVisualStatus[]): string {
  if (stories.length === 0) {
    return "No report yet";
  }

  const counts: Record<ShotStatus, number> = {
    changed: 0,
    error: 0,
    new: 0,
    stale: 0,
    unchanged: 0,
  };

  for (const story of stories) {
    counts[story.status] += 1;
  }

  const attention = stories.length - counts.unchanged;

  if (attention === 0) {
    return "All unchanged";
  }

  const parts = [
    `${attention} ${attention === 1 ? "story needs" : "stories need"} attention`,
  ];

  for (const status of ["new", "changed", "stale", "error"] as const) {
    if (counts[status] > 0) {
      parts.push(`${counts[status]} ${status}`);
    }
  }

  return parts.join(" · ");
}

export function reviewUrlFromOutput(stdout: string): string | null {
  const match = /storybranch review at (?<url>https?:\/\/\S+)/u.exec(stdout);

  return match?.groups?.url ?? null;
}

export function plainText(value: string): string {
  const parts: string[] = [];
  let rest = value;

  while (rest !== "") {
    const start = rest.indexOf("\u001B");

    if (start === -1) {
      parts.push(rest);
      break;
    }

    parts.push(rest.slice(0, start));
    const end = rest.indexOf("m", start);

    if (end === -1) {
      break;
    }

    rest = rest.slice(end + 1);
  }

  return parts.join("").trim();
}

function isNoiseLine(line: string): boolean {
  return (
    line.startsWith("Bun v") ||
    line.startsWith("note:") ||
    line.startsWith("at ")
  );
}

export function failureLine(stderr: string): string {
  const lines = plainText(stderr)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !isNoiseLine(line));

  const error = lines.find((line) => line.startsWith("error:"));
  const line = error ?? lines.at(-1) ?? "visual tests failed";

  return line.length > 300 ? line.slice(0, 300) : line;
}

export function reviewBuildError(stderr: string): string | null {
  const line = plainText(stderr)
    .split("\n")
    .find((item) => item.includes("review UI is not built"));

  return line?.trim() ?? null;
}
