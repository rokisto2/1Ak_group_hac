// frontend/tests/hooks/useUsers.test.ts
// Brief description:
// Tests the useUsers hook: loading users list.

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsers } from '../../src/hooks';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../src/utils/api', () => ({
    getChatUrl: vi.fn((endpoint) => `/mock-chat-api${endpoint}`),
}));

const mockedAxios = vi.mocked(axios, true);

describe('useUsers Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadUsers', () => {
        it('loads users successfully', async () => {
            const mockUsers = [
                { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
                { id: 'user-2', name: 'User 2', email: 'user2@test.com' },
            ];
            mockedAxios.get.mockResolvedValue({ data: { content: mockUsers } });

            const { result } = renderHook(() => useUsers('user-123'));

            expect(result.current.users).toEqual([]);

            await act(async () => {
                await result.current.loadUsers();
            });

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith('/mock-chat-api/users/user-123/all', {
                    params: { page: 0, size: 1000 }
                });
                expect(result.current.users).toEqual(mockUsers);
            });
        });

        it('returns empty array if content is undefined', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });

            const { result } = renderHook(() => useUsers('user-123'));

            await act(async () => {
                await result.current.loadUsers();
            });

            await waitFor(() => {
                expect(result.current.users).toEqual([]);
            });
        });

        it('handles error during load silently', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockedAxios.get.mockRejectedValue(new Error('Load failed'));

            const { result } = renderHook(() => useUsers('user-123'));

            await act(async () => {
                await result.current.loadUsers();
            });

            // Should not throw, just log error
            expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка загрузки пользователей', expect.any(Error));
            expect(result.current.users).toEqual([]);

            consoleErrorSpy.mockRestore();
        });

        it('does not load if userId is null', async () => {
            const { result } = renderHook(() => useUsers(null));

            await act(async () => {
                await result.current.loadUsers();
            });

            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(result.current.users).toEqual([]);
        });

        it('loads large number of users with correct pagination', async () => {
            const mockUsers = Array.from({ length: 100 }, (_, i) => ({
                id: `user-${i}`,
                name: `User ${i}`,
                email: `user${i}@test.com`
            }));
            mockedAxios.get.mockResolvedValue({ data: { content: mockUsers } });

            const { result } = renderHook(() => useUsers('user-123'));

            await act(async () => {
                await result.current.loadUsers();
            });

            await waitFor(() => {
                expect(result.current.users).toHaveLength(100);
            });
        });
    });
});
