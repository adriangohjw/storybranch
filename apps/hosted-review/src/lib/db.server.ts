import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import { optionalEnv, requiredEnv } from "~/lib/env";
import { isRole } from "~/lib/roles";
import type { Role } from "~/lib/roles";
import { APP_SCHEMA } from "~/lib/schema.server";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export type ReviewState = "pending" | "accepted" | "changes_requested";

export function db(): Pool {
  pool ??= new Pool({ connectionString: requiredEnv("DATABASE_URL") });

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureSchema();

  return db().query<T>(text, params);
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  await ensureSchema();
  const client = await db().connect();

  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await db().query(APP_SCHEMA);
    const adminEmail = optionalEnv("STORYBRANCH_ADMIN_EMAIL")?.toLowerCase();

    await db()
      .query(
        `ALTER TABLE IF EXISTS "user"
         ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'`
      )
      .catch(() => {});

    if (adminEmail !== undefined) {
      await db().query(
        `INSERT INTO invites (email, role) VALUES ($1, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        [adminEmail]
      );
    }
  })();

  await schemaReady;
}

export async function inviteRole(email: string): Promise<Role | undefined> {
  const { rows } = await query<{ role: string }>(
    "SELECT role FROM invites WHERE email = $1",
    [email.toLowerCase()]
  );

  const role = rows[0]?.role;

  return isRole(role) ? role : undefined;
}

export async function userRole(userId: string): Promise<Role> {
  const { rows } = await query<{ role: string | null }>(
    `SELECT role FROM "user" WHERE id = $1`,
    [userId]
  );

  const role = rows[0]?.role;

  return isRole(role) ? role : "member";
}

export function newId(): string {
  return randomUUID();
}
