#!/bin/bash
# One-shot VPS bring-up. Always uses sudo docker (ubuntu is not in docker group
# until the next SSH login after usermod).
set -euo pipefail
cd /opt/pulse

echo "== disk =="
df -h /

echo "== docker group =="
sudo usermod -aG docker "$USER" || true
sudo systemctl enable docker >/dev/null
sudo systemctl start docker
sleep 3
sudo systemctl is-active docker
sudo docker info >/dev/null

DC=(sudo docker compose)
PULL=(sudo docker pull)

echo "== pull (no build) =="
"${PULL[@]}" node:22-bookworm-slim
"${PULL[@]}" postgres:16-alpine
"${PULL[@]}" redis:7-alpine
"${PULL[@]}" nginx:1.27-alpine

echo "== up =="
"${DC[@]}" down --remove-orphans || true
"${DC[@]}" up -d
"${DC[@]}" ps

echo "== wait health (npm ci first time ~2-5 min) =="
ok=0
for i in $(seq 1 60); do
  if curl -sf --max-time 2 http://127.0.0.1:8080/api/health >/dev/null; then
    ok=1
    break
  fi
  sleep 3
done

IP="$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || curl -s --max-time 3 ifconfig.me || echo UNKNOWN)"

if [ "$ok" = 1 ]; then
  curl -s http://127.0.0.1:8080/api/health
  echo
  echo "OK  http://${IP}  (port 80)   or   http://${IP}:8080"
  echo "AWS Security Group must allow inbound TCP 80 and 8080 from 0.0.0.0/0"
else
  echo "still starting — watch logs:"
  echo "  sudo docker compose -f /opt/pulse/docker-compose.yml logs -f app"
  "${DC[@]}" logs --tail=60 app
  echo "Public IP: http://${IP}"
  exit 1
fi
