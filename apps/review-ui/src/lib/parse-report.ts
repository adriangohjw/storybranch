import { isReport } from "@storybranch/report";
import type { Report } from "@storybranch/report";

export async function parseReportResponse(response: Response): Promise<Report> {
  const body: unknown = await response.json();

  if (!isReport(body)) {
    throw new Error("invalid report response");
  }

  return body;
}
