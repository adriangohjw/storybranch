import { createHash, randomBytes } from "node:crypto";

import { isReport } from "@storybranch/report";

import { kysely, newId } from "~/lib/db.server";
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

export function mintProjectToken(): {
  hash: string;
  prefix: string;
  suffix: string;
  token: string;
} {
  const secret = randomBytes(24).toString("hex");
  const token = `sbp_${secret}`;

  return {
    hash: hashToken(token),
    prefix: secret.slice(0, 4),
    suffix: secret.slice(-4),
    token,
  };
}

export async function projectForBearer(
  header: string | null
): Promise<CiProject | undefined> {
  if (header === null || !header.startsWith("Bearer ")) {
    return undefined;
  }

  return kysely()
    .selectFrom("project_tokens as t")
    .innerJoin("projects as p", "p.id", "t.project_id")
    .select(["p.id", "p.name"])
    .where("t.token_hash", "=", hashToken(header.slice("Bearer ".length)))
    .executeTakeFirst();
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

  const snapshots = report.entries.flatMap((entry) =>
    entry.filename !== undefined && safeFilename(entry.filename)
      ? [
          {
            review_state: "pending",
            run_id: runId,
            snapshot_id: entry.filename,
          },
        ]
      : []
  );

  await kysely()
    .transaction()
    .execute(async (trx) => {
      await trx
        .insertInto("runs")
        .values({
          branch,
          commit_sha: commitSha,
          id: runId,
          pr_number: prNumber,
          project_id: projectId,
          report,
        })
        .execute();

      if (snapshots.length > 0) {
        await trx.insertInto("run_snapshots").values(snapshots).execute();
      }
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

  const run = await kysely()
    .selectFrom("runs")
    .select("id")
    .where("id", "=", runId)
    .where("project_id", "=", projectId)
    .executeTakeFirst();

  if (run === undefined) {
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
