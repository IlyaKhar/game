# ОКЭИ: Новый Уровень — Фестиваль Игр

Веб-платформа для игрового фестиваля колледжа (вход по ФИО и группе, 5 веб-игр, общий рейтинг по участникам и группам, скрытая админка и готовый Docker Compose для деплоя на сервер).

## Архитектура

- **Frontend (`frontend/`)**: React 19 + TypeScript + Vite + Tailwind CSS + Three.js (для 3D-раннера).
- **Backend (`backend/`)**: Go + Fiber + GORM (SQLite локально по умолчанию, PostgreSQL в Docker/продакшене) + JWT.
- **Deploy (`docker-compose.yml`)**: `postgres` + `api` + `web` (Nginx reverse proxy).

## Локальный запуск (без Docker)

Терминал 1 — Бэкенд:
```bash
cd backend
go run ./cmd/api
```
По умолчанию создаст локальную базу `backend/data/festival.db` и поднимется на `:8080`.

Терминал 2 — Фронтенд:
```bash
cd frontend
npm run dev
```
Открой `http://localhost:5173`.

## Секретная админка (накрутка / правка очков)

- Открой `/admin` в браузере **или** нажми **3 раза подряд на иконку геймпада** в логотипе «ОКЭИ:».
- Пароль по умолчанию: `okei-admin-2026` (обязательно смени через `ADMIN_PASSWORD` в `.env` перед деплоем!).

## Деплой на сервер (Docker Compose)

```bash
cp .env.example .env
# Отредактируй .env: задай свои POSTGRES_PASSWORD, JWT_SECRET и ADMIN_PASSWORD
docker compose up -d --build
```
Сайт будет доступен на `http://<IP_сервера>` (порт настраивается через `APP_PORT`).

