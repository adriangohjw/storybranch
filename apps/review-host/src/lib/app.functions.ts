import type { Report } from "@storybranch/report";
import { isReport } from "@storybranch/report";
import { createServerFn } from "@tanstack/react-start";

import { mintProjectToken } from "~/lib/ci.server";
import { newId, query } from "~/lib/db.server";
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

export interface CommentRow {
  authorEmail: string;
  body: string;
  createdAt: string;
  id: string;
}

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProjectRow[]> => {
    await requireUser();

    const { rows } = await query<{
      created_at: Date;
      id: string;
      name: string;
    }>("SELECT id, name, created_at FROM projects ORDER BY name");

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

    const { rows } = await query<{ created_at: Date }>(
      "INSERT INTO projects (id, name) VALUES ($1, $2) RETURNING created_at",
      [id, name]
    );

    return {
      createdAt: rows[0]?.created_at.toISOString() ?? new Date().toISOString(),
      id,
      name,
    };
  });

export const listRuns = createServerFn({ method: "GET" })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }): Promise<{ name: string; runs: RunRow[] }> => {
    await requireUser();

    const project = await query<{ name: string }>(
      "SELECT name FROM projects WHERE id = $1",
      [data.projectId]
    );

    if (project.rows[0] === undefined) {
      throw new Error("unknown project");
    }

    const { rows } = await query<{
      branch: string | null;
      commit_sha: string;
      created_at: Date;
      id: string;
      pr_number: number | null;
    }>(
      `SELECT id, commit_sha, branch, pr_number, created_at
       FROM runs WHERE project_id = $1
       ORDER BY created_at DESC`,
      [data.projectId]
    );

    return {
      name: project.rows[0].name,
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

      const { rows } = await query<{ report: unknown }>(
        "SELECT report FROM runs WHERE id = $1 AND project_id = $2",
        [data.runId, data.projectId]
      );

      const report = rows[0]?.report;

      if (!isReport(report)) {
        throw new Error("unknown run");
      }

      const snapshots = await query<{
        review_state: ReviewState;
        snapshot_id: string;
      }>(
        "SELECT snapshot_id, review_state FROM run_snapshots WHERE run_id = $1",
        [data.runId]
      );

      const comments = await query<{
        author_email: string;
        body: string;
        created_at: Date;
        id: string;
        snapshot_id: string;
      }>(
        `SELECT id, snapshot_id, author_email, body, created_at
         FROM comments WHERE run_id = $1 ORDER BY created_at`,
        [data.runId]
      );

      const review: Record<string, ReviewState> = {};

      for (const row of snapshots.rows) {
        review[row.snapshot_id] = row.review_state;
      }

      const byShot: Record<string, CommentRow[]> = {};

      for (const row of comments.rows) {
        const list = byShot[row.snapshot_id] ?? [];
        list.push({
          authorEmail: row.author_email,
          body: row.body,
          createdAt: row.created_at.toISOString(),
          id: row.id,
        });
        byShot[row.snapshot_id] = list;
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
    await query(
      `UPDATE run_snapshots SET review_state = 'accepted'
       WHERE run_id = $1 AND snapshot_id = $2`,
      [data.runId, data.filename]
    );
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

    await query(
      `UPDATE run_snapshots SET review_state = 'changes_requested'
       WHERE run_id = $1 AND snapshot_id = $2`,
      [data.runId, data.filename]
    );
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

    await query(
      `INSERT INTO comments (id, run_id, snapshot_id, user_id, author_email, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId(), data.runId, data.filename, user.id, user.email, body]
    );
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

    await query(
      `INSERT INTO invites (email, role) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`,
      [email, data.role]
    );
  });

export const createToken = createServerFn({ method: "POST" })
  .validator((data: { name: string; projectId: string }) => data)
  .handler(async ({ data }): Promise<{ token: string }> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      throw new Error("Forbidden");
    }

    const minted = mintProjectToken();
    await query(
      `INSERT INTO project_tokens (id, project_id, name, token_hash)
       VALUES ($1, $2, $3, $4)`,
      [newId(), data.projectId, data.name.trim() || "ci", minted.hash]
    );

    return { token: minted.token };
  });

export const listInvites = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ email: string; role: Role }[]> => {
    const user = await requireUser();

    if (!canAdmin(user.role)) {
      return [];
    }

    const { rows } = await query<{ email: string; role: Role }>(
      "SELECT email, role FROM invites ORDER BY email"
    );

    return rows;
  }
);
