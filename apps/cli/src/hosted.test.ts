import { expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Report } from "@storybranch/report";

import {
  assertSafeFilename,
  fetchHostedBaselines,
  githubContextFromEnv,
  hashProjectToken,
  HOSTED_COMMENT_MARKER,
  prCommentBody,
  publishGitHub,
  resolveHostedConfig,
  statusDescription,
  uploadHostedRun,
} from "@/hosted.ts";

test("hosted config is off unless both token and api url are set", () => {
  expect(resolveHostedConfig({}, {})).toBeNull();
  expect(resolveHostedConfig({ STORYBRANCH_PROJECT_TOKEN: "tok" }, {})).toEqual(
    {
      error:
        "hosted review needs both STORYBRANCH_PROJECT_TOKEN (or --project-token) and STORYBRANCH_API_URL (or --api-url)",
    }
  );
  expect(
    resolveHostedConfig(
      {
        STORYBRANCH_API_URL: "http://review.example",
        STORYBRANCH_PROJECT_TOKEN: "tok",
      },
      {}
    )
  ).toEqual({ apiUrl: "http://review.example", token: "tok" });
  expect(
    resolveHostedConfig(
      {
        STORYBRANCH_API_URL: "http://env.example/",
        STORYBRANCH_PROJECT_TOKEN: "env",
      },
      { apiUrl: "http://flag.example", projectToken: "flag" }
    )
  ).toEqual({ apiUrl: "http://flag.example", token: "flag" });
});

test("token hash is sha256 hex", () => {
  expect(hashProjectToken("sbp_test")).toHaveLength(64);
});

test("unsafe snapshot filenames are rejected", () => {
  expect(() => {
    assertSafeFilename("../x.png");
  }).toThrow("unsafe");
  assertSafeFilename("hero--default__1200x900__chrome.png");
});

test("downloads hosted baselines and ignores extra git files", async () => {
  const png = Buffer.from([137, 80, 78, 71]);
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/api/ci/baselines")) {
      return Response.json({ files: ["shot.png"] });
    }

    if (url.endsWith("/api/ci/baselines/shot.png")) {
      return new Response(png, { headers: { "content-type": "image/png" } });
    }

    return new Response("no", { status: 404 });
  };

  const dir = await fetchHostedBaselines(
    { apiUrl: "http://review.example", token: "tok" },
    fetchFn
  );

  expect(await readFile(path.join(dir, "shot.png"))).toEqual(png);
});

test("uploads run artifacts then posts GitHub status and one PR comment", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "storybranch-hosted-up-"));
  const actual = path.join(root, "actual.png");
  await writeFile(actual, Buffer.from("png"));
  const report = sampleReport(actual);
  const calls: { body?: string; method?: string; url: string }[] = [];

  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({
      body: typeof init?.body === "string" ? init.body : undefined,
      method: init?.method,
      url,
    });

    if (url.endsWith("/api/ci/runs") && init?.method === "POST") {
      return Response.json({
        projectId: "proj",
        runId: "run-1",
        url: "http://review.example/projects/proj/runs/run-1",
      });
    }

    if (url.includes("/files/actual/") && init?.method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (url.includes("/statuses/")) {
      return new Response(null, { status: 201 });
    }

    if (url.includes("/issues/12/comments") && init?.method !== "POST") {
      return Response.json([]);
    }

    if (url.includes("/issues/12/comments") && init?.method === "POST") {
      expect(String(init.body)).toContain(HOSTED_COMMENT_MARKER);
      expect(String(init.body)).toContain("1 snapshot need attention");

      return new Response(null, { status: 201 });
    }

    return new Response(`unexpected ${url}`, { status: 500 });
  };

  const uploaded = await uploadHostedRun(
    { apiUrl: "http://review.example", token: "tok" },
    report,
    fetchFn
  );

  expect(uploaded.runId).toBe("run-1");

  await publishGitHub(
    {
      owner: "acme",
      prNumber: 12,
      repo: "app",
      sha: "abc",
      token: "gh",
    },
    uploaded,
    report,
    fetchFn
  );

  expect(calls.some((call) => call.url.includes("/statuses/abc"))).toBe(true);
  expect(
    calls.filter(
      (call) => call.url.includes("/comments") && call.method === "POST"
    )
  ).toHaveLength(1);
});

test("GitHub context stays unset without GITHUB_TOKEN", () => {
  expect(
    githubContextFromEnv({
      GITHUB_REPOSITORY: "acme/app",
      GITHUB_SHA: "abc",
    })
  ).toBeUndefined();
  expect(
    githubContextFromEnv({
      GITHUB_REF: "refs/pull/9/merge",
      GITHUB_REPOSITORY: "acme/app",
      GITHUB_SHA: "abc",
      GITHUB_TOKEN: "gh",
    })
  ).toEqual({
    owner: "acme",
    prNumber: 9,
    repo: "app",
    sha: "abc",
    token: "gh",
  });
});

test("status description stays within GitHub's 140 character cap", () => {
  const description = statusDescription(
    sampleReport("/tmp/a.png"),
    "https://review.example/projects/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/runs/ffffffff-1111-2222-3333-444444444444"
  );

  expect(description.length).toBeLessThanOrEqual(140);
});

test("PR comment includes the run link", () => {
  expect(prCommentBody(sampleReport("/tmp/a.png"), "http://r/run")).toContain(
    "http://r/run"
  );
});

function sampleReport(actualPath: string): Report {
  return {
    actualDir: "/tmp",
    commit: "abc",
    createdAt: "2026-01-01T00:00:00.000Z",
    durationMs: 10,
    entries: [
      {
        actualPath,
        filename: "hero--default__1200x900__chrome.png",
        status: "new",
        storyId: "hero--default",
      },
    ],
    root: "/tmp",
    storyCount: 1,
  };
}
