import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { r2ObjectsBinding } from "~/lib/cloudflare.server";
import {
  STORYBRANCH_OBJECT_STORAGE_R2,
  env,
} from "~/lib/env";
import type { ObjectStore } from "~/lib/keys";
import { createR2Store } from "~/lib/r2.server";

let store: ObjectStore | undefined;

export function objects(): ObjectStore {
  store ??= createObjectStore();

  return store;
}

export function createObjectStore(): ObjectStore {
  const r2 = r2ObjectsBinding();

  if (r2 !== undefined) {
    return createR2Store(r2);
  }

  if (env.STORYBRANCH_OBJECT_STORAGE === STORYBRANCH_OBJECT_STORAGE_R2) {
    throw new Error(
      "STORYBRANCH_OBJECT_STORAGE=r2 but no OBJECTS R2 binding is available"
    );
  }

  return createS3Store();
}

export function createS3Store(): ObjectStore {
  const bucket = requireS3Env("S3_BUCKET", env.S3_BUCKET);
  const accessKeyId = requireS3Env("S3_ACCESS_KEY", env.S3_ACCESS_KEY);
  const secretAccessKey = requireS3Env("S3_SECRET_KEY", env.S3_SECRET_KEY);
  const endpoint = env.S3_ENDPOINT;

  const client = new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint,
    forcePathStyle:
      env.S3_FORCE_PATH_STYLE === "true" || endpoint !== undefined,
    region: env.S3_REGION,
  });

  return {
    async get(key) {
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );

        const bytes = await result.Body?.transformToByteArray();

        return bytes === undefined ? undefined : Buffer.from(bytes);
      } catch (error) {
        if (isMissing(error)) {
          return;
        }

        throw error;
      }
    },
    async list(prefix) {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
      );

      return (result.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => key !== undefined)
        .map((key) => key.slice(prefix.length));
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: bucket,
          ContentType: contentType,
          Key: key,
        })
      );
    },
  };
}

function requireS3Env(name: string, value: string | undefined): string {
  if (value === undefined) {
    throw new Error(`${name} is required for S3 object storage`);
  }

  return value;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NoSuchKey" || error.name === "NotFound")
  );
}
