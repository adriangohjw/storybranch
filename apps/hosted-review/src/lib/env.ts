import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const server = {
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ENDPOINT: z.url().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_SECRET_KEY: z.string().min(1),
  STORYBRANCH_ADMIN_EMAIL: z.string().min(1).optional(),
  STORYBRANCH_APP_URL: z.url(),
  STORYBRANCH_DANGEROUS_EMAIL_LOG: z.enum(["1"]).optional(),
};

export function createHostedReviewEnv(
  runtimeEnv: Record<string, string | undefined> = process.env
) {
  return createEnv({
    createFinalSchema: (serverFieldSchemas) =>
      z.object(serverFieldSchemas).superRefine((data, ctx) => {
        if (data.STORYBRANCH_DANGEROUS_EMAIL_LOG === "1") {
          return;
        }

        if (data.RESEND_API_KEY === undefined) {
          ctx.addIssue({
            code: "custom",
            message:
              "RESEND_API_KEY is required unless STORYBRANCH_DANGEROUS_EMAIL_LOG=1",
            path: ["RESEND_API_KEY"],
          });
        }

        if (data.RESEND_FROM === undefined) {
          ctx.addIssue({
            code: "custom",
            message:
              "RESEND_FROM is required unless STORYBRANCH_DANGEROUS_EMAIL_LOG=1",
            path: ["RESEND_FROM"],
          });
        }
      }),
    emptyStringAsUndefined: true,
    runtimeEnv: {
      BETTER_AUTH_SECRET: runtimeEnv.BETTER_AUTH_SECRET,
      DATABASE_URL: runtimeEnv.DATABASE_URL,
      RESEND_API_KEY: runtimeEnv.RESEND_API_KEY,
      RESEND_FROM: runtimeEnv.RESEND_FROM,
      S3_ACCESS_KEY: runtimeEnv.S3_ACCESS_KEY,
      S3_BUCKET: runtimeEnv.S3_BUCKET,
      S3_ENDPOINT: runtimeEnv.S3_ENDPOINT,
      S3_FORCE_PATH_STYLE: runtimeEnv.S3_FORCE_PATH_STYLE,
      S3_REGION: runtimeEnv.S3_REGION,
      S3_SECRET_KEY: runtimeEnv.S3_SECRET_KEY,
      STORYBRANCH_ADMIN_EMAIL: runtimeEnv.STORYBRANCH_ADMIN_EMAIL,
      STORYBRANCH_APP_URL: runtimeEnv.STORYBRANCH_APP_URL,
      STORYBRANCH_DANGEROUS_EMAIL_LOG:
        runtimeEnv.STORYBRANCH_DANGEROUS_EMAIL_LOG,
    },
    server,
  });
}

export const env = createHostedReviewEnv();

export function appUrl(): string {
  return env.STORYBRANCH_APP_URL.replace(/\/$/u, "");
}

export function trustedAppOrigins(): string[] {
  const url = appUrl();
  const { hostname, port, protocol } = new URL(url);
  const host = port.length > 0 ? `:${port}` : "";

  if (hostname === "127.0.0.1") {
    return [url, `${protocol}//localhost${host}`];
  }

  if (hostname === "localhost") {
    return [url, `${protocol}//127.0.0.1${host}`];
  }

  return [url];
}

export function dangerousEmailLog(): boolean {
  return env.STORYBRANCH_DANGEROUS_EMAIL_LOG === "1";
}
