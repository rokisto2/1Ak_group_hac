import config from '../config.json';

// Получаем базовый URL API
export const API_BASE_URL = config.API_BASE_URL;

export const API_CHAT_URL = config.API_CHAT_URL;

// Функция для генерации полного URL эндпоинта
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

export const getChatUrl = (endpoint) => `${API_CHAT_URL}${endpoint}`;