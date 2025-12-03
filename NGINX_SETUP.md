# Nginx Reverse Proxy Setup

## Создано

✅ **Nginx конфигурация** (`docker/nginx/nginx.conf`):
- HTTPS с самоподписанными сертификатами (для разработки)
- HTTP → HTTPS редирект
- Балансировка нагрузки для main_server (2 инстанса, round-robin)
- Reverse proxy для всех сервисов
- Security headers
- Gzip сжатие
- WebSocket поддержка

✅ **Docker файлы**:
- `docker/nginx/Dockerfile` - образ Nginx
- `docker/main_server/Dockerfile` - образ главного бэкенда
- `docker/tg_bot/Dockerfile` - образ Telegram бота
- `docker/frontend/Dockerfile` - образ фронтенда

✅ **Обновлен docker-compose.yml**:
- Nginx с портами 80/443
- 2 инстанса main_server для балансировки
- Telegram bot
- Frontend
- Все зависимости настроены

✅ **Вспомогательные скрипты**:
- `docker/generate-ssl-certs.sh` - генерация SSL сертификатов
- `docker/start.sh` - автоматический запуск всего стека

## Архитектура

```
                                HTTPS (443) / HTTP (80)
                                        ↓
                                ┌───────────────┐
                                │     Nginx     │
                                │ (Load Balancer│
                                │  & Reverse    │
                                │    Proxy)     │
                                └───────┬───────┘
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
        /       │               /api/*  │          /telegramm-api/*
    (Frontend)  │          (Main Backend)           (Telegram Bot)
                ↓                       ↓                       ↓
        ┌───────────┐          ┌────────────────┐      ┌──────────────┐
        │  Frontend │          │  Load Balanced │      │   Telegram   │
        │  (React)  │          │                │      │     Bot      │
        │  :5173    │          │ main_server_1  │      │    :8001     │
        └───────────┘          │     :8000      │      └──────────────┘
                               │       +        │
                               │ main_server_2  │
                               │     :8000      │
                               └────────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        ↓               ↓               ↓
                  ┌──────────┐    ┌─────────┐    ┌──────────┐
                  │PostgreSQL│    │  MinIO  │    │  Redis   │
                  │  :5432   │    │  :9000  │    │  :6379   │
                  └──────────┘    └─────────┘    └──────────┘
```

## Запуск

### Автоматический (рекомендуется)

```bash
cd docker
./start.sh
```

### Ручной

```bash
# 1. Генерация SSL сертификатов
cd docker
./generate-ssl-certs.sh

# 2. Запуск сервисов
docker-compose up -d

# 3. Проверка статуса
docker-compose ps
```

## Доступ к приложению

После запуска все сервисы доступны через Nginx:

- 🌐 **Frontend**: https://localhost
- 🔌 **API**: https://localhost/api
- 🤖 **Telegram Bot API**: https://localhost/telegramm-api
- ❤️ **Health Check**: https://localhost/health

⚠️ **Важно**: Браузер покажет предупреждение о самоподписанном сертификате. Это нормально для разработки.

## Балансировка нагрузки

Main Server запускается в 2 экземплярах:
- `main_server_1:8000`
- `main_server_2:8000`

Nginx распределяет запросы по алгоритму `least_conn` (наименьшее количество активных соединений).

## Проверка работы

```bash
# Health check
curl -k https://localhost/health

# API test
curl -k https://localhost/api/test

# Логи Nginx
docker logs 1ak-group-hack-nginx -f

# Логи Backend
docker logs 1ak-group-hack-main-server-1 -f
docker logs 1ak-group-hack-main-server-2 -f
```

## Production готовность

Для продакшена потребуется:

1. ✅ Заменить самоподписанные сертификаты на Let's Encrypt
2. ✅ Настроить домен вместо localhost
3. ✅ Добавить rate limiting в Nginx
4. ✅ Настроить логирование и мониторинг
5. ✅ Добавить автомасштабирование при необходимости

Подробнее см. `docker/nginx/README.md`
