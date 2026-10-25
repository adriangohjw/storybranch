import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { Report } from "@storybranch/report";
import { attentionSummary } from "@storybranch/report";

export interface HostedConfig {
  apiUrl: string;
  token: string;
}

export interface HostedUpload {
  projectId: string;
  runId: string;
  url: string;
}

export interface GitHubContext {
  owner: string;
  prNumber: number | undefined;
  repo: string;
  sha: string;
  token: string;
}

type FetchFn = typeof fetch;

export function resolveHostedConfig(
  env: NodeJS.ProcessEnv,
  flags: { apiUrl?: string; projectToken?: string }
): HostedConfig | { error: string } | null {
  const token =
    emptyToUndefined(flags.projectToken) ??
    emptyToUndefined(env.STORYBRANCH_PROJECT_TOKEN);

  const apiUrl =
    emptyToUndefined(flags.apiUrl) ?? emptyToUndefined(env.STORYBRANCH_API_URL);

  if (token === undefined && apiUrl === undefined) {
    return null;
  }

  if (token === undefined || apiUrl === undefined) {
    return {
      error:
        "hosted review needs both STORYBRANCH_PROJECT_TOKEN (or --project-token) and STORYBRANCH_API_URL (or --api-url)",
    };
  }

  return { apiUrl: apiUrl.replace(/\/$/u, ""), token };
}

export async function fetchHostedBaselines(
  hosted: HostedConfig,
  fetchFn: FetchFn = fetch
): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "storybranch-hosted-"));

  const listed = await jsonRequest<{ files: string[] }>(
    fetchFn,
    `${hosted.apiUrl}/api/ci/baselines`,
    { headers: authHeaders(hosted.token) }
  );

  await mkdir(dir, { recursive: true });

  await Promise.all(
    listed.files.map(async (filename) => {
      assertSafeFilename(filename);

      const response = await fetchFn(
        `${hosted.apiUrl}/api/ci/baselines/${encodeURIComponent(filename)}`,
        { headers: authHeaders(hosted.token) }
      );

      if (!response.ok) {
        throw new Error(`baseline ${filename} returned ${response.status}`);
      }

      await writeFile(
        path.join(dir, filename),
        Buffer.from(await response.arrayBuffer())
      );
    })
  );

  return dir;
}

export async function uploadHostedRun(
  hosted: HostedConfig,
  report: Report,
  fetchFn: FetchFn = fetch
): Promise<HostedUpload> {
  const created = await jsonRequest<HostedUpload>(
    fetchFn,
    `${hosted.apiUrl}/api/ci/runs`,
    {
      body: JSON.stringify({
        branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME,
        commitSha: report.commit,
        prNumber: prNumberFromEnv(process.env),
        report,
      }),
      headers: {
        ...authHeaders(hosted.token),
        "content-type": "application/json",
      },
      method: "POST",
    }
  );

  for (const entry of report.entries) {
    if (entry.filename === undefined) {
      continue;
    }

    if (entry.actualPath !== undefined) {
      await putFile(
        fetchFn,
        hosted,
        created.runId,
        "actual",
        entry.filename,
        entry.actualPath
      );
    }

    if (entry.diffPath !== undefined) {
      await putFile(
        fetchFn,
        hosted,
        created.runId,
        "diff",
        entry.filename,
        entry.diffPath
      );
    }
  }

  return created;
}

export function githubContextFromEnv(
  env: NodeJS.ProcessEnv
): GitHubContext | undefined {
  const token = emptyToUndefined(env.GITHUB_TOKEN);
  const repository = emptyToUndefined(env.GITHUB_REPOSITORY);
  const sha = emptyToUndefined(env.GITHUB_SHA);

  if (token === undefined || repository === undefined || sha === undefined) {
    return undefined;
  }

  const [owner, repo] = repository.split("/");

  if (owner === undefined || repo === undefined) {
    return undefined;
  }

  return {
    owner,
    prNumber: prNumberFromEnv(env),
    repo,
    sha,
    token,
  };
}

export async function publishGitHub(
  github: GitHubContext,
  upload: HostedUpload,
  report: Report,
  fetchFn: FetchFn = fetch
): Promise<void> {
  const description = statusDescription(report, upload.url);
  const api = `https://api.github.com/repos/${github.owner}/${github.repo}`;

  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${github.token}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };

  const status = await fetchFn(`${api}/statuses/${github.sha}`, {
    body: JSON.stringify({
      context: "storybranch / visual",
      description,
      state: "success",
      target_url: upload.url,
    }),
    headers,
    method: "POST",
  });

  if (!status.ok) {
    throw new Error(`GitHub status returned ${status.status}`);
  }

  if (github.prNumber === undefined) {
    return;
  }

  const body = prCommentBody(report, upload.url);

  const comments = await jsonRequest<{ body: string; id: number }[]>(
    fetchFn,
    `${api}/issues/${github.prNumber}/comments?per_page=100`,
    { headers }
  );

  const existing = comments.find((comment) =>
    comment.body.includes(HOSTED_COMMENT_MARKER)
  );

  if (existing === undefined) {
    const created = await fetchFn(`${api}/issues/${github.prNumber}/comments`, {
      body: JSON.stringify({ body }),
      headers,
      method: "POST",
    });

    if (!created.ok) {
      throw new Error(`GitHub comment returned ${created.status}`);
    }

    return;
  }

  const patched = await fetchFn(`${api}/issues/comments/${existing.id}`, {
    body: JSON.stringify({ body }),
    headers,
    method: "PATCH",
  });

  if (!patched.ok) {
    throw new Error(`GitHub comment update returned ${patched.status}`);
  }
}

export const HOSTED_COMMENT_MARKER = "<!-- storybranch-hosted-review -->";

export function prCommentBody(report: Report, url: string): string {
  const summary = attentionSummary(report) ?? "No snapshots need attention";

  return `${HOSTED_COMMENT_MARKER}
storybranch visual. ${summary}

[Open run](${url})
`;
}

export function statusDescription(report: Report, url: string): string {
  const summary = attentionSummary(report) ?? "clean";
  const text = `${summary} ${url}`;

  return text.length <= 140 ? text : `${text.slice(0, 137)}...`;
}

export function assertSafeFilename(filename: string): void {
  if (
    filename.length === 0 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..") ||
    !filename.endsWith(".png")
  ) {
    throw new Error(`unsafe snapshot filename ${filename}`);
  }
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  return value;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : undefined;
}

function prNumberFromEnv(env: NodeJS.ProcessEnv): number | undefined {
  const direct = parseOptionalInt(env.STORYBRANCH_PR_NUMBER);

  if (direct !== undefined) {
    return direct;
  }

  const prFromRef = /^refs\/pull\/(?<n>\d+)\//u.exec(env.GITHUB_REF ?? "");

  if (prFromRef?.groups?.n === undefined) {
    return undefined;
  }

  return Number(prFromRef.groups.n);
}

async function putFile(
  fetchFn: FetchFn,
  hosted: HostedConfig,
  runId: string,
  kind: "actual" | "diff",
  filename: string,
  filePath: string
): Promise<void> {
  const response = await fetchFn(
    `${hosted.apiUrl}/api/ci/runs/${runId}/files/${kind}/${encodeURIComponent(filename)}`,
    {
      body: await readFile(filePath),
      headers: {
        ...authHeaders(hosted.token),
        "content-type": "image/png",
      },
      method: "PUT",
    }
  );

  if (!response.ok) {
    throw new Error(`upload ${kind}/${filename} returned ${response.status}`);
  }
}

async function jsonRequest<T>(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetchFn(url, init);

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `${url} returned ${response.status}${detail === "" ? "" : `: ${detail}`}`
    );
  }

  return (await response.json()) as T;
}
