import type { Report } from "@storybranch/report";
import { isReport } from "@storybranch/report";
import { createServerFn } from "@tanstack/react-start";

import { mintProjectToken } from "~/lib/ci.server";
import { kysely, newId } from "~/lib/db.server";
import type { ReviewState } from "~/lib/db.server";
import { acceptActualAsBaseline, safeFilename } from "~/lib/keys";
import { previewProof, summarizeProof } from "~/lib/proof";
import type { ProofSummary } from "~/lib/proof";
import { canAdmin, canReview, isRole } from "~/lib/roles";
import type { Role } from "~/lib/roles";
import { objects } from "~/lib/s3.server";
import { requireUser } from "~/lib/session.server";

export interface LatestRun {
  branch: string | null;
  commitSha: string;
  createdAt: string;
  id: string;
  prNumber: number | null;
  proof: ProofSummary | null;
}

export interface ProjectRow {
  createdAt: string;
  id: string;
  latest: LatestRun | null;
  name: string;
  runCount: number;
}

export interface RunRow {
  branch: string | null;
  commitSha: string;
  createdAt: string;
  id: string;
  prNumber: number | null;
  proof: ProofSummary | null;
}

export interface TokenRow {
  createdAt: string;
  id: string;
  name: string;
  prefix: string;
  suffix: string;
}

function isReviewState(value: string): value is ReviewState {
  return (
    value === "pending" || value === "accepted" || value === "changes_requested"
  );
}

function proofFrom(
  report: unknown,
  review: Readonly<Record<string, string>>
): ProofSummary | null {
  if (!isReport(report)) {
    return null;
  }

  return previewProof(summarizeProof(report.entries, review));
}

function reviewsByRun(
  rows: readonly {
    review_state: string;
    run_id: string;
    snapshot_id: string;
  }[]
): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();

  for (const row of rows) {
    if (!isReviewState(row.review_state)) {
      continue;
    }

    const review = map.get(row.run_id) ?? {};
    review[row.snapshot_id] = row.review_state;
    map.set(row.run_id, review);
  }

  return map;
}

export interface CommentRow {
  authorEmail: string;
  body: string;
  createdAt: string;
  id: string;
}

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectRow[]> => {
    await requireUser();

    const rows = await kysely()
      .selectFrom("projects")
      .select(["id", "name", "created_at"])
      .orderBy("name")
      .execute();

    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);

    const runMeta = await kysely()
      .selectFrom("runs")
      .select(["id", "project_id", "created_at"])
      .where("project_id", "in", ids)
      .execute();

    const countByProject = new Map<string, number>();
    const latestIdByProject = new Map<string, { at: number; id: string }>();

    for (const run of runMeta) {
      countByProject.set(
        run.project_id,
        (countByProject.get(run.project_id) ?? 0) + 1
      );
      const at = run.created_at.getTime();
      const current = latestIdByProject.get(run.project_id);

      if (current === undefined || at > current.at) {
        latestIdByProject.set(run.project_id, { at, id: run.id });
      }
    }

    const latestIds = [...latestIdByProject.values()].map((item) => item.id);

    const latestRows =
      latestIds.length === 0
        ? []
        : await kysely()
            .selectFrom("runs")
            .select([
              "id",
              "project_id",
              "commit_sha",
              "branch",
              "pr_number",
              "created_at",
              "report",
            ])
            .where("id", "in", latestIds)
            .execute();

    const snapshots =
      latestIds.length === 0
        ? []
        : await kysely()
            .selectFrom("run_snapshots")
            .select(["run_id", "snapshot_id", "review_state"])
            .where("run_id", "in", latestIds)
            .execute();

    const reviews = reviewsByRun(snapshots);

    const latestByProject = new Map(
      latestRows.map((row) => [row.project_id, row])
    );

    return rows.map((row) => {
      const latest = latestByProject.get(row.id);

      return {
        createdAt: row.created_at.toISOString(),
        id: row.id,
        latest:
          latest === undefined
            ? null
            : {
                branch: latest.branch,
                commitSha: latest.commit_sha,
                createdAt: latest.created_at.toISOString(),
                id: latest.id,
                prNumber: latest.pr_number,
                proof: proofFrom(latest.report, reviews.get(latest.id) ?? {}),
              },
        name: row.name,
        runCount: countByProject.get(row.id) ?? 0,
      };
    });
  }
);

export const createProject = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<ProjectRow> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      throw new Error("Forbidden");
    }

    const name = data.name.trim();

    if (name.length === 0) {
      throw new Error("name required");
    }

    const id = newId();

    const row = await kysely()
      .insertInto("projects")
      .values({ id, name })
      .returning("created_at")
      .executeTakeFirstOrThrow();

    return {
      createdAt: row.created_at.toISOString(),
      id,
      latest: null,
      name,
      runCount: 0,
    };
  });

export const listRuns = createServerFn({ method: "GET" })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }): Promise<{ name: string; runs: RunRow[] }> => {
    await requireUser();

    const project = await kysely()
      .selectFrom("projects")
      .select("name")
      .where("id", "=", data.projectId)
      .executeTakeFirst();

    if (project === undefined) {
      throw new Error("unknown project");
    }

    const rows = await kysely()
      .selectFrom("runs")
      .select([
        "id",
        "commit_sha",
        "branch",
        "pr_number",
        "created_at",
        "report",
      ])
      .where("project_id", "=", data.projectId)
      .orderBy("created_at", "desc")
      .execute();

    const runIds = rows.map((row) => row.id);

    const snapshots =
      runIds.length === 0
        ? []
        : await kysely()
            .selectFrom("run_snapshots")
            .select(["run_id", "snapshot_id", "review_state"])
            .where("run_id", "in", runIds)
            .execute();

    const reviews = reviewsByRun(snapshots);

    return {
      name: project.name,
      runs: rows.map((row) => ({
        branch: row.branch,
        commitSha: row.commit_sha,
        createdAt: row.created_at.toISOString(),
        id: row.id,
        prNumber: row.pr_number,
        proof: proofFrom(row.report, reviews.get(row.id) ?? {}),
      })),
    };
  });

export const loadRun = createServerFn({ method: "GET" })
  .validator((data: { projectId: string; runId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      comments: Record<string, CommentRow[]>;
      report: Report;
      review: Record<string, ReviewState>;
      run: {
        branch: string | null;
        commitSha: string;
        createdAt: string;
        prNumber: number | null;
      };
    }> => {
      await requireUser();

      const row = await kysely()
        .selectFrom("runs")
        .select(["report", "branch", "commit_sha", "pr_number", "created_at"])
        .where("id", "=", data.runId)
        .where("project_id", "=", data.projectId)
        .executeTakeFirst();

      if (row === undefined || !isReport(row.report)) {
        throw new Error("unknown run");
      }

      const { report } = row;

      const snapshots = await kysely()
        .selectFrom("run_snapshots")
        .select(["snapshot_id", "review_state"])
        .where("run_id", "=", data.runId)
        .execute();

      const comments = await kysely()
        .selectFrom("comments")
        .select(["id", "snapshot_id", "author_email", "body", "created_at"])
        .where("run_id", "=", data.runId)
        .orderBy("created_at")
        .execute();

      const review: Record<string, ReviewState> = {};

      for (const shot of snapshots) {
        if (!isReviewState(shot.review_state)) {
          continue;
        }

        review[shot.snapshot_id] = shot.review_state;
      }

      const byShot: Record<string, CommentRow[]> = {};

      for (const comment of comments) {
        const list = byShot[comment.snapshot_id] ?? [];
        list.push({
          authorEmail: comment.author_email,
          body: comment.body,
          createdAt: comment.created_at.toISOString(),
          id: comment.id,
        });
        byShot[comment.snapshot_id] = list;
      }

      return {
        comments: byShot,
        report,
        review,
        run: {
          branch: row.branch,
          commitSha: row.commit_sha,
          createdAt: row.created_at.toISOString(),
          prNumber: row.pr_number,
        },
      };
    }
  );

export const acceptSnapshot = createServerFn({ method: "POST" })
  .validator(
    (data: { filename: string; projectId: string; runId: string }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireUser();

    if (!canReview(user.role)) {
      throw new Error("Forbidden");
    }

    if (!safeFilename(data.filename)) {
      throw new Error("invalid filename");
    }

    await acceptActualAsBaseline(
      objects(),
      data.projectId,
      data.runId,
      data.filename
    );
    await kysely()
      .updateTable("run_snapshots")
      .set({ review_state: "accepted" })
      .where("run_id", "=", data.runId)
      .where("snapshot_id", "=", data.filename)
      .execute();
  });

export const requestChanges = createServerFn({ method: "POST" })
  .validator(
    (data: { filename: string; projectId: string; runId: string }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireUser();

    if (!canReview(user.role)) {
      throw new Error("Forbidden");
    }

    await kysely()
      .updateTable("run_snapshots")
      .set({ review_state: "changes_requested" })
      .where("run_id", "=", data.runId)
      .where("snapshot_id", "=", data.filename)
      .execute();
  });

export const addComment = createServerFn({ method: "POST" })
  .validator(
    (data: {
      body: string;
      filename: string;
      projectId: string;
      runId: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const body = data.body.trim();

    if (body.length === 0 || !safeFilename(data.filename)) {
      throw new Error("invalid comment");
    }

    await kysely()
      .insertInto("comments")
      .values({
        author_email: user.email,
        body,
        id: newId(),
        run_id: data.runId,
        snapshot_id: data.filename,
        user_id: user.id,
      })
      .execute();
  });

export const inviteUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; role: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      throw new Error("Forbidden");
    }

    if (!isRole(data.role)) {
      throw new Error("invalid role");
    }

    const email = data.email.trim().toLowerCase();

    if (!email.includes("@")) {
      throw new Error("invalid email");
    }

    await kysely()
      .insertInto("invites")
      .values({ email, role: data.role })
      .onConflict((oc) => oc.column("email").doUpdateSet({ role: data.role }))
      .execute();
  });

export const createToken = createServerFn({ method: "POST" })
  .validator((data: { name: string; projectId: string }) => data)
  .handler(async ({ data }): Promise<{ token: string }> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      throw new Error("Forbidden");
    }

    const minted = mintProjectToken();
    await kysely()
      .insertInto("project_tokens")
      .values({
        id: newId(),
        name: data.name.trim() || "ci",
        prefix: minted.prefix,
        project_id: data.projectId,
        suffix: minted.suffix,
        token_hash: minted.hash,
      })
      .execute();

    return { token: minted.token };
  });

export const listTokens = createServerFn({ method: "GET" })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }): Promise<TokenRow[]> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      return [];
    }

    const rows = await kysely()
      .selectFrom("project_tokens")
      .select(["id", "name", "prefix", "suffix", "created_at"])
      .where("project_id", "=", data.projectId)
      .orderBy("created_at", "desc")
      .execute();

    return rows.map((row) => ({
      createdAt: row.created_at.toISOString(),
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      suffix: row.suffix,
    }));
  });

export const revokeToken = createServerFn({ method: "POST" })
  .validator((data: { projectId: string; tokenId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      throw new Error("Forbidden");
    }

    await kysely()
      .deleteFrom("project_tokens")
      .where("id", "=", data.tokenId)
      .where("project_id", "=", data.projectId)
      .execute();
  });

export const listInvites = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ email: string; role: Role }[]> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      return [];
    }

    const rows = await kysely()
      .selectFrom("invites")
      .select(["email", "role"])
      .orderBy("email")
      .execute();

    return rows.flatMap((row) =>
      isRole(row.role) ? [{ email: row.email, role: row.role }] : []
    );
  }
);
