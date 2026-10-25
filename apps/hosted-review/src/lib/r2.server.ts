import type { R2BucketBinding } from "~/lib/cloudflare.server";
import type { ObjectStore } from "~/lib/keys";

export function createR2Store(bucket: R2BucketBinding): ObjectStore {
  return {
    async get(key) {
      const object = await bucket.get(key);

      if (object === null) {
        return;
      }

      return Buffer.from(await object.arrayBuffer());
    },
    async list(prefix) {
      const keys: string[] = [];
      let cursor: string | undefined;

      do {
        const page = await bucket.list({ cursor, prefix });

        for (const object of page.objects) {
          keys.push(object.key.slice(prefix.length));
        }

        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor !== undefined);

      return keys;
    },
    async put(key, body, contentType) {
      await bucket.put(key, body, {
        httpMetadata: contentType === undefined ? undefined : { contentType },
      });
    },
  };
}
