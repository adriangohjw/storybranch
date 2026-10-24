import { createHash, randomBytes } from "node:crypto";

import { isReport } from "@storybranch/report";

import { newId, query, withClient } from "~/lib/db.server";
import { appUrl } from "~/lib/env";
import { actualKey, baselineKey, diffKey, safeFilename } from "~/lib/keys";
import type { ObjectStore } from "~/lib/keys";

export interface CiProject {
  id: string;
  name: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintProjectToken(): { hash: string; token: string } {
  const token = `sbp_${randomBytes(24).toString("hex")}`;

  return { hash: hashToken(token), token };
}

export async function projectForBearer(
  header: string | null
): Promise<CiProject | undefined> {
  if (header === null || !header.startsWith("Bearer ")) {
    return undefined;
  }

  const { rows } = await query<CiProject>(
    `SELECT p.id, p.name
     FROM project_tokens t
     JOIN projects p ON p.id = t.project_id
     WHERE t.token_hash = $1`,
    [hashToken(header.slice("Bearer ".length))]
  );

  return rows[0];
}

export async function listBaselineNames(
  store: ObjectStore,
  projectId: string
): Promise<string[]> {
  return (await store.list(`projects/${projectId}/baseline/`)).filter(
    (name) => name.length > 0 && !name.includes("/")
  );
}

export async function createRun(
  projectId: string,
  body: unknown
): Promise<{ projectId: string; runId: string; url: string }> {
  if (typeof body !== "object" || body === null) {
    throw new Error("invalid run");
  }

  const commitSha =
    "commitSha" in body && typeof body.commitSha === "string"
      ? body.commitSha
      : undefined;

  const report = "report" in body ? body.report : undefined;

  if (commitSha === undefined || !isReport(report)) {
    throw new Error("commitSha and report are required");
  }

  const runId = newId();
  const branch = stringField(body, "branch");

  const prNumber =
    "prNumber" in body && typeof body.prNumber === "number"
      ? body.prNumber
      : null;

  await withClient(async (client) => {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO runs (
         id, project_id, commit_sha, branch, pr_number, report
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [runId, projectId, commitSha, branch, prNumber, JSON.stringify(report)]
    );

    for (const entry of report.entries) {
      if (entry.filename === undefined || !safeFilename(entry.filename)) {
        continue;
      }

      await client.query(
        `INSERT INTO run_snapshots (run_id, snapshot_id, review_state)
         VALUES ($1, $2, 'pending')`,
        [runId, entry.filename]
      );
    }

    await client.query("COMMIT");
  });

  return {
    projectId,
    runId,
    url: `${appUrl()}/projects/${projectId}/runs/${runId}`,
  };
}

export async function putRunFile(
  store: ObjectStore,
  projectId: string,
  runId: string,
  kind: string,
  filename: string,
  body: Buffer
): Promise<void> {
  if (!safeFilename(filename) || (kind !== "actual" && kind !== "diff")) {
    throw new Error("invalid file");
  }

  const { rows } = await query<{ id: string }>(
    "SELECT id FROM runs WHERE id = $1 AND project_id = $2",
    [runId, projectId]
  );

  if (rows[0] === undefined) {
    throw new Error("unknown run");
  }

  const key =
    kind === "actual"
      ? actualKey(projectId, runId, filename)
      : diffKey(projectId, runId, filename);

  await store.put(key, body, "image/png");
}

export async function getBaselineFile(
  store: ObjectStore,
  projectId: string,
  filename: string
): Promise<Buffer | undefined> {
  if (!safeFilename(filename)) {
    return undefined;
  }

  return store.get(baselineKey(projectId, filename));
}

function stringField(body: object, key: string): string | null {
  if (!(key in body)) {
    return null;
  }

  const value = body[key as keyof typeof body];

  return typeof value === "string" ? value : null;
}
