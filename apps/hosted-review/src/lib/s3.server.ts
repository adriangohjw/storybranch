import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "~/lib/env";
import type { ObjectStore } from "~/lib/keys";

let store: ObjectStore | undefined;

export function objects(): ObjectStore {
  store ??= createS3Store();

  return store;
}

export function createS3Store(): ObjectStore {
  const bucket = env.S3_BUCKET;
  const endpoint = env.S3_ENDPOINT;

  const client = new S3Client({
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
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

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NoSuchKey" || error.name === "NotFound")
  );
}
