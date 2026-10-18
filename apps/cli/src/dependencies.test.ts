import { expect, test } from "bun:test";

import { publishedManifest } from "../scripts/published-manifest.mjs";

interface RootManifest {
  catalog: Record<string, string>;
}

interface CliManifest {
  dependencies: Record<string, string>;
}

test("published command runs on node", async () => {
  const pkg = (await Bun.file(
    new URL("../package.json", import.meta.url)
  ).json()) as {
    engines: { node: string };
    scripts: { build: string; "build:cli": string };
  };
  const bin = await Bun.file(
    new URL("../bin/storybranch.js", import.meta.url)
  ).text();

  expect(pkg.engines.node).toBe(">=22.18.0");
  expect(pkg.scripts.build).toContain("build:cli");
  expect(pkg.scripts["build:cli"]).toContain("--target node");
  expect(pkg.scripts["build:cli"]).not.toContain("--target bun");
  expect(bin.startsWith("#!/usr/bin/env node\n")).toBe(true);
  expect(withoutDirname(bin)).not.toContain("import.meta.dir");

  const dist = await Bun.file(
    new URL("../dist/cli.js", import.meta.url)
  ).text();

  expect(dist).not.toContain("Bun.");
  expect(withoutDirname(dist)).not.toContain("import.meta.dir");
  expect(dist.startsWith("#!/usr/bin/env node\n")).toBe(true);
});

function withoutDirname(source: string): string {
  return source.replaceAll("import.meta.dirname", "");
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

test("published manifest drops workspace dev dependencies and keeps chromium postinstall", () => {
  const manifest = publishedManifest({
    dependencies: { picocolors: "catalog:" },
    devDependencies: { "@storybranch/core": "workspace:*" },
    name: "@adriangohjw/storybranch",
    scripts: { prepack: "build" },
  });

  expect(manifest).toEqual({
    dependencies: { picocolors: "catalog:" },
    name: "@adriangohjw/storybranch",
    scripts: { postinstall: "playwright install chromium" },
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
