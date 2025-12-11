import React from 'react';
import { HStack, VStack, Heading, Text, IconButton, Tooltip } from '@chakra-ui/react';
import { AddIcon, SettingsIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/chat';

interface ChatHeaderProps {
    chat: Chat;
    currentUserId: string;
    onAddUser: () => void;
    onSettings: () => void;
    onDelete: () => void;
    onViewMembers: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
    chat,
    currentUserId,
    onAddUser,
    onSettings,
    onDelete,
    onViewMembers
}) => {
    const { t } = useTranslation();
    const isOwner = chat.ownerId === currentUserId;

    return (
        <HStack
            p={4}
            borderBottom="1px"
            borderColor="gray.200"
            bg="white"
            justify="space-between"
            h="70px"
            flexShrink={0}
        >
            <VStack align="start" spacing={0} overflow="hidden">
                <Heading size="md" isTruncated maxW="400px">
                    {chat.title}
                </Heading>
                <Text fontSize="sm" color="gray.500" isTruncated maxW="400px">
                    {chat.description}
                </Text>
            </VStack>

            <HStack>
                {/* Кнопка просмотра участников - доступна всем */}
                <Tooltip label={t('chat.chatMembers')}>
                    <IconButton
                        aria-label="view-members"
                        icon={<ViewIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={onViewMembers}
                    />
                </Tooltip>

                {/* Кнопки управления - только для владельца */}
                {isOwner && (
                    <>
                        <Tooltip label={t('chat.addUser')}>
                            <IconButton
                                aria-label="add-user"
                                icon={<AddIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={onAddUser}
                            />
                        </Tooltip>
                        <Tooltip label={t('chat.settings')}>
                            <IconButton
                                aria-label="settings"
                                icon={<SettingsIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={onSettings}
                            />
                        </Tooltip>
                        <Tooltip label={t('chat.deleteChat')}>
                            <IconButton
                                aria-label="delete"
                                icon={<DeleteIcon />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={onDelete}
                            />
                        </Tooltip>
                    </>
                )}
            </HStack>
        </HStack>
    );
});

