import { describe, expect, test } from "bun:test";

import { createHostedReviewEnv } from "~/lib/env";

const valid = {
  BETTER_AUTH_SECRET: "dev-secret-change-me-please-32ch",
  DATABASE_URL: "postgres://storybranch:storybranch@127.0.0.1:5432/storybranch",
  S3_ACCESS_KEY: "test",
  S3_BUCKET: "storybranch",
  S3_SECRET_KEY: "test",
  STORYBRANCH_APP_URL: "http://127.0.0.1:3000",
  STORYBRANCH_DANGEROUS_EMAIL_LOG: "1",
};

describe("hosted-review env", () => {
  test("allows missing Resend when dangerous email log is on", () => {
    const env = createHostedReviewEnv(valid);

    expect(env.STORYBRANCH_DANGEROUS_EMAIL_LOG).toBe("1");
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  test("requires Resend when dangerous email log is off", () => {
    expect(() =>
      createHostedReviewEnv({
        ...valid,
        STORYBRANCH_DANGEROUS_EMAIL_LOG: undefined,
      })
    ).toThrow("Invalid environment variables");
  });

  test("defaults S3 region to us-east-1", () => {
    const env = createHostedReviewEnv(valid);

    expect(env.S3_REGION).toBe("us-east-1");
  });

  test("allows Cloudflare Hyperdrive without DATABASE_URL", () => {
    const env = createHostedReviewEnv({
      BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET,
      S3_ACCESS_KEY: valid.S3_ACCESS_KEY,
      S3_BUCKET: valid.S3_BUCKET,
      S3_SECRET_KEY: valid.S3_SECRET_KEY,
      STORYBRANCH_APP_URL: valid.STORYBRANCH_APP_URL,
      STORYBRANCH_DATABASE: "hyperdrive",
      STORYBRANCH_DANGEROUS_EMAIL_LOG: "1",
    });

    expect(env.STORYBRANCH_DATABASE).toBe("hyperdrive");
    expect(env.DATABASE_URL).toBeUndefined();
  });

  test("allows Cloudflare R2 binding without S3 credentials", () => {
    const env = createHostedReviewEnv({
      BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET,
      DATABASE_URL: valid.DATABASE_URL,
      STORYBRANCH_APP_URL: valid.STORYBRANCH_APP_URL,
      STORYBRANCH_DANGEROUS_EMAIL_LOG: "1",
      STORYBRANCH_OBJECT_STORAGE: "r2",
    });

    expect(env.STORYBRANCH_OBJECT_STORAGE).toBe("r2");
    expect(env.S3_ACCESS_KEY).toBeUndefined();
  });

  test("rejects short auth secret", () => {
    expect(() =>
      createHostedReviewEnv({
        ...valid,
        BETTER_AUTH_SECRET: "too-short",
      })
    ).toThrow();
  });
});
