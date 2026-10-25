import { describe, expect, test } from "bun:test";

import type { R2BucketBinding } from "~/lib/cloudflare.server";
import { createR2Store } from "~/lib/r2.server";

function memoryR2(): R2BucketBinding {
  const map = new Map<string, Buffer>();

  return {
    async get(key) {
      const body = map.get(key);

      if (body === undefined) {
        return null;
      }

      return {
        key,
        async arrayBuffer(): Promise<ArrayBuffer> {
          const slice = body.buffer.slice(
            body.byteOffset,
            body.byteOffset + body.byteLength
          );

          return slice as ArrayBuffer;
        },
      };
    },
    async head(key) {
      return map.has(key) ? { key } : null;
    },
    async list({ prefix = "" } = {}) {
      const objects = [...map.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key }));

      return { cursor: undefined, objects, truncated: false };
    },
    async put(key, value) {
      const bytes =
        typeof value === "string"
          ? Buffer.from(value)
          : Buffer.from(value as ArrayBuffer);

      map.set(key, bytes);

      return { key };
    },
  };
}

describe("createR2Store", () => {
  test("round-trips objects", async () => {
    const store = createR2Store(memoryR2());

    await store.put("projects/p1/baseline/a.png", Buffer.from("png"), "image/png");

    expect(await store.get("projects/p1/baseline/a.png")).toEqual(
      Buffer.from("png")
    );
    expect(await store.list("projects/p1/baseline/")).toEqual(["a.png"]);
  });
});
