import type { Report } from "@/report.ts";
import { parseReportResponse } from "./lib/parse-report.ts";

export async function fetchReport(): Promise<Report> {
  const response = await fetch("/api/report");

  if (!response.ok) {
    throw new Error(`report failed: ${response.status}`);
  }

  return await parseReportResponse(response);
}

export async function acceptShot(filename: string): Promise<Report> {
  const response = await fetch(`/api/accept/${encodeURIComponent(filename)}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`accept failed: ${response.status}`);
  }

  return await parseReportResponse(response);
}

export async function acceptAll(): Promise<Report> {
  const response = await fetch("/api/accept-all", { method: "POST" });

  if (!response.ok) {
    throw new Error(`accept all failed: ${response.status}`);
  }

  return await parseReportResponse(response);
}
