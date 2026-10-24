# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Cross-functional teammates on one company install. Engineers, designers, and PMs open a run from a link (often a GitHub PR comment) to look at Storybook screenshots. Approvers accept or request changes. Members comment. Admins invite people, create projects, and mint CI tokens.

The run page job is the screenshot decision. The person may not read the Git diff.

## Product Purpose

Self-hosted review of Storybook visual tests. CI captures, diffs against one project baseline, and uploads a run. A human accepts a snapshot, which overwrites that baseline immediately, or requests changes, or comments. Success is a teammate finishing that decision on the run page without a terminal.

## Positioning

The pixel diff stays on the CI machine. The hosted app stores one baseline set per project and the review state. It does not gate the CI job. Upload success exits 0 even when pixels differ.

## Operating Context

Local `storybranch test` and `review` stay on git baselines when no project token is set. Hosted mode needs a project token and API URL. Humans use an invite-only email magic link. Review URLs are unguessable and require a session.

## Capabilities and Constraints

Routes: `/login`, `/projects`, `/projects/:projectId`, `/projects/:projectId/runs/:runId`.

Roles: member, approver, admin. Default invite is member. Accept and request changes are approver and admin only.

One baseline PNG per snapshot id. Accept copies that run's actual onto the project baseline. Review state per snapshot: pending, accepted, changes_requested. Comments are per snapshot.

Stack is TanStack Start, Postgres, S3, Better Auth. `apps/web` stays Astro. No Next.js on this app.

Visual scope for this pass: hosted-review pages and `@storybranch/review-ui`, because the run page renders that package. The user approved proceeding with "yes pls" and did not split the either-or. Local CLI review uses the same components.

## Brand Commitments

The product name is storybranch. The app folder is hosted-review.

The user asked this UI to be visually exceptional, the kind of craft they would show in a Y Combinator demo. That is a commitment on ambition, not a palette.

## Evidence on Hand

Working routes, schema, and CLI upload exist in this repo. No customer logos, testimonials, or usage numbers. Do not invent them.

## Product Principles

The screenshot is the decision. Counts and filters exist to reach the next screenshot.

Accept changes the baseline the next CI run will diff against. The control must look like that.

A member can see everything and cannot accept.

CI failure and a visual difference are different events. The app does not pretend a diff failed the build.

One company per install. Every signed-in person sees every project.
