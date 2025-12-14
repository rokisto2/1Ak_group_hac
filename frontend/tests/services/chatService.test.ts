// frontend/tests/services/chatService.test.ts
// Brief description:
// Tests the ChatService: fetching chats, creating, updating, deleting chats, and managing users.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ChatService } from '../../src/services/chatService';

vi.mock('axios');
vi.mock('../../src/utils/api', () => ({
    getChatUrl: vi.fn((endpoint) => `/mock-chat-api${endpoint}`),
}));

const mockedAxios = vi.mocked(axios, true);

describe('ChatService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getChats', () => {
        it('fetches chats successfully', async () => {
            const mockChats = [
                { id: 'chat-1', title: 'Chat 1', description: 'Test chat 1' },
                { id: 'chat-2', title: 'Chat 2', description: 'Test chat 2' },
            ];
            mockedAxios.get.mockResolvedValue({ data: { content: mockChats } });

            const result = await ChatService.getChats('user-123', 0, 100);

            expect(mockedAxios.get).toHaveBeenCalledWith('/mock-chat-api/users/user-123/chats', {
                params: { page: 0, size: 100 }
            });
            expect(result).toEqual(mockChats);
        });

        it('returns empty array if content is undefined', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });

            const result = await ChatService.getChats('user-123');

            expect(result).toEqual([]);
        });

        it('throws error on fetch failure', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'));

            await expect(ChatService.getChats('user-123')).rejects.toThrow('Network error');
        });

        it('uses default pagination values', async () => {
            mockedAxios.get.mockResolvedValue({ data: { content: [] } });

            await ChatService.getChats('user-123');

            expect(mockedAxios.get).toHaveBeenCalledWith('/mock-chat-api/users/user-123/chats', {
                params: { page: 0, size: 100 }
            });
        });
    });

    describe('createChat', () => {
        it('creates chat successfully', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await ChatService.createChat('user-123', 'New Chat', 'New chat description');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats',
                { title: 'New Chat', description: 'New chat description' }
            );
        });

        it('throws error on creation failure', async () => {
            mockedAxios.post.mockRejectedValue(new Error('Creation failed'));

            await expect(
                ChatService.createChat('user-123', 'New Chat', 'Description')
            ).rejects.toThrow('Creation failed');
        });
    });

    describe('updateChat', () => {
        it('updates chat successfully', async () => {
            mockedAxios.put.mockResolvedValue({ status: 200 });

            await ChatService.updateChat('user-123', 'chat-1', 'Updated Title', 'Updated Description');

            expect(mockedAxios.put).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/settings',
                { title: 'Updated Title', description: 'Updated Description' }
            );
        });

        it('throws error on update failure', async () => {
            mockedAxios.put.mockRejectedValue(new Error('Update failed'));

            await expect(
                ChatService.updateChat('user-123', 'chat-1', 'Title', 'Description')
            ).rejects.toThrow('Update failed');
        });
    });

    describe('deleteChat', () => {
        it('deletes chat successfully', async () => {
            mockedAxios.delete.mockResolvedValue({ status: 200 });

            await ChatService.deleteChat('user-123', 'chat-1');

            expect(mockedAxios.delete).toHaveBeenCalledWith('/mock-chat-api/users/user-123/chats/chat-1');
        });

        it('throws error on deletion failure', async () => {
            mockedAxios.delete.mockRejectedValue(new Error('Deletion failed'));

            await expect(
                ChatService.deleteChat('user-123', 'chat-1')
            ).rejects.toThrow('Deletion failed');
        });
    });

    describe('addUserToChat', () => {
        it('adds user to chat successfully', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await ChatService.addUserToChat('user-123', 'chat-1', 'user-456');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/users',
                { userId: 'user-456' }
            );
        });

        it('throws error on add user failure', async () => {
            mockedAxios.post.mockRejectedValue(new Error('Add user failed'));

            await expect(
                ChatService.addUserToChat('user-123', 'chat-1', 'user-456')
            ).rejects.toThrow('Add user failed');
        });
    });

    describe('getChatUsers', () => {
        it('fetches chat users successfully', async () => {
            const mockUsers = [
                { id: 'user-1', name: 'User 1' },
                { id: 'user-2', name: 'User 2' },
            ];
            mockedAxios.get.mockResolvedValue({ data: { content: mockUsers } });

            const result = await ChatService.getChatUsers('user-123', 'chat-1', 0, 100);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/users',
                { params: { page: 0, size: 100 } }
            );
            expect(result).toEqual(mockUsers);
        });

        it('returns empty array if content is undefined', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });

            const result = await ChatService.getChatUsers('user-123', 'chat-1');

            expect(result).toEqual([]);
        });

        it('throws error on fetch failure', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Fetch users failed'));

            await expect(
                ChatService.getChatUsers('user-123', 'chat-1')
            ).rejects.toThrow('Fetch users failed');
        });
    });
});
