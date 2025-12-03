FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY tg_bot/requirements-tg_bot.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements-tg_bot.txt

# Копирование кода бота
COPY tg_bot/ ./tg_bot/

EXPOSE 8001

# Запуск бота
CMD ["python", "-m", "tg_bot.bot"]
