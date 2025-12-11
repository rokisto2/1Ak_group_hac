import { useState, useCallback } from 'react';
import { MessageService } from '../services';
import { Message } from '../types/chat';

export const useMessages = (userId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMessages = useCallback(async (chatId: string) => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await MessageService.getMessages(userId, chatId);
            setMessages(data);
        } catch (err) {
            setError('Не удалось загрузить сообщения');
            console.error('Ошибка загрузки сообщений:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const sendMessage = useCallback(async (
        chatId: string,
        text: string,
        replyToMessageId?: string
    ) => {
        if (!userId) throw new Error('User ID not found');

        await MessageService.sendMessage(userId, chatId, text, replyToMessageId);
    }, [userId]);

    const updateMessage = useCallback(async (
        chatId: string,
        messageId: string,
        text: string
    ) => {
        if (!userId) throw new Error('User ID not found');

        await MessageService.updateMessage(userId, chatId, messageId, text);
    }, [userId]);

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => {
            // Проверяем, нет ли уже такого сообщения
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    return {
        messages,
        loading,
        error,
        loadMessages,
        sendMessage,
        updateMessage,
        setMessages,
        addMessage
    };
};

