import { useEffect, useState, useCallback } from 'react';
import { Box, useToast, useDisclosure, Flex, Spinner, Center } from "@chakra-ui/react";
import { useTranslation } from 'react-i18next';
import Navbar from "../components/Navbar";
import { Chat, Message, WebSocketEvent } from "../types/chat";
import { useChats } from "../hooks/useChats";
import { useMessages } from "../hooks/useMessages";
import { useUsers } from "../hooks/useUsers";
import { useWebSocket } from "../hooks/useWebSocket";
import { ChatList } from "../components/chat/ChatList";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { MessageInput } from "../components/chat/MessageInput";
import { EmptyChatState } from "../components/chat/EmptyChatState";
import { CreateChatModal } from "../components/chat/modals/CreateChatModal";
import { ChatSettingsModal } from "../components/chat/modals/ChatSettingsModal";
import { AddUserModal } from "../components/chat/modals/AddUserModal";
import { DeleteChatDialog } from "../components/chat/modals/DeleteChatDialog";
import { ChatMembersModal } from "../components/chat/modals/ChatMembersModal";
import { MessageViewersModal } from "../components/chat/modals/MessageViewersModal";
import { MessageService } from "../services/messageService";

function ChatPage() {
    const { t } = useTranslation();
    const [currentUserId, setCurrentUserId] = useState<string | null>(sessionStorage.getItem("userId"));
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messageText, setMessageText] = useState('');
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMessageForViewers, setSelectedMessageForViewers] = useState<string | null>(null);

    const toast = useToast();

    // Хуки для работы с данными

    const { chats, loadChats, createChat, updateChat, deleteChat, addUserToChat, setChats } = useChats(currentUserId);
    const { messages, loading: messagesLoading, loadMessages, sendMessage, updateMessage, addMessage, setMessages } = useMessages(currentUserId);
    const { users, loadUsers } = useUsers(currentUserId);

    // Модальные окна
    const { isOpen: isCreateChatOpen, onOpen: onCreateChatOpen, onClose: onCreateChatClose } = useDisclosure();
    const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
    const { isOpen: isAddUserOpen, onOpen: onAddUserOpen, onClose: onAddUserClose } = useDisclosure();
    const { isOpen: isDeleteChatOpen, onOpen: onDeleteChatOpen, onClose: onDeleteChatClose } = useDisclosure();
    const { isOpen: isMembersOpen, onOpen: onMembersOpen, onClose: onMembersClose } = useDisclosure();
    const { isOpen: isViewersOpen, onOpen: onViewersOpen, onClose: onViewersClose } = useDisclosure();

    // WebSocket обработчик событий
    const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
        switch (event.type) {
            case 'NEW_MESSAGE':
                if (selectedChat && event.payload.chatId === selectedChat.id) {
                    addMessage(event.payload);
                }
                if (currentUserId) loadChats();
                break;

            case 'MESSAGE_UPDATED':
                if (selectedChat && event.payload.chatId === selectedChat.id) {
                    // Обновляем сообщение локально для всех пользователей
                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            msg.id === event.payload.id
                                ? { ...msg, text: event.payload.text, edited: true }
                                : msg
                        )
                    );
                }
                break;

            case 'CHAT_CREATED':
            case 'USER_JOINED':
                if (currentUserId) loadChats();
                break;

            case 'CHAT_UPDATED':
                // Обновляем чат в списке локально
                setChats(prevChats =>
                    prevChats.map(chat =>
                        chat.id === event.payload.id
                            ? {
                                ...chat,
                                title: event.payload.title,
                                description: event.payload.description
                            }
                            : chat
                    )
                );
                // Обновляем выбранный чат, если он был изменен
                if (selectedChat && event.payload.id === selectedChat.id) {
                    setSelectedChat({
                        ...selectedChat,
                        title: event.payload.title,
                        description: event.payload.description
                    });
                }
                break;

            case 'CHAT_DELETED':
                if (currentUserId) loadChats();
                // payload содержит ID удаленного чата
                if (selectedChat && selectedChat.id === event.payload) {
                    setSelectedChat(null);
                    setMessages([]);
                    toast({
                        title: t('chat.chatDeleted'),
                        description: t('chat.chatDeletedByOwner'),
                        status: 'info',
                        duration: 3000,
                        isClosable: true
                    });
                }
                break;

            case 'USER_LEFT':
                if (currentUserId) loadChats();
                // Если текущий пользователь был исключен из чата
                if (selectedChat && event.payload === currentUserId) {
                    setSelectedChat(null);
                    setMessages([]);
                    toast({
                        title: t('chat.youWereRemoved'),
                        description: t('chat.youWereRemoved'),
                        status: 'info',
                        duration: 3000,
                        isClosable: true
                    });
                }
                break;
        }
    }, [selectedChat, currentUserId, loadChats, addMessage, setMessages, setChats, toast]);

    // Подключение к WebSocket
    useWebSocket({
        userId: currentUserId,
        onEvent: handleWebSocketEvent,
        userChats: chats // Передаем список чатов для подписки на все топики
    });

    // Инициализация
    useEffect(() => {
        const userId = sessionStorage.getItem('userId');
        if (userId) {
            setCurrentUserId(userId);
            loadChats();
            loadUsers();
        }
    }, []);

    // Загрузка сообщений при выборе чата
    useEffect(() => {
        if (selectedChat && currentUserId) {
            loadMessages(selectedChat.id);
            setMessageText('');
            setReplyToMessage(null);
            setEditingMessage(null);
        }
    }, [selectedChat, currentUserId, loadMessages]);

    // Обработчики действий с чатами
    const handleCreateChat = async (title: string, description: string) => {
        try {
            await createChat(title, description);
            toast({
                title: t('chat.chatCreated'),
                status: 'success',
                duration: 2000,
                isClosable: true
            });
        } catch (error: any) {
            toast({
                title: t('common.error'),
                description: error.response?.data?.message || t('chat.errorCreatingChat'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleUpdateChat = async (chatId: string, title: string, description: string) => {
        try {
            await updateChat(chatId, title, description);
            // Обновление происходит через WebSocket событие CHAT_UPDATED
            toast({
                title: t('chat.settingsUpdated'),
                status: 'success',
                duration: 2000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorUpdatingSettings'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleDeleteChat = async () => {
        if (!selectedChat) return;
        try {
            await deleteChat(selectedChat.id);
            setSelectedChat(null);
            setMessages([]);
            toast({
                title: t('chat.chatDeleted'),
                status: 'success',
                duration: 2000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorDeletingChat'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    const handleAddUser = async (userId: string) => {
        if (!selectedChat) return;
        try {
            await addUserToChat(selectedChat.id, userId);
            toast({
                title: t('chat.userAdded'),
                status: 'success',
                duration: 2000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorAddingUser'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    };

    // Обработчики действий с сообщениями
    const handleSendMessage = useCallback(async () => {
        if (!messageText.trim() || !selectedChat) return;
        try {
            await sendMessage(selectedChat.id, messageText, replyToMessage?.id);
            setMessageText('');
            setReplyToMessage(null);
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorSendingMessage'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    }, [messageText, selectedChat, replyToMessage, sendMessage, toast, t]);

    const handleUpdateMessage = useCallback(async () => {
        if (!editingMessage || !messageText.trim() || !selectedChat) return;
        try {
            await updateMessage(selectedChat.id, editingMessage.id, messageText);

            // Обновляем сообщение локально вместо перезагрузки всех сообщений
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === editingMessage.id
                        ? { ...msg, text: messageText, edited: true }
                        : msg
                )
            );

            setMessageText('');
            setEditingMessage(null);
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorUpdatingMessage'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        }
    }, [editingMessage, messageText, selectedChat, updateMessage, setMessages, toast, t]);

    const handleMessageTextChange = useCallback((text: string) => {
        setMessageText(text);
    }, []);

    const handleEditMessage = useCallback((message: Message) => {
        // Отменяем ответ, если он был активен
        setReplyToMessage(null);
        setEditingMessage(message);
        setMessageText(message.text);
    }, []);

    const handleReplyToMessage = useCallback((message: Message) => {
        // Отменяем редактирование, если оно было активно
        setEditingMessage(null);
        setMessageText('');
        setReplyToMessage(message);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyToMessage(null);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setMessageText('');
    }, []);

    const handleViewMessage = useCallback(async (messageId: string) => {
        if (!currentUserId || !selectedChat) return;
        try {
            await MessageService.markAsViewed(currentUserId, selectedChat.id, messageId);
        } catch (error) {
            console.error('Ошибка отметки просмотра:', error);
        }
    }, [currentUserId, selectedChat]);

    const handleShowViewers = useCallback((messageId: string) => {
        setSelectedMessageForViewers(messageId);
        onViewersOpen();
    }, [onViewersOpen]);

    const handleCloseViewers = useCallback(() => {
        setSelectedMessageForViewers(null);
        onViewersClose();
    }, [onViewersClose]);

    if (!currentUserId) {
        return (
            <Center h="100vh">
                <Spinner size="xl" />
            </Center>
        );
    }

    return (
        <Box h="90vh" overflow="hidden" display="flex" flexDirection="column">
            <Navbar title="Чат" />

            <Flex flex={1} overflow="hidden" overflowX="hidden">
                {/* Левая панель - Список чатов */}
                <ChatList
                    chats={chats}
                    selectedChatId={selectedChat?.id || null}
                    searchQuery={searchQuery}
                    onSelectChat={setSelectedChat}
                    onSearchChange={setSearchQuery}
                    onCreateChat={onCreateChatOpen}
                />

                {/* Правая панель - Сообщения */}
                <Box
                    flex={1}
                    display="flex"
                    flexDirection="column"
                    bg="white"
                    overflow="hidden"
                    minW="700px"
                    maxW="700px"
                >
                    {selectedChat && currentUserId ? (
                        <>
                            <ChatHeader
                                chat={selectedChat}
                                currentUserId={currentUserId}
                                onAddUser={onAddUserOpen}
                                onSettings={onSettingsOpen}
                                onDelete={onDeleteChatOpen}
                                onViewMembers={onMembersOpen}
                            />

                            <MessageList
                                messages={messages}
                                currentUserId={currentUserId}
                                chatId={selectedChat.id}
                                loading={messagesLoading}
                                onEditMessage={handleEditMessage}
                                onReplyToMessage={handleReplyToMessage}
                                onViewMessage={handleViewMessage}
                                onShowViewers={handleShowViewers}
                            />

                            <MessageInput
                                value={messageText}
                                replyToMessage={replyToMessage}
                                editingMessage={editingMessage}
                                onChange={handleMessageTextChange}
                                onSend={handleSendMessage}
                                onUpdate={handleUpdateMessage}
                                onCancelReply={handleCancelReply}
                                onCancelEdit={handleCancelEdit}
                            />
                        </>
                    ) : (
                        <EmptyChatState />
                    )}
                </Box>
            </Flex>

            {/* Модальные окна */}
            <CreateChatModal
                isOpen={isCreateChatOpen}
                onClose={onCreateChatClose}
                onCreate={handleCreateChat}
            />

            <ChatSettingsModal
                isOpen={isSettingsOpen}
                onClose={onSettingsClose}
                chat={selectedChat}
                onUpdate={handleUpdateChat}
            />

            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={onAddUserClose}
                users={users}
                chatId={selectedChat?.id || null}
                currentUserId={currentUserId || ''}
                onAddUser={handleAddUser}
            />

            <DeleteChatDialog
                isOpen={isDeleteChatOpen}
                onClose={onDeleteChatClose}
                onDelete={handleDeleteChat}
            />

            <ChatMembersModal
                isOpen={isMembersOpen}
                onClose={onMembersClose}
                chatId={selectedChat?.id || null}
                currentUserId={currentUserId || ''}
                chatOwnerId={selectedChat?.ownerId || ''}
            />

            <MessageViewersModal
                isOpen={isViewersOpen}
                onClose={handleCloseViewers}
                messageId={selectedMessageForViewers}
                chatId={selectedChat?.id || null}
                currentUserId={currentUserId || ''}
            />
        </Box>
    );
}

export default ChatPage;

