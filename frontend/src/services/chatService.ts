import axios from 'axios';
import { getChatUrl } from '../utils/api';
import { Chat } from '../types/chat';

export class ChatService {
    /**
     * Загружает список чатов для пользователя
     */
    static async getChats(userId: string, page = 0, size = 100): Promise<Chat[]> {
        try {
            const response = await axios.get(getChatUrl(`/users/${userId}/chats`), {
                params: { page, size }
            });
            return response.data.content || [];
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
            throw error;
        }
    }

    /**
     * Создает новый чат
     */
    static async createChat(userId: string, title: string, description: string): Promise<void> {
        try {
            await axios.post(getChatUrl(`/users/${userId}/chats`), {
                title,
                description
            });
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            throw error;
        }
    }

    /**
     * Обновляет настройки чата
     */
    static async updateChat(
        userId: string,
        chatId: string,
        title: string,
        description: string
    ): Promise<void> {
        try {
            await axios.put(
                getChatUrl(`/users/${userId}/chats/${chatId}/settings`),
                { title, description }
            );
        } catch (error) {
            console.error('Ошибка обновления чата:', error);
            throw error;
        }
    }

    /**
     * Удаляет чат
     */
    static async deleteChat(userId: string, chatId: string): Promise<void> {
        try {
            await axios.delete(getChatUrl(`/users/${userId}/chats/${chatId}`));
        } catch (error) {
            console.error('Ошибка удаления чата:', error);
            throw error;
        }
    }

    /**
     * Добавляет пользователя в чат
     */
    static async addUserToChat(
        userId: string,
        chatId: string,
        targetUserId: string
    ): Promise<void> {
        try {
            await axios.post(
                getChatUrl(`/users/${userId}/chats/${chatId}/users`),
                { userId: targetUserId }
            );
        } catch (error) {
            console.error('Ошибка добавления пользователя в чат:', error);
            throw error;
        }
    }

    /**
     * Получает список участников чата
     * Примечание: Backend API для получения участников конкретного чата отсутствует,
     * поэтому временно используется список всех пользователей
     */
    static async getChatUsers(
        userId: string,
        chatId: string,
        page = 0,
        size = 100
    ): Promise<any[]> {
        try {
            const response = await axios.get(
                getChatUrl(`/users/${userId}/chats/${chatId}/users`),
                { params: { page, size } }
            );
            return response.data.content || [];
        } catch (error) {
            console.error('Ошибка загрузки участников чата:', error);
            throw error;
        }
    }

    /**
     * Удаляет пользователя из чата
     */
    static async removeUserFromChat(
        userId: string,
        chatId: string,
        targetUserId: string
    ): Promise<void> {
        try {
            await axios.delete(
                getChatUrl(`/users/${userId}/chats/${chatId}/users/${targetUserId}`)
            );
        } catch (error) {
            console.error('Ошибка удаления пользователя из чата:', error);
            throw error;
        }
    }
}

