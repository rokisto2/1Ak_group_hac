import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    HStack,
    Text,
    Avatar,
    Spinner,
    Center,
    Box
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types/chat';
import { MessageService } from '../../../services/messageService';

interface MessageViewersModalProps {
    isOpen: boolean;
    onClose: () => void;
    messageId: string | null;
    chatId: string | null;
    currentUserId: string;
}

export const MessageViewersModal: React.FC<MessageViewersModalProps> = ({
    isOpen,
    onClose,
    messageId,
    chatId,
    currentUserId
}) => {
    const { t } = useTranslation();
    const [viewers, setViewers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Функция для форматирования имени: Фамилия И.О.
    const formatUserName = (user: User) => {
        const firstInitial = user.firstName ? `${user.firstName.charAt(0)}.` : '';
        const middleInitial = user.middleName ? `${user.middleName.charAt(0)}.` : '';
        return `${user.lastName} ${firstInitial}${middleInitial}`.trim();
    };

    useEffect(() => {
        if (isOpen && messageId && chatId && currentUserId) {
            loadViewers();
        }
    }, [isOpen, messageId, chatId, currentUserId]);

    const loadViewers = async () => {
        if (!messageId || !chatId || !currentUserId) return;

        try {
            setLoading(true);
            const users = await MessageService.getMessageViewers(currentUserId, chatId, messageId);
            setViewers(users);
        } catch (error) {
            console.error('Ошибка загрузки просмотров:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('chat.viewed')} ({viewers.length})</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {loading ? (
                        <Center py={8}>
                            <Spinner size="lg" />
                        </Center>
                    ) : viewers.length === 0 ? (
                        <Center py={8}>
                            <Text color="gray.500">{t('chat.noViews')}</Text>
                        </Center>
                    ) : (
                        <VStack spacing={3} align="stretch">
                            {viewers.map((viewer) => (
                                <HStack
                                    key={viewer.id}
                                    p={3}
                                    borderRadius="md"
                                    bg="gray.50"
                                    _hover={{ bg: 'gray.100' }}
                                >
                                    <Avatar
                                        size="sm"
                                        name={formatUserName(viewer)}
                                    />
                                    <Box flex={1}>
                                        <Text fontWeight="medium">
                                            {formatUserName(viewer)}
                                        </Text>
                                        {viewer.email && (
                                            <Text fontSize="xs" color="gray.500">
                                                {viewer.email}
                                            </Text>
                                        )}
                                    </Box>
                                </HStack>
                            ))}
                        </VStack>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

