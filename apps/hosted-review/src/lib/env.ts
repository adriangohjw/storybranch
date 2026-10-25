import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Set in `wrangler.toml` `[vars]` when using the `OBJECTS` R2 binding. */
export const STORYBRANCH_OBJECT_STORAGE_R2 = "r2";

/** Set in `wrangler.toml` `[vars]` when using the `HYPERDRIVE` binding. */
export const STORYBRANCH_DATABASE_HYPERDRIVE = "hyperdrive";

const server = {
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ENDPOINT: z.url().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_SECRET_KEY: z.string().min(1).optional(),
  STORYBRANCH_ADMIN_EMAIL: z.string().min(1).optional(),
  STORYBRANCH_APP_URL: z.url(),
  STORYBRANCH_DANGEROUS_EMAIL_LOG: z.enum(["1"]).optional(),
  STORYBRANCH_DATABASE: z.literal(STORYBRANCH_DATABASE_HYPERDRIVE).optional(),
  STORYBRANCH_OBJECT_STORAGE: z.literal(STORYBRANCH_OBJECT_STORAGE_R2).optional(),
};

export function createHostedReviewEnv(
  runtimeEnv: Record<string, string | undefined> = process.env
) {
  return createEnv({
    createFinalSchema: (serverFieldSchemas) =>
      z.object(serverFieldSchemas).superRefine((data, ctx) => {
        if (
          data.STORYBRANCH_DATABASE !== STORYBRANCH_DATABASE_HYPERDRIVE &&
          data.DATABASE_URL === undefined
        ) {
          ctx.addIssue({
            code: "custom",
            message:
              "DATABASE_URL is required unless STORYBRANCH_DATABASE=hyperdrive (Cloudflare Hyperdrive binding)",
            path: ["DATABASE_URL"],
          });
        }

        if (data.STORYBRANCH_OBJECT_STORAGE !== STORYBRANCH_OBJECT_STORAGE_R2) {
          for (const key of [
            "S3_ACCESS_KEY",
            "S3_BUCKET",
            "S3_SECRET_KEY",
          ] as const) {
            if (data[key] === undefined) {
              ctx.addIssue({
                code: "custom",
                message: `${key} is required unless STORYBRANCH_OBJECT_STORAGE=r2 (Cloudflare R2 binding)`,
                path: [key],
              });
            }
          }
        }

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
      STORYBRANCH_DATABASE: runtimeEnv.STORYBRANCH_DATABASE,
      STORYBRANCH_OBJECT_STORAGE: runtimeEnv.STORYBRANCH_OBJECT_STORAGE,
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
