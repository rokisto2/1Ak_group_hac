/**
 * Извлекает timestamp из UUID7
 * UUID7 содержит timestamp в первых 48 битах (первые 12 hex символов)
 */
export function extractTimestampFromUUID7(uuid: string): Date | null {
    try {
        // Убираем дефисы из UUID
        const hex = uuid.replace(/-/g, '');

        // Первые 12 hex символов (48 бит) содержат timestamp в миллисекундах
        const timestampHex = hex.substring(0, 12);

        // Конвертируем hex в число (timestamp в миллисекундах)
        const timestamp = parseInt(timestampHex, 16);

        return new Date(timestamp);
    } catch (error) {
        console.error('Ошибка извлечения timestamp из UUID7:', error);
        return null;
    }
}

/**
 * Форматирует дату в читаемый вид
 * @param date - дата для форматирования
 * @param t - функция перевода из i18n (опциональна)
 */
export function formatMessageTime(date: Date, t?: (key: string) => string): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Если сегодня - показываем только время
    if (diff < 86400000 && now.getDate() === date.getDate()) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Если вчера
    if (diff < 172800000 && now.getDate() - date.getDate() === 1) {
        const yesterday = t ? t("chat.yesterday") : 'Вчера';
        return `${yesterday} ${date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    // Если в этом году - показываем дату и время без года
    if (now.getFullYear() === date.getFullYear()) {
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Полная дата
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

