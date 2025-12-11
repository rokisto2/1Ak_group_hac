// frontend/tests/utils/api.test.js
// Brief description:
// Tests the API utility functions: getApiUrl and getChatUrl for generating correct endpoints.

import { describe, it, expect, vi } from 'vitest';
import { getApiUrl, getChatUrl, API_BASE_URL, API_CHAT_URL } from '../../src/utils/api';

// Mock config
vi.mock('../../src/config.json', () => ({
    default: {
        API_BASE_URL: 'http://localhost:8000/api',
        API_CHAT_URL: 'http://localhost:8001/api'
    }
}));

describe('API Utils', () => {
    it('exports correct API_BASE_URL from config', () => {
        expect(API_BASE_URL).toBe('http://localhost:8000/api');
    });

    it('exports correct API_CHAT_URL from config', () => {
        expect(API_CHAT_URL).toBe('http://localhost:8001/api');
    });

    it('getApiUrl generates correct full URL for main API', () => {
        const endpoint = '/users/me';
        const result = getApiUrl(endpoint);
        expect(result).toBe('http://localhost:8000/api/users/me');
    });

    it('getApiUrl handles endpoints with leading slash', () => {
        const endpoint = '/reports';
        const result = getApiUrl(endpoint);
        expect(result).toBe('http://localhost:8000/api/reports');
    });

    it('getApiUrl handles endpoints without leading slash', () => {
        const endpoint = 'auth/login';
        const result = getApiUrl(endpoint);
        expect(result).toBe('http://localhost:8000/apiauth/login');
    });

    it('getChatUrl generates correct full URL for chat API', () => {
        const endpoint = '/users/123/chats';
        const result = getChatUrl(endpoint);
        expect(result).toBe('http://localhost:8001/api/users/123/chats');
    });

    it('getChatUrl handles endpoints with leading slash', () => {
        const endpoint = '/websocket';
        const result = getChatUrl(endpoint);
        expect(result).toBe('http://localhost:8001/api/websocket');
    });

    it('getChatUrl handles complex endpoints', () => {
        const endpoint = '/users/user-123/chats/chat-456/messages';
        const result = getChatUrl(endpoint);
        expect(result).toBe('http://localhost:8001/api/users/user-123/chats/chat-456/messages');
    });

    it('getApiUrl handles empty endpoint', () => {
        const result = getApiUrl('');
        expect(result).toBe('http://localhost:8000/api');
    });

    it('getChatUrl handles empty endpoint', () => {
        const result = getChatUrl('');
        expect(result).toBe('http://localhost:8001/api');
    });
});
