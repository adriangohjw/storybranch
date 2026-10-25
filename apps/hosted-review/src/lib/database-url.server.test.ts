import { afterEach, describe, expect, test } from "bun:test";

import { resolveDatabaseUrl } from "~/lib/database-url.server";

const valid = {
  BETTER_AUTH_SECRET: "dev-secret-change-me-please-32ch",
  DATABASE_URL: "postgres://storybranch:storybranch@127.0.0.1:5432/storybranch",
  S3_ACCESS_KEY: "test",
  S3_BUCKET: "storybranch",
  S3_SECRET_KEY: "test",
  STORYBRANCH_APP_URL: "http://127.0.0.1:3000",
  STORYBRANCH_DANGEROUS_EMAIL_LOG: "1",
};

describe("resolveDatabaseUrl", () => {
  afterEach(() => {
    (globalThis as { __env__?: unknown }).__env__ = undefined;
  });

  test("prefers Hyperdrive binding over DATABASE_URL", () => {
    (globalThis as { __env__?: { HYPERDRIVE: { connectionString: string } } })
      .__env__ = {
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive.example/db",
      },
    };

    expect(resolveDatabaseUrl()).toBe("postgres://hyperdrive.example/db");
  });

  test("falls back to DATABASE_URL", () => {
    expect(resolveDatabaseUrl()).toBe(valid.DATABASE_URL);
  });
});
