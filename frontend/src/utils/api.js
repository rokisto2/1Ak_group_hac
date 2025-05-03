import config from '../config.json';

// Получаем базовый URL API
export const API_BASE_URL = config.API_BASE_URL;

// Функция для генерации полного URL эндпоинта
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;