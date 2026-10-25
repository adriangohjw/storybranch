import { randomUUID } from "node:crypto";

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { DB } from "~/generated/types";
import { resolveDatabaseUrl } from "~/lib/database-url.server";
import { env } from "~/lib/env";
import { isRole } from "~/lib/roles";
import type { Role } from "~/lib/roles";

let pool: Pool | undefined;
let database: Kysely<DB> | undefined;
let adminReady: Promise<void> | undefined;

export type ReviewState = "pending" | "accepted" | "changes_requested";

export function db(): Pool {
  pool ??= new Pool({ connectionString: resolveDatabaseUrl() });

  return pool;
}

export function kysely(): Kysely<DB> {
  database ??= new Kysely<DB>({
    dialect: new PostgresDialect({ pool: db() }),
  });

  return database;
}

export async function ensureAdmin(): Promise<void> {
  adminReady ??= (async () => {
    const adminEmail = env.STORYBRANCH_ADMIN_EMAIL?.toLowerCase();

    if (adminEmail === undefined) {
      return;
    }

    await kysely()
      .insertInto("invites")
      .values({ email: adminEmail, role: "admin" })
      .onConflict((oc) => oc.column("email").doNothing())
      .execute();
  })();

  await adminReady;
}

export async function inviteRole(email: string): Promise<Role | undefined> {
  const row = await kysely()
    .selectFrom("invites")
    .select("role")
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();

  return isRole(row?.role) ? row.role : undefined;
}

export async function userRole(userId: string): Promise<Role> {
  const row = await kysely()
    .selectFrom("user")
    .select("role")
    .where("id", "=", userId)
    .executeTakeFirst();

  return isRole(row?.role) ? row.role : "member";
}

export function newId(): string {
  return randomUUID();
}
