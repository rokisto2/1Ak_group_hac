FROM nginx:1.25-alpine

# Установка openssl для генерации самоподписанных сертификатов
RUN apk add --no-cache openssl

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создание директории для SSL сертификатов
RUN mkdir -p /etc/nginx/ssl

# Генерация самоподписанного SSL сертификата (для разработки)
# В продакшене замените на реальные сертификаты от Let's Encrypt
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=1AK Group/CN=localhost"

# Создание директории для certbot
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
