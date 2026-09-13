#!/bin/sh
# VPS entrypoint: set BETTER_AUTH_URL to the public IP so sign-up is not
# rejected as "Invalid origin", then install deps and run Vite.
set -eu
cd /app

if [ -z "${BETTER_AUTH_URL:-}" ]; then
  TOKEN=$(curl -s --max-time 2 -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
  IP=""
  if [ -n "${TOKEN:-}" ]; then
    IP=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
      http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  fi
  if [ -z "$IP" ]; then
    IP=$(curl -s --max-time 3 https://ifconfig.me || curl -s --max-time 3 https://icanhazip.com || true)
  fi
  IP=$(echo "$IP" | tr -d '[:space:]')
  if [ -n "$IP" ]; then
    export BETTER_AUTH_URL="http://$IP"
  fi
fi

export PULSE_HTTP_COOKIES="${PULSE_HTTP_COOKIES:-true}"
echo "BETTER_AUTH_URL=${BETTER_AUTH_URL:-unset}"

npm ci --no-audit --no-fund || npm install --no-audit --no-fund
exec npm run dev
