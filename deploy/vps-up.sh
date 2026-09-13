#!/bin/bash
# One-shot VPS bring-up. No image build — official node:22 + bind mount.
set -euo pipefail
cd /opt/pulse

echo "== disk =="
df -h /

echo "== docker =="
sudo systemctl restart docker
sleep 6
sudo systemctl is-active docker
docker info >/dev/null

echo "== pull (no build) =="
docker pull node:22-bookworm-slim
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull nginx:1.27-alpine

echo "== up =="
docker compose down --remove-orphans || true
docker compose up -d
docker compose ps

echo "== wait health =="
ok=0
for i in $(seq 1 40); do
  if curl -sf --max-time 2 http://127.0.0.1:8080/api/health >/dev/null; then
    ok=1
    break
  fi
  sleep 3
done
if [ "$ok" = 1 ]; then
  curl -s http://127.0.0.1:8080/api/health
  echo
  echo "OK  http://$(curl -s ifconfig.me)  or  http://$(curl -s ifconfig.me):8080"
else
  echo "still starting — watch: docker compose -f /opt/pulse/docker-compose.yml logs -f app"
  docker compose logs --tail=40 app
  exit 1
fi
