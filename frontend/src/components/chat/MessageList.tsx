import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Box, VStack, Center, Spinner, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types/chat';
import { MessageItem } from './MessageItem';

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
    chatId: string;
    loading?: boolean;
    onEditMessage: (message: Message) => void;
    onReplyToMessage: (message: Message) => void;
    onViewMessage: (messageId: string) => void;
    onShowViewers: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = React.memo(({
    messages,
    currentUserId,
    loading = false,
    onEditMessage,
    onReplyToMessage,
    onViewMessage,
    onShowViewers
}) => {
    const { t } = useTranslation();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [prevMessagesLength, setPrevMessagesLength] = useState(messages.length);
    const containerRef = useRef<HTMLDivElement>(null);

    // Автопрокрутка только при добавлении новых сообщений
    useEffect(() => {
        if (messages.length > prevMessagesLength) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        setPrevMessagesLength(messages.length);
    }, [messages.length, prevMessagesLength]);

    // Функция прокрутки к конкретному сообщению
    const scrollToMessage = useCallback((messageId: string) => {
        const messageElement = messageRefs.current.get(messageId);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
            // Подсветка сообщения
            messageElement.style.transition = "background-color 0.3s";
            messageElement.style.backgroundColor = "rgba(66, 153, 225, 0.2)";
            setTimeout(() => {
                messageElement.style.backgroundColor = "transparent";
            }, 1500);
        }
    }, []);

    // Сохранение рефа для каждого сообщения
    const setMessageRef = useCallback((messageId: string) => (el: HTMLDivElement | null) => {
        if (el) {
            messageRefs.current.set(messageId, el);
        } else {
            messageRefs.current.delete(messageId);
        }
    }, []);

    if (loading) {
        return (
            <Box
                flex={1}
                overflowY="auto"
                overflowX="hidden"
                p={4}
                bg="gray.50"
                backgroundImage="radial-gradient(#e2e8f0 1px, transparent 1px)"
                backgroundSize="20px 20px"
            >
                <Center h="100%">
                    <Spinner size="xl" color="blue.500" />
                </Center>
            </Box>
        );
    }

    if (messages.length === 0) {
        return (
            <Box
                flex={1}
                overflowY="auto"
                overflowX="hidden"
                p={4}
                bg="gray.50"
                backgroundImage="radial-gradient(#e2e8f0 1px, transparent 1px)"
                backgroundSize="20px 20px"
            >
                <Center h="100%">
                    <VStack color="gray.400">
                        <Text>{t('chat.noMessages')}</Text>
                        <Text fontSize="sm">{t('chat.writeFirstMessage')}</Text>
                    </VStack>
                </Center>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            flex={1}
            overflowY="auto"
            overflowX="hidden"
            p={4}
            bg="gray.50"
            backgroundImage="radial-gradient(#e2e8f0 1px, transparent 1px)"
            backgroundSize="20px 20px"
        >
            <VStack spacing={4} align="stretch" overflow="hidden" w="100%">
                {messages.map((message) => {
                    const replyToMessage = message.repeatedMessageId
                        ? messages.find(m => m.id === message.repeatedMessageId)
                        : null;

                    return (
                        <Box key={message.id} ref={setMessageRef(message.id)}>
                            <MessageItem
                                message={message}
                                isOwn={message.ownerId === currentUserId}
                                onEdit={
                                    message.ownerId === currentUserId
                                        ? () => onEditMessage(message)
                                        : undefined
                                }
                                onReply={() => onReplyToMessage(message)}
                                onScrollToMessage={scrollToMessage}
                                onViewMessage={onViewMessage}
                                onShowViewers={onShowViewers}
                                replyToMessage={replyToMessage}
                            />
                        </Box>
                    );
                })}
                <div ref={messagesEndRef} />
            </VStack>
        </Box>
    );
});

