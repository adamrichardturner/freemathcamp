#!/bin/sh
# Remote deploy step, run on the VPS by .github/workflows/deploy-api.yml
# (or by hand from /var/www/freemathcamp). Builds the API image, migrates,
# then swaps the API container once the new one is healthy.
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env in $(pwd). Create it on the server before deploying." >&2
  exit 1
fi

lock="/tmp/freemathcamp-deploy.lock"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$lock"
  flock 9
fi

compose="docker compose -f docker-compose.prod.yml --env-file .env"

$compose build
$compose up -d --wait db
$compose run --rm migrate
$compose up -d --no-deps --wait --remove-orphans api
$compose ps
docker image prune -f >/dev/null
