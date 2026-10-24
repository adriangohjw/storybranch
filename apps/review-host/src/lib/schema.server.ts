export const APP_SCHEMA = `
CREATE TABLE IF NOT EXISTS invites (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('member', 'approver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_tokens (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  branch TEXT,
  pr_number INTEGER,
  repository TEXT,
  ci_url TEXT,
  workflow_run_id TEXT,
  duration_ms INTEGER,
  story_count INTEGER,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_project_created ON runs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS run_snapshots (
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  review_state TEXT NOT NULL CHECK (review_state IN ('pending', 'accepted', 'changes_requested')),
  PRIMARY KEY (run_id, snapshot_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_snapshot ON comments (run_id, snapshot_id, created_at);
`;
