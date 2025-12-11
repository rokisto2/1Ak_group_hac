import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalBody, ModalCloseButton, ModalFooter,
    Button, FormControl, FormLabel, Select, Spinner, Center
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types/chat';
import { ChatService } from '../../../services/chatService';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    chatId: string | null;
    currentUserId: string;
    onAddUser: (userId: string) => Promise<void>;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
    isOpen,
    onClose,
    users,
    chatId,
    currentUserId,
    onAddUser
}) => {
    const { t } = useTranslation();
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatMembers, setChatMembers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Загружаем участников чата при открытии модального окна
    useEffect(() => {
        if (isOpen && chatId && currentUserId) {
            loadChatMembers();
        }
    }, [isOpen, chatId, currentUserId]);

    const loadChatMembers = async () => {
        if (!chatId || !currentUserId) return;

        try {
            setLoadingMembers(true);
            const members = await ChatService.getChatUsers(currentUserId, chatId);
            setChatMembers(members);
        } catch (error) {
            console.error('Ошибка загрузки участников чата:', error);
            setChatMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    };

    // Фильтруем пользователей, исключая тех, кто уже в чате
    const availableUsers = users.filter(user =>
        !chatMembers.some(member => member.id === user.id)
    );

    const handleAddUser = async () => {
        if (!selectedUserId) return;

        setLoading(true);
        try {
            await onAddUser(selectedUserId);
            setSelectedUserId('');
            onClose();
        } catch (error) {
            console.error('Ошибка добавления пользователя', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedUserId('');
        setChatMembers([]);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('chat.addUserToChat')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    {loadingMembers ? (
                        <Center py={8}>
                            <Spinner size="lg" />
                        </Center>
                    ) : (
                        <FormControl>
                            <FormLabel>{t('chat.selectUser')}</FormLabel>
                            <Select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                placeholder={availableUsers.length === 0 ? t('chat.allUsersInChat') : t('chat.selectUser')}
                                isDisabled={availableUsers.length === 0}
                            >
                                {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.lastName} {user.firstName.charAt(0)}.{user.middleName ? ` ${user.middleName.charAt(0)}.` : ''} ({user.email})
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleAddUser}
                        isLoading={loading}
                        isDisabled={!selectedUserId || loadingMembers || availableUsers.length === 0}
                    >
                        {t('chat.add')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

