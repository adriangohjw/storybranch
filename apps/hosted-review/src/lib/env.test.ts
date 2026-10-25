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

  test("accepts optional demo flag", () => {
    const env = createHostedReviewEnv({
      ...valid,
      STORYBRANCH_DEMO_ENABLED: "1",
    });

    expect(env.STORYBRANCH_DEMO_ENABLED).toBe("1");
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
