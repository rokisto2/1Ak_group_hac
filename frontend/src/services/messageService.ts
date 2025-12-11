import axios from 'axios';
import { getChatUrl } from '../utils/api';
import { Message } from '../types/chat';

export class MessageService {
    /**
     * Загружает сообщения чата
     */
    static async getMessages(
        userId: string,
        chatId: string,
        page = 0,
        size = 100
    ): Promise<Message[]> {
        try {
            const response = await axios.get(
                getChatUrl(`/users/${userId}/chats/${chatId}/messages`),
                { params: { page, size, sort: 'id,asc' } }
            );
            return response.data.content || [];
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            throw error;
        }
    }

    /**
     * Отправляет новое сообщение
     */
    static async sendMessage(
        userId: string,
        chatId: string,
        text: string,
        replyToMessageId?: string
    ): Promise<void> {
        try {
            const payload: any = { text };
            if (replyToMessageId) {
                payload.repeatedMessageId = replyToMessageId;
            }

            await axios.post(
                getChatUrl(`/users/${userId}/chats/${chatId}/messages`),
                payload
            );
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            throw error;
        }
    }

    /**
     * Обновляет существующее сообщение
     */
    static async updateMessage(
        userId: string,
        chatId: string,
        messageId: string,
        text: string
    ): Promise<void> {
        try {
            await axios.put(
                getChatUrl(`/users/${userId}/chats/${chatId}/messages/${messageId}`),
                { id: messageId, text, isEdited: true }
            );
        } catch (error) {
            console.error('Ошибка обновления сообщения:', error);
            throw error;
        }
    }

    /**
     * Отмечает сообщение как просмотренное
     */
    static async markAsViewed(
        userId: string,
        chatId: string,
        messageId: string
    ): Promise<void> {
        try {
            await axios.post(
                getChatUrl(`/users/${userId}/chats/${chatId}/messages/${messageId}/viewed`)
            );
        } catch (error) {
            console.error('Ошибка отметки сообщения как просмотренного:', error);
            // Не пробрасываем ошибку, чтобы не мешать работе приложения
        }
    }

    /**
     * Получает список пользователей, просмотревших сообщение
     */
    static async getMessageViewers(
        userId: string,
        chatId: string,
        messageId: string,
        page = 0,
        size = 100
    ): Promise<any[]> {
        try {
            const response = await axios.get(
                getChatUrl(`/users/${userId}/chats/${chatId}/messages/${messageId}/views`),
                { params: { page, size } }
            );
            return response.data.content || [];
        } catch (error) {
            console.error('Ошибка загрузки просмотров сообщения:', error);
            throw error;
        }
    }
}

