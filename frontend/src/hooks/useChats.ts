import { useState, useCallback } from 'react';
import { ChatService } from '../services';
import { Chat } from '../types/chat';

export const useChats = (userId: string | null) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadChats = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await ChatService.getChats(userId);
            setChats(data);
        } catch (err) {
            setError('Не удалось загрузить чаты');
            console.error('Ошибка загрузки чатов:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createChat = useCallback(async (title: string, description: string) => {
        if (!userId) throw new Error('User ID not found');

        await ChatService.createChat(userId, title, description);
        await loadChats();
    }, [userId, loadChats]);

    const updateChat = useCallback(async (chatId: string, title: string, description: string) => {
        if (!userId) throw new Error('User ID not found');

        await ChatService.updateChat(userId, chatId, title, description);
        await loadChats();
    }, [userId, loadChats]);

    const deleteChat = useCallback(async (chatId: string) => {
        if (!userId) throw new Error('User ID not found');

        await ChatService.deleteChat(userId, chatId);
        await loadChats();
    }, [userId, loadChats]);

    const addUserToChat = useCallback(async (chatId: string, targetUserId: string) => {
        if (!userId) throw new Error('User ID not found');

        await ChatService.addUserToChat(userId, chatId, targetUserId);
    }, [userId]);

    return {
        chats,
        loading,
        error,
        loadChats,
        createChat,
        updateChat,
        deleteChat,
        addUserToChat,
        setChats
    };
};

