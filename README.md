# PULSE — AI Instagram Growth Command Center

Командный центр для нескольких Instagram-аккаунтов.

**Главная воронка:** Views → Profile visits → Link clicks.

Контур: загрузка (≥4 видео/день) → AI-анализ → лучший слот на аккаунт → caption / hashtags / CTA → approve → очередь → официальный Meta Graph API → аналитика → профиль аккаунта.

Каждый аккаунт изолирован: своя очередь, своё расписание, своя AI-память.

## Скачать и запустить на VPS

Нужен Ubuntu 22/24 + Docker. **Не ставь Node с apt** — в Ubuntu это Node 18, проект требует Node 22 внутри Docker.

```bash
# 1) Docker (один раз)
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# выйди из SSH и зайди снова

# 2) Чистый клон
sudo systemctl stop instagram-manager 2>/dev/null || true
sudo rm -rf /opt/pulse
sudo mkdir -p /opt/pulse
sudo chown "$USER:$USER" /opt/pulse
cd /opt
git clone https://github.com/shomurzaev200/acre-cherry-jolly-jade.git pulse
cd pulse

# 3) Запуск (без docker build)
sudo systemctl restart docker
sleep 6
docker pull node:22-bookworm-slim
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull nginx:1.27-alpine
docker compose up -d
docker compose logs -f app
```

Открой `http://IP_СЕРВЕРА` (порт 80) или `http://IP_СЕРВЕРА:8080`.

Первый вход: **Регистрация** (email + пароль ≥ 8 символов).

Автозапуск после reboot:

```bash
sudo cp deploy/instagram-manager.service /etc/systemd/system/instagram-manager.service
sudo systemctl daemon-reload
sudo systemctl enable --now instagram-manager.service
```

Подробности и починка, если уже ломалось: [DEPLOY.md](DEPLOY.md).

## Стек

- TanStack Start / React 19
- PostgreSQL 16 + Redis 7 (Docker)
- Официальный Meta Graph API (без неофициального Instagram API)
- Бесплатные прокси/VPN-профили — только как маршрут, с предупреждением о нестабильности
- Локальный AI-движок слотов (без платных API). xAI Grok — по кнопке, не на каждый pageload

## Важно

Нет fake views / fake followers / engagement bots. Без Meta-токена задача = `awaiting_official_api`, метрики = N/A. Демо-набор в UI помечен отдельно.
