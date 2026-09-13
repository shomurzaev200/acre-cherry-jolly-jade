# PULSE — AI Instagram Growth Command Center

Командный центр для нескольких Instagram-аккаунтов.

**Главная воронка:** Views → Profile visits → Link clicks.

Контур: загрузка → AI-анализ → caption / hashtags / CTA / слот → approve → очередь → официальный API → аналитика → профиль аккаунта → следующая стратегия.

Каждый аккаунт изолирован: своя очередь, своё расписание, своя AI-память.

## Стек

- TanStack Start / React 19
- PostgreSQL (Neon в облаке, PGLite в превью, Postgres 16 в Docker)
- Redis в Docker-стеке (кэш/очередь на VPS)
- Официальный Meta Graph API (без неофициального Instagram API)
- xAI Grok — объяснения по кнопке, не в цикле на каждый pageload

## Локально / превью

`npm run dev` — UI на порту, который задаёт платформа.

## VPS

См. [DEPLOY.md](DEPLOY.md):

```bash
git clone https://github.com/shomurzaev200/pulse-command-center.git
cd pulse-command-center
docker compose up -d --build
```

## Важно

Нет fake views / fake followers / engagement bots. Network profiles — легитимная
маршрутизация, не обход ограничений платформы.
