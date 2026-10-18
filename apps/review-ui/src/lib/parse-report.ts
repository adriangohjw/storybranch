import type { Report } from "@storybranch/report";

function isReport(value: unknown): value is Report {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("commit" in value) || typeof value.commit !== "string") {
    return false;
  }

  if (!("actualDir" in value) || typeof value.actualDir !== "string") {
    return false;
  }

  if (!("createdAt" in value) || typeof value.createdAt !== "string") {
    return false;
  }

  if (!("root" in value) || typeof value.root !== "string") {
    return false;
  }

  if (
    "durationMs" in value &&
    value.durationMs !== undefined &&
    typeof value.durationMs !== "number"
  ) {
    return false;
  }

  if (
    "storyCount" in value &&
    value.storyCount !== undefined &&
    typeof value.storyCount !== "number"
  ) {
    return false;
  }

  return "entries" in value && Array.isArray(value.entries);
}

export async function parseReportResponse(response: Response): Promise<Report> {
  const body: unknown = await response.json();

  if (!isReport(body)) {
    throw new Error("invalid report response");
  }

  return body;
}
