#!/bin/sh
# VPS entrypoint: origin URL, schema, then Vite.
set -eu
cd /app

export PULSE_HTTP_COOKIES="${PULSE_HTTP_COOKIES:-true}"

if [ -z "${BETTER_AUTH_URL:-}" ]; then
  URL=$(node /app/deploy/resolve-public-url.mjs || true)
  if [ -n "$URL" ]; then
    export BETTER_AUTH_URL="$URL"
  fi
fi
echo "BETTER_AUTH_URL=${BETTER_AUTH_URL:-unset}"

mkdir -p /app/data/uploads
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
node scripts/migrate.mjs
exec npm run dev
