import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveProjectRoot, resolveStartDir } from "@/project-root.ts";

test("resolveStartDir prefers --cwd over env and process cwd", () => {
  const previous = process.env.STORYBRANCH_ROOT;
  process.env.STORYBRANCH_ROOT = "/env";

  try {
    expect(resolveStartDir({ cwd: "/proc", flagCwd: "/flag" })).toBe(
      path.resolve("/flag")
    );
    expect(resolveStartDir({ cwd: "/proc", flagCwd: "" })).toBe(
      path.resolve("/env")
    );
    expect(resolveStartDir({ cwd: "/proc" })).toBe(path.resolve("/env"));
  } finally {
    if (previous === undefined) {
      delete process.env.STORYBRANCH_ROOT;
    } else {
      process.env.STORYBRANCH_ROOT = previous;
    }
  }
});

test("resolveStartDir uses cwd when --cwd and STORYBRANCH_ROOT are unset", () => {
  const previous = process.env.STORYBRANCH_ROOT;
  delete process.env.STORYBRANCH_ROOT;

  try {
    expect(resolveStartDir({ cwd: "/proc" })).toBe(path.resolve("/proc"));
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

  const resolved = await resolveProjectRoot(
    path.join(pkg, "src", "components")
  );

  expect(resolved).toBe(pkg);
});

test("resolveProjectRoot errors when no package exists", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-none-"));

  await expect(resolveProjectRoot(root)).rejects.toThrow(
    "no Storybook package found"
  );
});

test("resolveProjectRoot returns the package when started at its root", async () => {
  const pkg = await mkdtemp(path.join(tmpdir(), "storybranch-here-"));
  await storybookPackage(pkg);

  expect(await resolveProjectRoot(pkg)).toBe(pkg);
});

test("resolveProjectRoot picks the nearest package among siblings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-siblings-"));
  const web = path.join(root, "apps", "web");
  const admin = path.join(root, "apps", "admin");
  await storybookPackage(web);
  await storybookPackage(admin);
  await mkdir(path.join(web, "src"), { recursive: true });

  expect(await resolveProjectRoot(path.join(web, "src"))).toBe(web);
});

test("resolveProjectRoot stops at a nested package instead of its parent", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "storybranch-parent-"));
  const child = path.join(parent, "apps", "web");
  await storybookPackage(parent);
  await storybookPackage(child);

  expect(await resolveProjectRoot(path.join(child, "src"))).toBe(child);
});

test("resolveProjectRoot ignores a directory that has only one marker", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-partial-"));
  await mkdir(path.join(root, ".storybook"), { recursive: true });
  await expect(resolveProjectRoot(root)).rejects.toThrow(
    "no Storybook package found"
  );

  const manifestOnly = await mkdtemp(
    path.join(tmpdir(), "storybranch-manifest-")
  );
  await writeFile(path.join(manifestOnly, "package.json"), "{}\n");
  await expect(resolveProjectRoot(manifestOnly)).rejects.toThrow(
    "no Storybook package found"
  );

  const parent = await mkdtemp(path.join(tmpdir(), "storybranch-walk-past-"));
  const incomplete = path.join(parent, "apps", "web");
  await storybookPackage(parent);
  await mkdir(incomplete, { recursive: true });
  await writeFile(path.join(incomplete, "package.json"), "{}\n");

  expect(await resolveProjectRoot(incomplete)).toBe(parent);
});

test("resolveProjectRoot ignores .storybook inside node_modules and .git", async () => {
  const pkg = await mkdtemp(path.join(tmpdir(), "storybranch-ignored-"));
  await storybookPackage(pkg);
  await mkdir(path.join(pkg, "node_modules", "dep", ".storybook"), {
    recursive: true,
  });
  await mkdir(path.join(pkg, ".git", "hooks", ".storybook"), {
    recursive: true,
  });

  expect(await resolveProjectRoot(pkg)).toBe(pkg);
});

test("resolveProjectRoot errors on multiple .storybook directories", async () => {
  const pkg = await mkdtemp(path.join(tmpdir(), "storybranch-multi-"));
  await mkdir(path.join(pkg, ".storybook"), { recursive: true });
  await mkdir(path.join(pkg, "docs", ".storybook"), { recursive: true });
  await writeFile(path.join(pkg, "package.json"), "{}\n");

  await expect(resolveProjectRoot(pkg)).rejects.toThrow("exactly one");
});

async function storybookPackage(dir: string): Promise<void> {
  await mkdir(path.join(dir, "src"), { recursive: true });
  await mkdir(path.join(dir, ".storybook"), { recursive: true });
  await writeFile(path.join(dir, "package.json"), "{}\n");
}
