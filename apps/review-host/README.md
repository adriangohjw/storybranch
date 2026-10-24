# Hosted visual review

TanStack Start app for team review of CI visual runs. Local `storybranch test` / `review` is unchanged when no project token is set.

## Run locally

```bash
cp apps/review-host/.env.example apps/review-host/.env
# set STORYBRANCH_ADMIN_EMAIL, BETTER_AUTH_SECRET (>= 32 chars), SMTP_* if you want real mail
docker compose -f apps/review-host/docker-compose.yml up --build
```

Open `http://127.0.0.1:3000/login`. The admin email in `STORYBRANCH_ADMIN_EMAIL` is invited as **admin**. Without `SMTP_HOST`, magic links print to the app logs.

Dev (compose for Postgres + MinIO, Vite for the app):

```bash
docker compose -f apps/review-host/docker-compose.yml up postgres minio minio-init
set -a && source apps/review-host/.env && set +a
bun run --cwd apps/review-host dev
```

## CI

```bash
storybranch test --build --exit-once \
  --project-token "$STORYBRANCH_PROJECT_TOKEN" \
  --api-url "https://review.example"
```

Same flags via `STORYBRANCH_PROJECT_TOKEN` and `STORYBRANCH_API_URL`. GitHub commit status `storybranch / visual` and one updatable PR comment need `GITHUB_TOKEN` plus the usual `GITHUB_*` context. Template: [`examples/github-actions/hosted-visual-review.yml`](../../examples/github-actions/hosted-visual-review.yml).
