# PULSE — запуск на VPS от А до Я

Система должна жить на сервере, не на ноутбуке. После `docker compose up -d`
и `sudo reboot` контейнеры поднимаются сами (`restart: unless-stopped` + systemd).

## 1. Что должно быть на сервере

- Ubuntu 22.04 / 24.04
- Docker + Docker Compose plugin
- git

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Выйдите из SSH и зайдите снова, чтобы группа `docker` применилась.

## 2. Клонирование

```bash
sudo mkdir -p /opt/pulse
sudo chown $USER:$USER /opt/pulse
cd /opt
git clone https://github.com/shomurzaev200/pulse-command-center.git pulse
cd pulse
```

## 3. Переменные

Не кладите секреты в git. На сервере:

```bash
export DATABASE_URL=postgres://pulse:pulse@postgres:5432/pulse
export REDIS_URL=redis://redis:6379
# Опционально, официальный Meta Graph API:
# export META_CLIENT_ID=...
# export META_CLIENT_SECRET=...
# AI (xAI) — если используете объяснения Grok на своём сервере:
# export XAI_API_KEY=...
```

Для compose достаточно значений из `docker-compose.yml`.

## 4. Запуск

```bash
cd /opt/pulse
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:8080/api/health
```

Откройте `http://IP_СЕРВЕРА` (nginx:80) или `http://IP:8080`.

Первый вход: **создать владельца** (email + пароль ≥ 8) или Google / X.

## 5. Автозапуск после reboot

```bash
sudo cp deploy/instagram-manager.service /etc/systemd/system/instagram-manager.service
sudo systemctl daemon-reload
sudo systemctl enable --now instagram-manager.service
```

Проверка:

```bash
sudo reboot
# после загрузки:
docker compose -f /opt/pulse/docker-compose.yml ps
```

Ноутбук можно выключить — очередь и UI живут на VPS.

## 6. HTTPS

Поставьте сертификат (certbot) перед nginx и раскомментируйте 443. Пока в
`deploy/nginx.conf` только HTTP для первого запуска.

## 7. Compliance

Публикация идёт только через официальный Meta Graph API Instagram
Business/Creator. Нет накрутки просмотров, ботов, обхода 2FA/CAPTCHA,
украденных сессий. Без токена задача = `awaiting_official_api`, метрики = N/A.

Демо-набор в UI помечен отдельно и не выдаётся за живой Instagram.
