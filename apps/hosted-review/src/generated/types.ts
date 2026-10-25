import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Timestamp | null;
    refreshTokenExpiresAt: Timestamp | null;
    scope: string | null;
    password: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Comment = {
    id: string;
    run_id: string;
    snapshot_id: string;
    user_id: string;
    author_email: string;
    body: string;
    created_at: Generated<Timestamp>;
};
export type Invite = {
    email: string;
    role: string;
    created_at: Generated<Timestamp>;
};
export type Project = {
    id: string;
    name: string;
    created_at: Generated<Timestamp>;
};
export type ProjectToken = {
    id: string;
    project_id: string;
    name: string;
    token_hash: string;
    prefix: string;
    suffix: string;
    created_at: Generated<Timestamp>;
};
export type Run = {
    id: string;
    project_id: string;
    commit_sha: string;
    branch: string | null;
    pr_number: number | null;
    report: unknown;
    created_at: Generated<Timestamp>;
};
export type RunSnapshot = {
    run_id: string;
    snapshot_id: string;
    review_state: string;
};
export type Session = {
    id: string;
    expiresAt: Timestamp;
    token: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
};
export type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
    role: Generated<string>;
};
export type Verification = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Timestamp;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DB = {
    account: Account;
    comments: Comment;
    invites: Invite;
    project_tokens: ProjectToken;
    projects: Project;
    run_snapshots: RunSnapshot;
    runs: Run;
    session: Session;
    user: User;
    verification: Verification;
};
