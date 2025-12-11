// frontend/tests/services/messageService.test.ts
// Brief description:
// Tests the MessageService: fetching messages, sending, updating, marking as viewed, and getting viewers.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MessageService } from '../../src/services/messageService';

vi.mock('axios');
vi.mock('../../src/utils/api', () => ({
    getChatUrl: vi.fn((endpoint) => `/mock-chat-api${endpoint}`),
}));

const mockedAxios = vi.mocked(axios, true);

describe('MessageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMessages', () => {
        it('fetches messages successfully', async () => {
            const mockMessages = [
                { id: 'msg-1', text: 'Hello', senderId: 'user-1' },
                { id: 'msg-2', text: 'Hi', senderId: 'user-2' },
            ];
            mockedAxios.get.mockResolvedValue({ data: { content: mockMessages } });

            const result = await MessageService.getMessages('user-123', 'chat-1', 0, 100);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages',
                { params: { page: 0, size: 100, sort: 'id,asc' } }
            );
            expect(result).toEqual(mockMessages);
        });

        it('returns empty array if content is undefined', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });

            const result = await MessageService.getMessages('user-123', 'chat-1');

            expect(result).toEqual([]);
        });

        it('throws error on fetch failure', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'));

            await expect(
                MessageService.getMessages('user-123', 'chat-1')
            ).rejects.toThrow('Network error');
        });

        it('uses default pagination values', async () => {
            mockedAxios.get.mockResolvedValue({ data: { content: [] } });

            await MessageService.getMessages('user-123', 'chat-1');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages',
                { params: { page: 0, size: 100, sort: 'id,asc' } }
            );
        });
    });

    describe('sendMessage', () => {
        it('sends message successfully without reply', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await MessageService.sendMessage('user-123', 'chat-1', 'Hello world');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages',
                { text: 'Hello world' }
            );
        });

        it('sends message with reply', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await MessageService.sendMessage('user-123', 'chat-1', 'Reply text', 'msg-original');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages',
                { text: 'Reply text', repeatedMessageId: 'msg-original' }
            );
        });

        it('throws error on send failure', async () => {
            mockedAxios.post.mockRejectedValue(new Error('Send failed'));

            await expect(
                MessageService.sendMessage('user-123', 'chat-1', 'Text')
            ).rejects.toThrow('Send failed');
        });
    });

    describe('updateMessage', () => {
        it('updates message successfully', async () => {
            mockedAxios.put.mockResolvedValue({ status: 200 });

            await MessageService.updateMessage('user-123', 'chat-1', 'msg-1', 'Updated text');

            expect(mockedAxios.put).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages/msg-1',
                { id: 'msg-1', text: 'Updated text', isEdited: true }
            );
        });

        it('throws error on update failure', async () => {
            mockedAxios.put.mockRejectedValue(new Error('Update failed'));

            await expect(
                MessageService.updateMessage('user-123', 'chat-1', 'msg-1', 'Text')
            ).rejects.toThrow('Update failed');
        });
    });

    describe('markAsViewed', () => {
        it('marks message as viewed successfully', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await MessageService.markAsViewed('user-123', 'chat-1', 'msg-1');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages/msg-1/viewed'
            );
        });

        it('does not throw error on failure (silent failure)', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockedAxios.post.mockRejectedValue(new Error('Mark failed'));

            // Should not throw
            await expect(
                MessageService.markAsViewed('user-123', 'chat-1', 'msg-1')
            ).resolves.toBeUndefined();

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('getMessageViewers', () => {
        it('fetches message viewers successfully', async () => {
            const mockViewers = [
                { id: 'user-1', name: 'User 1' },
                { id: 'user-2', name: 'User 2' },
            ];
            mockedAxios.get.mockResolvedValue({ data: { content: mockViewers } });

            const result = await MessageService.getMessageViewers('user-123', 'chat-1', 'msg-1', 0, 100);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                '/mock-chat-api/users/user-123/chats/chat-1/messages/msg-1/views',
                { params: { page: 0, size: 100 } }
            );
            expect(result).toEqual(mockViewers);
        });

        it('returns empty array if content is undefined', async () => {
            mockedAxios.get.mockResolvedValue({ data: {} });

            const result = await MessageService.getMessageViewers('user-123', 'chat-1', 'msg-1');

            expect(result).toEqual([]);
        });

        it('throws error on fetch failure', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Fetch viewers failed'));

            await expect(
                MessageService.getMessageViewers('user-123', 'chat-1', 'msg-1')
            ).rejects.toThrow('Fetch viewers failed');
        });
    });
});
