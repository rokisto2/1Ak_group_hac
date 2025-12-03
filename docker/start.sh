#!/bin/bash

set -e

echo "🚀 Запуск 1AK Group Hack Application"
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

cd "$(dirname "$0")"

# Генерация SSL сертификатов если их нет
if [ ! -f "./nginx/ssl/cert.pem" ] || [ ! -f "./nginx/ssl/key.pem" ]; then
    echo "📜 SSL сертификаты не найдены. Генерация..."
    ./generate-ssl-certs.sh
    echo ""
fi

# Проверка .env файла
if [ ! -f "../.env" ]; then
    echo "⚠️  Файл .env не найден в корне проекта!"
    echo "   Создайте файл .env на основе примера."
    exit 1
fi

echo "🔨 Сборка Docker образов..."
docker-compose build

echo ""
echo "🐳 Запуск контейнеров..."
docker-compose up -d

echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 5

echo ""
echo "✅ Приложение запущено!"
echo ""
echo "📍 Доступ к сервисам:"
echo "   🌐 Frontend:        https://localhost"
echo "   🔌 API:             https://localhost/api"
echo "   🤖 Telegram Bot:    https://localhost/telegramm-api"
echo "   ❤️  Health Check:   https://localhost/health"
echo ""
echo "⚠️  Браузер покажет предупреждение о самоподписанном сертификате."
echo "   Это нормально для разработки. Нажмите 'Продолжить'."
echo ""
echo "📊 Проверка статуса контейнеров:"
docker-compose ps

echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов:       docker-compose logs -f"
echo "   Остановка:            docker-compose down"
echo "   Перезапуск:           docker-compose restart"
echo "   Логи конкретного:     docker-compose logs -f <service_name>"
