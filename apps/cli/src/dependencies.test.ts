import { expect, test } from "bun:test";

import { publishedManifest } from "../scripts/published-manifest.mjs";

interface RootManifest {
  catalog: Record<string, string>;
}

interface CliManifest {
  dependencies: Record<string, string>;
}

test("cli runtime dependencies use the root catalog", async () => {
  const root = (await Bun.file(
    new URL("../../../package.json", import.meta.url)
  ).json()) as RootManifest;
  const cli = (await Bun.file(
    new URL("../package.json", import.meta.url)
  ).json()) as CliManifest;

  for (const [name, version] of Object.entries(cli.dependencies)) {
    expect(version).toBe("catalog:");
    expect(root.catalog[name]).toBeDefined();
  }
});

test("published manifest drops workspace dev dependencies and scripts", () => {
  const manifest = publishedManifest({
    dependencies: { picocolors: "catalog:" },
    devDependencies: { "@storybranch/core": "workspace:*" },
    name: "@adriangohjw/storybranch",
    scripts: { prepack: "build" },
  });

  expect(manifest).toEqual({
    dependencies: { picocolors: "catalog:" },
    name: "@adriangohjw/storybranch",
  });
});

test("published manifest rejects workspace runtime dependencies", () => {
  expect(() =>
    publishedManifest({
      dependencies: { "@storybranch/core": "workspace:*" },
      name: "@adriangohjw/storybranch",
    })
  ).toThrow(/must be bundled/);
});
