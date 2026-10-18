import { expect, test } from "bun:test";

import { publishedManifest } from "../scripts/published-manifest.mjs";

interface RootManifest {
  catalog: Record<string, string>;
}

interface CliManifest {
  dependencies: Record<string, string>;
}

test("published runtime versions match the root catalog", async () => {
  const root = (await Bun.file(
    new URL("../../../package.json", import.meta.url)
  ).json()) as RootManifest;
  const cli = (await Bun.file(
    new URL("../package.json", import.meta.url)
  ).json()) as CliManifest;

  for (const [name, version] of Object.entries(cli.dependencies)) {
    expect(root.catalog[name]).toBe(version);
  }
});

test("published manifest drops workspace dev dependencies", () => {
  const manifest = publishedManifest(
    {
      dependencies: { picocolors: "catalog:" },
      devDependencies: { "@storybranch/core": "workspace:*" },
      name: "@adriangohjw/storybranch",
      scripts: { prepack: "build" },
    },
    { picocolors: "^1.1.1" }
  );

  expect(manifest).toEqual({
    dependencies: { picocolors: "^1.1.1" },
    name: "@adriangohjw/storybranch",
  });
});
