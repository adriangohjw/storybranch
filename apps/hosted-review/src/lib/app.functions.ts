import type { Report } from "@storybranch/report";
import { isReport } from "@storybranch/report";
import { createServerFn } from "@tanstack/react-start";

import { mintProjectToken } from "~/lib/ci.server";
import { kysely, newId } from "~/lib/db.server";
import type { ReviewState } from "~/lib/db.server";
import { acceptActualAsBaseline, safeFilename } from "~/lib/keys";
import { canAdmin, canReview, isRole } from "~/lib/roles";
import type { Role } from "~/lib/roles";
import { objects } from "~/lib/s3.server";
import { requireUser } from "~/lib/session.server";

export interface ProjectRow {
  createdAt: string;
  id: string;
  name: string;
}

export interface RunRow {
  branch: string | null;
  commitSha: string;
  createdAt: string;
  id: string;
  prNumber: number | null;
}

export interface TokenRow {
  createdAt: string;
  id: string;
  name: string;
}

function isReviewState(value: string): value is ReviewState {
  return (
    value === "pending" || value === "accepted" || value === "changes_requested"
  );
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

    return rows.map((row) => ({
      createdAt: row.created_at.toISOString(),
      id: row.id,
      name: row.name,
    }));
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
      name,
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
      .select(["id", "commit_sha", "branch", "pr_number", "created_at"])
      .where("project_id", "=", data.projectId)
      .orderBy("created_at", "desc")
      .execute();

    return {
      name: project.name,
      runs: rows.map((row) => ({
        branch: row.branch,
        commitSha: row.commit_sha,
        createdAt: row.created_at.toISOString(),
        id: row.id,
        prNumber: row.pr_number,
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
    }> => {
      await requireUser();

      const row = await kysely()
        .selectFrom("runs")
        .select("report")
        .where("id", "=", data.runId)
        .where("project_id", "=", data.projectId)
        .executeTakeFirst();

      const report = row?.report;

      if (!isReport(report)) {
        throw new Error("unknown run");
      }

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

      return { comments: byShot, report, review };
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
        project_id: data.projectId,
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
      .select(["id", "name", "created_at"])
      .where("project_id", "=", data.projectId)
      .orderBy("created_at", "desc")
      .execute();

    return rows.map((row) => ({
      createdAt: row.created_at.toISOString(),
      id: row.id,
      name: row.name,
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
