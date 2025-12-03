FROM node:20-alpine AS builder

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения для production
RUN npm run build

# Production образ
FROM node:20-alpine

WORKDIR /app

# Установка простого HTTP сервера
RUN npm install -g serve

# Копирование собранных файлов
COPY --from=builder /app/dist ./dist

EXPOSE 5173

# Запуск сервера
CMD ["serve", "-s", "dist", "-l", "5173"]
