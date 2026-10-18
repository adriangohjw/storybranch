#!/usr/bin/env node
import { readFileSync } from "node:fs";

const marker = "<!-- storybranch-visual -->";
const reportPath = process.argv[2];
const runUrl = process.argv[3] ?? "";
const maxRows = 40;

const lines = [marker, "", "### storybranch", ""];

try {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const entries = Array.isArray(report.entries) ? report.entries : [];
  const attention = entries.filter((entry) => entry.status !== "unchanged");
  lines.push(summary(attention), "");

  for (const entry of attention.slice(0, maxRows)) {
    const name = String(entry.filename ?? entry.storyId).replace(/\.png$/u, "");
    lines.push(`- \`${entry.status}\` ${name}`);
  }

  if (attention.length > maxRows) {
    lines.push(`- … and ${attention.length - maxRows} more`);
  }

  lines.push(
    "",
    "Download the `storybranch-visual` artifact (`report.json`, `actual/`, `diff/`). Unpack it into the Storybook package and run `storybranch review` locally."
  );
} catch {
  lines.push(
    "The visual check failed before `report.json` was written.",
    "",
    "Download the workflow logs. If the `storybranch-visual` artifact exists, it has `report.json`, `actual/`, and `diff/`."
  );
}

if (runUrl !== "") {
  lines.push("", `[Workflow run](${runUrl})`);
}

process.stdout.write(`${lines.join("\n")}\n`);

function summary(attention) {
  const counts = { changed: 0, error: 0, new: 0, stale: 0 };

  for (const entry of attention) {
    if (entry.status in counts) {
      counts[entry.status] += 1;
    }
  }

  const total = attention.length;

  if (total === 0) {
    return "The visual check failed without snapshots that need attention.";
  }

  const parts = [
    `${total} snapshot${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} attention`,
  ];

  for (const status of ["new", "changed", "stale", "error"]) {
    if (counts[status] > 0) {
      parts.push(`${counts[status]} ${status}`);
    }
  }

  return parts.join(" · ");
}
