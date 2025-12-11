import React, { useCallback } from 'react';
import { Box, HStack, Textarea, Button, IconButton, Text } from '@chakra-ui/react';
import { EditIcon, DeleteIcon, RepeatIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types/chat';

interface MessageInputProps {
    value: string;
    replyToMessage: Message | null;
    editingMessage: Message | null;
    onChange: (value: string) => void;
    onSend: () => void;
    onUpdate: () => void;
    onCancelReply: () => void;
    onCancelEdit: () => void;
}

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export const MessageInput: React.FC<MessageInputProps> = React.memo(({
    value,
    replyToMessage,
    editingMessage,
    onChange,
    onSend,
    onUpdate,
    onCancelReply,
    onCancelEdit
}) => {
    const { t } = useTranslation();

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (editingMessage) {
                onUpdate();
            } else {
                onSend();
            }
        }
    }, [editingMessage, onUpdate, onSend]);


    return (
        <Box
            p={4}
            bg="white"
            borderTop="1px"
            borderColor="gray.200"
            flexShrink={0}
        >
            {replyToMessage && (
                <HStack
                    mb={2}
                    p={2}
                    bg="blue.50"
                    borderRadius="md"
                    justify="space-between"
                    borderLeft="3px solid"
                    borderColor="blue.500"
                >
                    <HStack>
                        <RepeatIcon color="blue.500" />
                        <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            {t('chat.replyTo')}: {replyToMessage.text}
                        </Text>
                    </HStack>
                    <IconButton
                        aria-label={t('common.cancel')}
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        onClick={onCancelReply}
                    />
                </HStack>
            )}

            {editingMessage && (
                <HStack
                    mb={2}
                    p={2}
                    bg="yellow.50"
                    borderRadius="md"
                    justify="space-between"
                    borderLeft="3px solid"
                    borderColor="yellow.500"
                >
                    <HStack>
                        <EditIcon color="yellow.600" />
                        <Text fontSize="sm" color="gray.600">
                            {t('chat.editingMessage')}
                        </Text>
                    </HStack>
                    <IconButton
                        aria-label={t('common.cancel')}
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        onClick={onCancelEdit}
                    />
                </HStack>
            )}

            <HStack align="flex-end">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={t('chat.messagePlaceholder')}
                    minH="40px"
                    maxH="120px"
                    resize="none"
                    rows={1}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    colorScheme="blue"
                    onClick={editingMessage ? onUpdate : onSend}
                    isDisabled={!value.trim()}
                    h="40px"
                    px={6}
                >
                    {editingMessage ? <EditIcon /> : <ArrowRightIcon />}
                </Button>
            </HStack>
        </Box>
    );
});

