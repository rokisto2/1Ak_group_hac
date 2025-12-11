import React, { useState } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalBody, ModalCloseButton, ModalFooter,
    Button, VStack, FormControl, FormLabel, Input, Textarea
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface CreateChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, description: string) => Promise<void>;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
    isOpen,
    onClose,
    onCreate
}) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) return;

        setLoading(true);
        try {
            await onCreate(title, description);
            setTitle('');
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Ошибка создания чата', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('chat.createNewChat')}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl isRequired>
                            <FormLabel>{t('chat.chatName')}</FormLabel>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('chat.enterName')}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>{t('chat.description')}</FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('chat.enterDescription')}
                            />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleCreate}
                        isLoading={loading}
                        isDisabled={!title.trim()}
                    >
                        {t('chat.create')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

