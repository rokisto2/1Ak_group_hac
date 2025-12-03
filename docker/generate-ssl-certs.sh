#!/bin/bash

# Скрипт для генерации самоподписанных SSL сертификатов для разработки
# В продакшене используйте Let's Encrypt

SSL_DIR="./docker/nginx/ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

# Создание директории для SSL
mkdir -p "$SSL_DIR"

# Проверка существования сертификата
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "SSL сертификаты уже существуют в $SSL_DIR"
    echo "Для перегенерации удалите их и запустите скрипт снова."
    exit 0
fi

echo "Генерация самоподписанных SSL сертификатов..."

# Генерация сертификата
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=1AK Group Hack/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификаты успешно созданы:"
    echo "   Сертификат: $CERT_FILE"
    echo "   Ключ: $KEY_FILE"
    echo ""
    echo "⚠️  ВНИМАНИЕ: Это самоподписанные сертификаты только для разработки!"
    echo "   Браузер будет показывать предупреждение о безопасности."
    echo "   Для продакшена используйте сертификаты от Let's Encrypt."
else
    echo "❌ Ошибка при генерации сертификатов"
    exit 1
fi
