# Nginx Configuration for 1AK Group Hack

Конфигурация Nginx с HTTPS, балансировкой нагрузки и reverse proxy для:
- Frontend (React + Vite)
- Backend API (FastAPI) с балансировкой между 2 инстансами
- Telegram Bot API

## Архитектура

```
Browser (HTTPS) 
    ↓
Nginx (reverse proxy + load balancer)
    ├── Frontend (React) → http://frontend:5173
    ├── /api/* → Load Balanced между:
    │   ├── main_server_1:8000
    │   └── main_server_2:8000 (round-robin)
    └── /telegramm-api/* → tg_bot:8001
```

## Быстрый старт

### 1. Генерация SSL сертификатов

Для разработки используются самоподписанные сертификаты:

```bash
cd docker
chmod +x generate-ssl-certs.sh
./generate-ssl-certs.sh
```

### 2. Запуск всех сервисов

```bash
cd docker
docker-compose up -d
```

### 3. Доступ к приложению

- **Frontend**: https://localhost
- **API**: https://localhost/api
- **Telegram Bot API**: https://localhost/telegramm-api
- **Health Check**: https://localhost/health

## Конфигурация

### Балансировка нагрузки

Nginx использует `least_conn` алгоритм для распределения запросов между двумя инстансами main_server:

```nginx
upstream backend_main {
    least_conn;
    server main_server_1:8000;
    server main_server_2:8000;
}
```

### SSL/TLS

- TLS 1.2 и 1.3
- Автоматический редирект HTTP → HTTPS
- HSTS header для безопасности
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### Таймауты

- Connection timeout: 60s
- Send timeout: 60s
- Read timeout: 60s

### Максимальный размер файла

```nginx
client_max_body_size 100M;
```

## Production Deployment

Для продакшена замените самоподписанные сертификаты на реальные от Let's Encrypt:

### С Certbot

1. Установите certbot в nginx контейнер или используйте отдельный контейнер
2. Обновите конфигурацию для использования certbot сертификатов:

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

3. Настройте автоматическое обновление сертификатов

### Docker Compose для Production

Добавьте certbot в docker-compose.yml:

```yaml
certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

## Мониторинг

### Health Check

```bash
curl -k https://localhost/health
```

Expected response: `healthy`

### Логи

```bash
# Nginx логи
docker logs 1ak-group-hack-nginx

# Логи main_server
docker logs 1ak-group-hack-main-server-1
docker logs 1ak-group-hack-main-server-2

# Логи telegram bot
docker logs 1ak-group-hack-tg-bot

# Логи frontend
docker logs 1ak-group-hack-frontend
```

## Остановка сервисов

```bash
cd docker
docker-compose down
```

## Troubleshooting

### Браузер показывает предупреждение о безопасности

Это нормально для самоподписанных сертификатов. Нажмите "Advanced" → "Proceed to localhost (unsafe)" или аналогичную опцию в вашем браузере.

### Порты заняты

Убедитесь, что порты 80 и 443 свободны:

```bash
sudo lsof -i :80
sudo lsof -i :443
```

### Проблемы с подключением к бэкенду

Проверьте, что все сервисы запущены:

```bash
docker-compose ps
```

Проверьте логи nginx:

```bash
docker logs 1ak-group-hack-nginx
```
