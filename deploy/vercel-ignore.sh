#!/bin/sh
# Vercel "Ignored Build Step" for the web project (root directory apps/web).
# Exit 0 skips the build, exit 1 builds. The web app also depends on the
# shared curriculum package and the lockfile.
set -eu

if [ -z "${VERCEL_GIT_PREVIOUS_SHA:-}" ]; then
  exit 1
fi

git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- . ../../packages/curriculum ../../pnpm-lock.yaml ../../deploy/vercel-ignore.sh
