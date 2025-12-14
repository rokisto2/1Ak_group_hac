// frontend/tests/hooks/useChats.test.ts
// Brief description:
// Tests the useChats hook: loading chats, creating, updating, deleting, and adding users.

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChats } from '../../src/hooks/useChats';
import { ChatService } from '../../src/services/chatService';

vi.mock('../../src/services/chatService');

describe('useChats Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadChats', () => {
        it('loads chats successfully', async () => {
            const mockChats = [
                { id: 'chat-1', title: 'Chat 1', description: 'Test 1', ownerId: 'user-123', ownerName: 'Test Owner' },
                { id: 'chat-2', title: 'Chat 2', description: 'Test 2', ownerId: 'user-123', ownerName: 'Test Owner' },
            ];
            ChatService.getChats = vi.fn().mockResolvedValue(mockChats);

            const { result } = renderHook(() => useChats('user-123'));

            expect(result.current.loading).toBe(false);
            expect(result.current.chats).toEqual([]);

            await act(async () => {
                await result.current.loadChats();
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.chats).toEqual(mockChats);
                expect(result.current.error).toBeNull();
            });
        });

        it('sets loading state during fetch', async () => {
            ChatService.getChats = vi.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve([]), 100))
            );

            const { result } = renderHook(() => useChats('user-123'));

            act(() => {
                result.current.loadChats();
            });

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('handles error during load', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            ChatService.getChats = vi.fn().mockRejectedValue(new Error('Load failed'));

            const { result } = renderHook(() => useChats('user-123'));

            await act(async () => {
                await result.current.loadChats();
            });

            await waitFor(() => {
                expect(result.current.error).toBe('Не удалось загрузить чаты');
                expect(result.current.loading).toBe(false);
            });

            consoleErrorSpy.mockRestore();
        });

        it('does not load if userId is null', async () => {
            ChatService.getChats = vi.fn();

            const { result } = renderHook(() => useChats(null));

            await act(async () => {
                await result.current.loadChats();
            });

            expect(ChatService.getChats).not.toHaveBeenCalled();
        });
    });

    describe('createChat', () => {
        it('creates chat and reloads chats', async () => {
            ChatService.createChat = vi.fn().mockResolvedValue(undefined);
            ChatService.getChats = vi.fn().mockResolvedValue([
                { id: 'new-chat', title: 'New Chat', description: 'New Description', ownerId: 'user-123', ownerName: 'Test Owner' }
            ]);

            const { result } = renderHook(() => useChats('user-123'));

            await act(async () => {
                await result.current.createChat('New Chat', 'New Description');
            });

            expect(ChatService.createChat).toHaveBeenCalledWith('user-123', 'New Chat', 'New Description');
            expect(ChatService.getChats).toHaveBeenCalledWith('user-123');

            await waitFor(() => {
                expect(result.current.chats).toHaveLength(1);
            });
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useChats(null));

            await expect(
                act(async () => {
                    await result.current.createChat('Title', 'Description');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('updateChat', () => {
        it('updates chat and reloads chats', async () => {
            ChatService.updateChat = vi.fn().mockResolvedValue(undefined);
            ChatService.getChats = vi.fn().mockResolvedValue([
                { id: 'chat-1', title: 'Updated Chat', description: 'Updated Description', ownerId: 'user-123', ownerName: 'Test Owner' }
            ]);

            const { result } = renderHook(() => useChats('user-123'));

            await act(async () => {
                await result.current.updateChat('chat-1', 'Updated Chat', 'Updated Description');
            });

            expect(ChatService.updateChat).toHaveBeenCalledWith(
                'user-123',
                'chat-1',
                'Updated Chat',
                'Updated Description'
            );
            expect(ChatService.getChats).toHaveBeenCalledWith('user-123');
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useChats(null));

            await expect(
                act(async () => {
                    await result.current.updateChat('chat-1', 'Title', 'Description');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('deleteChat', () => {
        it('deletes chat and reloads chats', async () => {
            ChatService.deleteChat = vi.fn().mockResolvedValue(undefined);
            ChatService.getChats = vi.fn().mockResolvedValue([]);

            const { result } = renderHook(() => useChats('user-123'));

            await act(async () => {
                await result.current.deleteChat('chat-1');
            });

            expect(ChatService.deleteChat).toHaveBeenCalledWith('user-123', 'chat-1');
            expect(ChatService.getChats).toHaveBeenCalledWith('user-123');
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useChats(null));

            await expect(
                act(async () => {
                    await result.current.deleteChat('chat-1');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('addUserToChat', () => {
        it('adds user to chat successfully', async () => {
            ChatService.addUserToChat = vi.fn().mockResolvedValue(undefined);

            const { result } = renderHook(() => useChats('user-123'));

            await act(async () => {
                await result.current.addUserToChat('chat-1', 'user-456');
            });

            expect(ChatService.addUserToChat).toHaveBeenCalledWith('user-123', 'chat-1', 'user-456');
        });

        it('throws error if userId is null', async () => {
            const { result } = renderHook(() => useChats(null));

            await expect(
                act(async () => {
                    await result.current.addUserToChat('chat-1', 'user-456');
                })
            ).rejects.toThrow('User ID not found');
        });
    });

    describe('setChats', () => {
        it('allows manual setting of chats', async () => {
            const { result } = renderHook(() => useChats('user-123'));

            const newChats = [
                { id: 'chat-1', title: 'Manual Chat', description: 'Manually set', ownerId: 'user-123', ownerName: 'Test Owner' }
            ];

            act(() => {
                result.current.setChats(newChats);
            });

            expect(result.current.chats).toEqual(newChats);
        });
    });
});
