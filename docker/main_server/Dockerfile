FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements
COPY requirements.txt .
COPY main_server/requirements-main_server.txt ./main_server/

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY main_server/ ./main_server/
COPY alembic.ini .

# Создание директории для временных файлов
RUN mkdir -p /tmp/temp_send

EXPOSE 8000

# Запуск приложения
CMD ["uvicorn", "main_server.main:app", "--host", "0.0.0.0", "--port", "8000"]
