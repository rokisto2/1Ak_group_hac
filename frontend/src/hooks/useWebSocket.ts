import { useEffect, useRef, useCallback, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { getChatUrl } from '../utils/api';
import { WebSocketEvent } from '../types/chat';
import { Chat } from '../types/chat';

interface UseWebSocketProps {
    userId: string | null;
    onEvent: (event: WebSocketEvent) => void;
    userChats?: Chat[];
}

export const useWebSocket = ({ userId, onEvent, userChats = [] }: UseWebSocketProps) => {
    const stompClientRef = useRef<Client | null>(null);
    const allChatsSubscriptionsRef = useRef<Map<string, StompSubscription>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    const handleWebSocketMessage = useCallback((message: IMessage) => {
        try {
            const event: WebSocketEvent = JSON.parse(message.body);
            onEvent(event);
        } catch (error) {
            console.error('Ошибка парсинга WebSocket сообщения:', error);
        }
    }, [onEvent]);

    // Основное подключение к WebSocket
    useEffect(() => {
        if (!userId) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(getChatUrl('/websocket').replace("api/", "")) as any,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('WebSocket подключен');
                setIsConnected(true);

                // Подписка на персональный топик пользователя
                // Сюда приходят уведомления о новых чатах и глобальные события
                client.subscribe(`/topic/users/${userId}`, handleWebSocketMessage);
            },
            onDisconnect: () => {
                console.log('WebSocket отключен');
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error('STOMP ошибка:', frame);
                setIsConnected(false);
            },
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            console.log('Очистка WebSocket соединения');
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
            // Очищаем все подписки на чаты
            allChatsSubscriptionsRef.current.forEach(sub => sub.unsubscribe());
            allChatsSubscriptionsRef.current.clear();
        };
    }, [userId, handleWebSocketMessage]);

    // Подписка на все чаты пользователя
    useEffect(() => {
        const client = stompClientRef.current;
        if (!client || !userChats.length) return;

        const subscribeToAllChats = () => {
            if (!client.connected) return;

            // Получаем текущие ID чатов
            const currentChatIds = new Set(userChats.map(chat => chat.id));

            // Отписываемся от чатов, которых больше нет в списке
            allChatsSubscriptionsRef.current.forEach((subscription, chatId) => {
                if (!currentChatIds.has(chatId)) {
                    subscription.unsubscribe();
                    allChatsSubscriptionsRef.current.delete(chatId);
                    console.log(`Отписка от чата: ${chatId}`);
                }
            });

            // Подписываемся на новые чаты
            userChats.forEach(chat => {
                if (!allChatsSubscriptionsRef.current.has(chat.id)) {
                    const subscription = client.subscribe(
                        `/topic/chats/${chat.id}`,
                        handleWebSocketMessage
                    );
                    allChatsSubscriptionsRef.current.set(chat.id, subscription);
                    console.log(`Подписка на чат: ${chat.id}`);
                }
            });
        };

        // Если уже подключены - подписываемся сразу
        if (client.connected) {
            subscribeToAllChats();
        } else {
            // Иначе ждем подключения
            const checkConnection = setInterval(() => {
                if (client.connected) {
                    subscribeToAllChats();
                    clearInterval(checkConnection);
                }
            }, 100);

            // Очистка интервала через 5 секунд
            const timeout = setTimeout(() => clearInterval(checkConnection), 5000);

            return () => {
                clearInterval(checkConnection);
                clearTimeout(timeout);
            };
        }

        return () => {
        };
    }, [userChats, handleWebSocketMessage]);

    return {
        isConnected
    };
};

