import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  gitChangeSet,
  listedChangeSet,
  loadChromaticConfig,
  pickStories,
  testShouldFail,
} from "@/chromatic.ts";

const stories = [
  { id: "button--primary", importPath: "./src/Button.stories.tsx" },
  { id: "icon--default", importPath: "./src/Icon.stories.tsx" },
];

test("pickStories keeps stories whose files changed", () => {
  expect(
    pickStories(stories, {
      externals: [],
      packagePrefix: "apps/web",
      repoPaths: ["apps/web/src/Button.stories.tsx"],
      untraced: [],
    })
  ).toEqual({
    full: false,
    stories: [stories[0]],
  });
});

test("pickStories captures everything when a non-story file changes", () => {
  const picked = pickStories(stories, {
    externals: [],
    packagePrefix: "",
    repoPaths: ["src/Button.tsx"],
    untraced: [],
  });

  expect(picked.full).toBe(true);
  expect(picked.stories).toEqual(stories);
});

test("pickStories drops untraced paths and skips a clean diff", () => {
  expect(
    pickStories(stories, {
      externals: [],
      packagePrefix: "",
      repoPaths: ["README.md"],
      untraced: ["*.md"],
    }).stories
  ).toEqual([]);
});

test("pickStories captures everything when an external changes", () => {
  const picked = pickStories(stories, {
    externals: ["packages/icons/**"],
    packagePrefix: "apps/web",
    repoPaths: ["packages/icons/src/logo.tsx"],
    untraced: [],
  });

  expect(picked.full).toBe(true);
});

test("testShouldFail treats visual diffs as soft when asked", () => {
  const visual = ["pixels hero--default__1200x900__chrome.png"];

  expect(
    testShouldFail(visual, {
      autoAcceptChanges: false,
      exitZeroOnChanges: false,
    })
  ).toBe(true);
  expect(
    testShouldFail(visual, {
      autoAcceptChanges: false,
      exitZeroOnChanges: true,
    })
  ).toBe(false);
  expect(
    testShouldFail(visual, {
      autoAcceptChanges: true,
      exitZeroOnChanges: false,
    })
  ).toBe(false);
  expect(
    testShouldFail(["button--primary story did not finish"], {
      autoAcceptChanges: true,
      exitZeroOnChanges: true,
    })
  ).toBe(true);
});

test("loadChromaticConfig reads the flags Chromatic projects already set", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-chromatic-"));
  await Bun.write(
    path.join(root, "chromatic.config.json"),
    JSON.stringify({
      autoAcceptChanges: true,
      exitZeroOnChanges: true,
      externals: "packages/icons/**\n*.sass",
      onlyChanged: true,
      storybookBuildDir: "storybook-static",
      untraced: ["docs/**"],
    })
  );

  expect(await loadChromaticConfig(root)).toEqual({
    autoAcceptChanges: true,
    exitZeroOnChanges: true,
    externals: ["packages/icons/**", "*.sass"],
    onlyChanged: true,
    storybookBuildDir: "storybook-static",
    untraced: ["docs/**"],
  });
});

test("listedChangeSet accepts a paths-filter file and package-relative paths", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "storybranch-list-"));
  const root = path.join(repo, "apps", "web");
  await mkdir(root, { recursive: true });
  await Bun.write(
    path.join(root, "changed.txt"),
    "src/Button.stories.tsx\napps/web/src/Icon.stories.tsx\n"
  );
  const git = async (...args: string[]) => {
    const proc = Bun.spawn(["git", ...args], {
      cwd: repo,
      stderr: "pipe",
      stdout: "pipe",
    });
    const code = await proc.exited;

    if (code !== 0) {
      throw new Error(await new Response(proc.stderr).text());
    }
  };

  await git("init");

  expect(await listedChangeSet(root, "@changed.txt")).toEqual({
    packagePrefix: "apps/web",
    repoPaths: [
      "apps/web/src/Button.stories.tsx",
      "apps/web/src/Icon.stories.tsx",
    ],
  });
  expect(await listedChangeSet(root, "")).toEqual({
    packagePrefix: "apps/web",
    repoPaths: [],
  });
});

test("gitChangeSet lists files since the base ref", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "storybranch-git-"));
  const git = async (...args: string[]) => {
    const proc = Bun.spawn(
      [
        "git",
        "-c",
        "user.email=test@example.com",
        "-c",
        "user.name=test",
        ...args,
      ],
      { cwd: repo, stderr: "pipe", stdout: "pipe" }
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (code !== 0) {
      throw new Error(stderr);
    }

    return stdout.trim();
  };

  await git("init", "-b", "main");
  await Bun.write(path.join(repo, "README.md"), "base\n");
  await git("add", "README.md");
  await git("commit", "-m", "base");
  const main = await git("rev-parse", "HEAD");
  await git("checkout", "-b", "feature");
  await Bun.write(path.join(repo, "src", "Button.stories.tsx"), "export {};\n");
  await git("add", "src/Button.stories.tsx");
  await git("commit", "-m", "story");
  await git("update-ref", "refs/remotes/origin/main", main);

  const previous = process.env.GITHUB_BASE_REF;
  process.env.GITHUB_BASE_REF = "main";

  try {
    const set = await gitChangeSet(repo);
    expect(set).toEqual({
      packagePrefix: "",
      repoPaths: ["src/Button.stories.tsx"],
    });
  } finally {
    if (previous === undefined) {
      delete process.env.GITHUB_BASE_REF;
    } else {
      process.env.GITHUB_BASE_REF = previous;
    }
  }
});
