import { createHash } from "node:crypto";

import { expect, test } from "bun:test";

import { mintProjectToken } from "~/lib/ci.server";

test("minted project token is a hashed secret with a short hint", () => {
  const minted = mintProjectToken();
  const secret = minted.token.slice("sbp_".length);

  expect(minted.token).toMatch(/^sbp_[0-9a-f]{48}$/);
  expect(minted.hash).toBe(
    createHash("sha256").update(minted.token).digest("hex")
  );
  expect(minted.prefix).toBe(secret.slice(0, 4));
  expect(minted.suffix).toBe(secret.slice(-4));
  expect(minted.hash).not.toContain(secret);
});
