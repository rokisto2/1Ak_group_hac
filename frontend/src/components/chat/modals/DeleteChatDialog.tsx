import React, { useRef, useState } from 'react';
import {
    AlertDialog, AlertDialogBody, AlertDialogFooter,
    AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
    Button
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface DeleteChatDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => Promise<void>;
}

export const DeleteChatDialog: React.FC<DeleteChatDialogProps> = ({
    isOpen,
    onClose,
    onDelete
}) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onDelete();
            onClose();
        } catch (error) {
            console.error('Ошибка удаления чата', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={cancelRef}
            onClose={onClose}
        >
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        {t('chat.deleteChatTitle')}
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        {t('chat.deleteChatConfirm')}
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button ref={cancelRef} onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            colorScheme="red"
                            onClick={handleDelete}
                            ml={3}
                            isLoading={loading}
                        >
                            {t('common.delete')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
    );
};

