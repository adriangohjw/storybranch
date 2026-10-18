import { expect, test } from "bun:test";

import { parseReportResponse } from "@/lib/parse-report.ts";

const report = {
  actualDir: "/actual",
  commit: "abc",
  createdAt: "2026-10-18T00:00:00.000Z",
  entries: [],
  root: "/pkg",
};

test("parseReportResponse returns the report body", async () => {
  expect(await parseReportResponse(Response.json(report))).toEqual(report);
});

test("parseReportResponse rejects a body that is not a report", async () => {
  await expect(parseReportResponse(Response.json([]))).rejects.toThrow(
    "invalid report response"
  );
});
