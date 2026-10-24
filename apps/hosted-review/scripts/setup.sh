#!/usr/bin/env bash
# First-time local setup for hosted-review. macOS/Linux; use WSL on Windows.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$APP_DIR/.env"
EXAMPLE="$APP_DIR/.env.example"
PLACEHOLDER_SECRET="dev-secret-change-me-please-32ch"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
COMPOSE="docker compose -f apps/hosted-review/docker-compose.yml"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--email you@company.com]

Copies .env.example to .env when missing, generates BETTER_AUTH_SECRET if still
the placeholder, optionally sets STORYBRANCH_ADMIN_EMAIL (flag or prompt on a TTY).

Run from anywhere; paths are relative to this app.
EOF
}

admin_email=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      admin_email="${2:-}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$EXAMPLE" ]]; then
  echo "Missing $EXAMPLE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE"
fi

current_secret="$(grep -E '^BETTER_AUTH_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
if [[ "$current_secret" == "$PLACEHOLDER_SECRET" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl is required to generate BETTER_AUTH_SECRET" >&2
    exit 1
  fi
  new_secret="$(openssl rand -hex 16)"
  perl -pi -e "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$new_secret/" "$ENV_FILE"
  echo "Generated BETTER_AUTH_SECRET"
fi

if [[ -n "$admin_email" ]]; then
  perl -pi -e "s/^STORYBRANCH_ADMIN_EMAIL=.*/STORYBRANCH_ADMIN_EMAIL=$admin_email/" "$ENV_FILE"
elif [[ -t 0 ]]; then
  current_admin="$(grep -E '^STORYBRANCH_ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2- || true)"
  if [[ "$current_admin" == "admin@localhost" ]]; then
    read -r -p "Admin email for first login [admin@localhost]: " reply
    if [[ -n "$reply" ]]; then
      perl -pi -e "s/^STORYBRANCH_ADMIN_EMAIL=.*/STORYBRANCH_ADMIN_EMAIL=$reply/" "$ENV_FILE"
    fi
  fi
fi

cat <<EOF

Ready. From the repo root:

  cd $REPO_ROOT
  $COMPOSE up --build

Then open http://127.0.0.1:3000/login (use STORYBRANCH_ADMIN_EMAIL from .env).

Dev without rebuilding the app image:

  $COMPOSE up postgres floci s3-init
  set -a && source apps/hosted-review/.env && set +a
  bun run --cwd apps/hosted-review dev

With STORYBRANCH_DANGEROUS_EMAIL_LOG=1, magic links print in the app or compose logs.
Unset that and set RESEND_API_KEY + RESEND_FROM before production.

More: apps/hosted-review/README.md
EOF
