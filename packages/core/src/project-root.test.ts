import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveProjectRoot, resolveStartDir } from "@/project-root.ts";

test("resolveStartDir prefers --cwd over env and process cwd", () => {
  const previous = process.env.STORYBRANCH_ROOT;
  process.env.STORYBRANCH_ROOT = "/env";

  try {
    expect(
      resolveStartDir({ cwd: "/proc", flagCwd: "/flag" })
    ).toBe(path.resolve("/flag"));
    expect(resolveStartDir({ cwd: "/proc" })).toBe(path.resolve("/env"));
  } finally {
    if (previous === undefined) {
      delete process.env.STORYBRANCH_ROOT;
    } else {
      process.env.STORYBRANCH_ROOT = previous;
    }
  }
});

test("resolveProjectRoot walks up from a subdirectory", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-pkg-"));
  const pkg = path.join(root, "apps", "web");
  await mkdir(path.join(pkg, "src"), { recursive: true });
  await mkdir(path.join(pkg, ".storybook"), { recursive: true });
  await writeFile(path.join(pkg, "package.json"), "{}\n");

  const resolved = await resolveProjectRoot(path.join(pkg, "src", "components"));

  expect(resolved).toBe(pkg);
});

test("resolveProjectRoot errors when no package exists", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-none-"));

  await expect(resolveProjectRoot(root)).rejects.toThrow(
    "no Storybook package found"
  );
});

test("resolveProjectRoot errors on multiple .storybook directories", async () => {
  const pkg = await mkdtemp(path.join(tmpdir(), "storybranch-multi-"));
  await mkdir(path.join(pkg, ".storybook"), { recursive: true });
  await mkdir(path.join(pkg, "docs", ".storybook"), { recursive: true });
  await writeFile(path.join(pkg, "package.json"), "{}\n");

  await expect(resolveProjectRoot(pkg)).rejects.toThrow("exactly one");
});
