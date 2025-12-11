import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalBody, ModalCloseButton, ModalFooter,
    Button, VStack, FormControl, FormLabel, Input, Textarea
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../../types/chat';

interface ChatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    chat: Chat | null;
    onUpdate: (chatId: string, title: string, description: string) => Promise<void>;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
    isOpen,
    onClose,
    chat,
    onUpdate
}) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (chat) {
            setTitle(chat.title);
            setDescription(chat.description || '');
        }
    }, [chat]);

    const handleUpdate = async () => {
        if (!chat || !title.trim()) return;

        setLoading(true);
        try {
            await onUpdate(chat.id, title, description);
            onClose();
        } catch (error) {
            console.error('Ошибка обновления чата', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('chat.chatSettings')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>{t('chat.chatName')}</FormLabel>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>{t('chat.description')}</FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleUpdate}
                        isLoading={loading}
                        isDisabled={!title.trim()}
                    >
                        {t('common.save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

