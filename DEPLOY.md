# PULSE — запуск на VPS от А до Я

Система должна жить на сервере, не на ноутбуке. После `docker compose up -d`
и `sudo reboot` контейнеры поднимаются сами (`restart: unless-stopped` + systemd).

Репозиторий: https://github.com/shomurzaev200/acre-cherry-jolly-jade

**Не используй `apt install nodejs`.** Ubuntu даёт Node 18, проект собирается
только внутри Docker на Node 22.

## Если уже ломалось (твой случай)

Docker build на маленьком VPS часто рвётся: контекст 1 МБ уходит минутами, образ
Node так и не скачивается. **Сборки больше нет** — берём готовый `node:22`.

Вставь **одним блоком**:

```bash
sudo systemctl stop instagram-manager 2>/dev/null || true
sudo systemctl restart docker
sleep 8
cd /opt
# если клон кривой — сотри и клонируй заново
if [ ! -f /opt/pulse/docker-compose.yml ]; then
  sudo rm -rf /opt/pulse
  sudo mkdir -p /opt/pulse
  sudo chown "$USER:$USER" /opt/pulse
  git clone https://github.com/shomurzaev200/acre-cherry-jolly-jade.git pulse
fi
cd /opt/pulse
git fetch origin
git reset --hard origin/main
chmod +x deploy/vps-up.sh
./deploy/vps-up.sh
```

Первый запуск качает 4 образа и делает `npm ci` внутри контейнера (2–5 мин).
Смотри лог, если скрипт ещё крутится:

```bash
cd /opt/pulse
docker compose logs -f app
```

Когда `curl http://127.0.0.1:8080/api/health` вернёт `{"status":"ok"...}`:

```bash
sudo cp /opt/pulse/deploy/instagram-manager.service /etc/systemd/system/instagram-manager.service
sudo systemctl daemon-reload
sudo systemctl enable instagram-manager.service
```

Репозиторий публичный: https://github.com/shomurzaev200/acre-cherry-jolly-jade

## 1. Чистый сервер (первый раз)

- Ubuntu 22.04 / 24.04
- Docker + Docker Compose plugin
- git

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Выйди из SSH и зайди снова, чтобы группа `docker` применилась.

## 2. Клонирование

```bash
sudo mkdir -p /opt/pulse
sudo chown $USER:$USER /opt/pulse
cd /opt
git clone https://github.com/shomurzaev200/acre-cherry-jolly-jade.git pulse
cd pulse
```

## 3. Переменные

Секреты не в git. Compose уже содержит рабочие значения:

- `DATABASE_URL=postgres://pulse:pulse@postgres:5432/pulse`
- `REDIS_URL=redis://redis:6379`
- `VITE_AUTH_ENABLED=true`
- `BETTER_AUTH_SECRET` (смени в `docker-compose.yml` на свой, ≥32 символа)

Опционально, официальный Meta Graph API:

```bash
# export META_CLIENT_ID=...
# export META_CLIENT_SECRET=...
```

xAI Grok (объяснения по кнопке, не обязательно): `XAI_API_KEY`.

## 4. Запуск

```bash
cd /opt/pulse
docker compose up -d
docker compose ps
curl -s http://127.0.0.1:8080/api/health
```

Открой `http://IP_СЕРВЕРА` (nginx:80) или `http://IP:8080`.

Первый вход: **создать владельца** (email + пароль ≥ 8). Google / X на своём VPS
могут не работать без брокера — используй email.

Дальше: **Загрузка** → кинь минимум 4 видео → AI разложит слоты по лучшим часам
каждого аккаунта.

## 5. Автозапуск после reboot

```bash
sudo cp deploy/instagram-manager.service /etc/systemd/system/instagram-manager.service
sudo systemctl daemon-reload
sudo systemctl enable --now instagram-manager.service
```

Ноутбук можно выключить — очередь и UI живут на VPS.

## 6. HTTPS

Поставь сертификат (certbot) перед nginx и раскомментируй 443. Пока в
`deploy/nginx.conf` только HTTP для первого запуска.

## 7. Что умеет бесплатно

- AI-слоты «когда заливать» — локальная статистика по аккаунту, без платных API
- Прокси/VPN профили — свои HTTP/SOCKS или публичные. Бесплатные прокси
  нестабильны: UI это прямо пишет. Это маршрутизация, не обход бана Instagram
- Публикация в Instagram — только официальный Meta Graph API (Business/Creator)

## 8. Compliance

Нет накрутки просмотров, ботов, обхода 2FA/CAPTCHA, украденных сессий.
Без токена задача = `awaiting_official_api`, метрики = N/A.
Демо-набор в UI помечен отдельно и не выдаётся за живой Instagram.
