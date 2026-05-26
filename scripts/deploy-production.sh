#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/home/luca/services/conregation-organizer}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_PATH/backups}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null || fail "git is not installed"
command -v docker >/dev/null || fail "docker is not installed"

cd "$DEPLOY_PATH"

[ -f docker-compose.yml ] || fail "docker-compose.yml not found in $DEPLOY_PATH"
[ -f .env ] || fail ".env not found in $DEPLOY_PATH"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$current_branch" = "$BRANCH" ] || fail "checkout is on '$current_branch', expected '$BRANCH'"

log "Fetching $REMOTE/$BRANCH"
git fetch --prune "$REMOTE" "$BRANCH"

if ! git diff --quiet; then
  git status --short
  fail "working tree has uncommitted changes; refusing to deploy"
fi

if ! git diff --cached --quiet; then
  git status --short
  fail "index has staged changes; refusing to deploy"
fi

if [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git status --short
  fail "working tree has untracked files; refusing to deploy"
fi

if ! git merge-base --is-ancestor HEAD "$REMOTE/$BRANCH"; then
  fail "local HEAD is not an ancestor of $REMOTE/$BRANCH; refusing non-fast-forward deploy"
fi

old_rev="$(git rev-parse HEAD)"
new_rev="$(git rev-parse "$REMOTE/$BRANCH")"

if [ "$old_rev" = "$new_rev" ]; then
  log "Already at $new_rev; nothing to deploy"
  exit 0
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

: "${POSTGRES_DB:?POSTGRES_DB is required in .env}"
: "${POSTGRES_USER:?POSTGRES_USER is required in .env}"

mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/co_db_$(date -u +%Y%m%dT%H%M%SZ)_${old_rev:0:12}.sql.gz"

log "Creating database backup: $backup_file"
docker compose exec -T co_db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$backup_file"
test -s "$backup_file" || fail "database backup was not created"

log "Fast-forwarding code to $new_rev"
git pull --ff-only "$REMOTE" "$BRANCH"

log "Building application containers"
docker compose build co_server co_client

log "Restarting application containers without touching the database volume"
docker compose up -d --no-deps co_server co_client

log "Checking backend health"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:8001/ >/dev/null; then
    log "Backend health check passed"
    break
  fi

  if [ "$attempt" = "10" ]; then
    fail "backend health check failed after deploy; backup is at $backup_file"
  fi

  sleep 3
done

log "Checking frontend health"
curl -fsSI http://127.0.0.1:3001/ >/dev/null || fail "frontend health check failed"

log "Deployment complete"
docker compose ps
