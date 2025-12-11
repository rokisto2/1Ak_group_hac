// frontend/tests/hooks/useMessages.test.ts
// Brief description:
// Tests the useMessages hook: loading messages, sending, updating, and adding messages.

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessages } from '../../src/hooks/useMessages';
import { MessageService } from '../../src/services/messageService';

vi.mock('../../src/services/messageService');

describe('useMessages Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadMessages', () => {
        it('loads messages successfully', async () => {
            const mockMessages = [
                {
                    id: 'msg-1',
                    text: 'Hello',
                    edited: false,
                    ownerFirstName: 'John',
                    ownerLastName: 'Doe',
                    ownerMiddleName: null,
                    ownerId: 'user-1',
                    chatId: 'chat-1',
                    repeatedMessageId: null
                },
                {
                    id: 'msg-2',
                    text: 'Hi',
                    edited: false,
                    ownerFirstName: 'Jane',
                    ownerLastName: 'Smith',
                    ownerMiddleName: null,
                    ownerId: 'user-2',
                    chatId: 'chat-1',
                    repeatedMessageId: null
                },
            ];
            MessageService.getMessages = vi.fn().mockResolvedValue(mockMessages);

            const { result } = renderHook(() => useMessages('user-123'));

            expect(result.current.loading).toBe(false);
            expect(result.current.messages).toEqual([]);

            await act(async () => {
                await result.current.loadMessages('chat-1');
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.messages).toEqual(mockMessages);
                expect(result.current.error).toBeNull();
            });
        });

        it('sets loading state during fetch', async () => {
            MessageService.getMessages = vi.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve([]), 100))
            );

            const { result } = renderHook(() => useMessages('user-123'));

            act(() => {
                result.current.loadMessages('chat-1');
            });

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('handles error during load', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            MessageService.getMessages = vi.fn().mockRejectedValue(new Error('Load failed'));

            const { result } = renderHook(() => useMessages('user-123'));

            await act(async () => {
                await result.current.loadMessages('chat-1');
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Не удалось загрузить сообщения');
                expect(result.current.loading).toBe(false);
            });

            consoleErrorSpy.mockRestore();
        });

        it('does not load if userId is null', async () => {
            MessageService.getMessages = vi.fn();

            const { result } = renderHook(() => useMessages(null));

            await act(async () => {
                await result.current.loadMessages('chat-1');
            });

            expect(MessageService.getMessages).not.toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        it('sends message successfully without reply', async () => {
            MessageService.sendMessage = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMessages('user-123'));

            await act(async () => {
                await result.current.sendMessage('chat-1', 'Hello world');
            });

            expect(MessageService.sendMessage).toHaveBeenCalledWith(
                'user-123',
                'chat-1',
                'Hello world',
                undefined
            );
        });

        it('sends message with reply', async () => {
            MessageService.sendMessage = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMessages('user-123'));

            await act(async () => {
                await result.current.sendMessage('chat-1', 'Reply text', 'msg-original');
            });

            expect(MessageService.sendMessage).toHaveBeenCalledWith(
                'user-123',
                'chat-1',
                'Reply text',
                'msg-original'
            );
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useMessages(null));

            await expect(
                act(async () => {
                    await result.current.sendMessage('chat-1', 'Text');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('updateMessage', () => {
        it('updates message successfully', async () => {
            MessageService.updateMessage = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useMessages('user-123'));

            await act(async () => {
                await result.current.updateMessage('chat-1', 'msg-1', 'Updated text');
            });

            expect(MessageService.updateMessage).toHaveBeenCalledWith(
                'user-123',
                'chat-1',
                'msg-1',
                'Updated text'
            );
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useMessages(null));

            await expect(
                act(async () => {
                    await result.current.updateMessage('chat-1', 'msg-1', 'Text');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('addMessage', () => {
        it('adds new message to the list', async () => {
            const { result } = renderHook(() => useMessages('user-123'));

            const newMessage = {
                id: 'msg-1',
                text: 'New message',
                edited: false,
                ownerFirstName: 'John',
                ownerLastName: 'Doe',
                ownerMiddleName: null,
                ownerId: 'user-1',
                chatId: 'chat-1',
                repeatedMessageId: null
            };

            act(() => {
                result.current.addMessage(newMessage);
            });

            expect(result.current.messages).toEqual([newMessage]);
        });

        it('does not add duplicate message', async () => {
            const { result } = renderHook(() => useMessages('user-123'));

            const message = {
                id: 'msg-1',
                text: 'Message',
                edited: false,
                ownerFirstName: 'John',
                ownerLastName: 'Doe',
                ownerMiddleName: null,
                ownerId: 'user-1',
                chatId: 'chat-1',
                repeatedMessageId: null
            };

            act(() => {
                result.current.addMessage(message);
            });

            expect(result.current.messages).toHaveLength(1);

            // Try to add the same message again
            act(() => {
                result.current.addMessage(message);
            });

            expect(result.current.messages).toHaveLength(1);
        });

        it('adds multiple different messages', async () => {
            const { result } = renderHook(() => useMessages('user-123'));

            const message1 = {
                id: 'msg-1',
                text: 'Message 1',
                edited: false,
                ownerFirstName: 'John',
                ownerLastName: 'Doe',
                ownerMiddleName: null,
                ownerId: 'user-1',
                chatId: 'chat-1',
                repeatedMessageId: null
            };
            const message2 = {
                id: 'msg-2',
                text: 'Message 2',
                edited: false,
                ownerFirstName: 'Jane',
                ownerLastName: 'Smith',
                ownerMiddleName: null,
                ownerId: 'user-2',
                chatId: 'chat-1',
                repeatedMessageId: null
            };

            act(() => {
                result.current.addMessage(message1);
                result.current.addMessage(message2);
            });

            expect(result.current.messages).toEqual([message1, message2]);
        });
    });

    describe('setMessages', () => {
        it('allows manual setting of messages', async () => {
            const { result } = renderHook(() => useMessages('user-123'));

            const newMessages = [
                {
                    id: 'msg-1',
                    text: 'Manual message',
                    edited: false,
                    ownerFirstName: 'John',
                    ownerLastName: 'Doe',
                    ownerMiddleName: null,
                    ownerId: 'user-1',
                    chatId: 'chat-1',
                    repeatedMessageId: null
                }
            ];

            act(() => {
                result.current.setMessages(newMessages);
            });

            expect(result.current.messages).toEqual(newMessages);
        });

        it('replaces existing messages', async () => {
            const { result } = renderHook(() => useMessages('user-123'));

            const oldMessages = [
                {
                    id: 'msg-1',
                    text: 'Old message',
                    edited: false,
                    ownerFirstName: 'John',
                    ownerLastName: 'Doe',
                    ownerMiddleName: null,
                    ownerId: 'user-1',
                    chatId: 'chat-1',
                    repeatedMessageId: null
                }
            ];
            const newMessages = [
                {
                    id: 'msg-2',
                    text: 'New message',
                    edited: false,
                    ownerFirstName: 'Jane',
                    ownerLastName: 'Smith',
                    ownerMiddleName: null,
                    ownerId: 'user-2',
                    chatId: 'chat-1',
                    repeatedMessageId: null
                }
            ];

            act(() => {
                result.current.setMessages(oldMessages);
            });

            expect(result.current.messages).toEqual(oldMessages);

            act(() => {
                result.current.setMessages(newMessages);
            });

            expect(result.current.messages).toEqual(newMessages);
        });
    });
});
