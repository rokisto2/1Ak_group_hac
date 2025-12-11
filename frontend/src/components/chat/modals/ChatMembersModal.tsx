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
    IconButton,
    Spinner,
    Center,
    Badge,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Button,
    Box
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { User } from '../../../types/chat';
import { ChatService } from '../../../services/chatService';

interface ChatMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatId: string | null;
    currentUserId: string;
    chatOwnerId: string;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
    isOpen,
    onClose,
    chatId,
    currentUserId,
    chatOwnerId
}) => {
    const { t } = useTranslation();
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [userToRemove, setUserToRemove] = useState<User | null>(null);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const toast = useToast();

    const isOwner = currentUserId === chatOwnerId;

    // Функция для форматирования имени: Фамилия И.О.
    const formatUserName = (user: User) => {
        const firstInitial = user.firstName ? `${user.firstName.charAt(0)}.` : '';
        const middleInitial = user.middleName ? `${user.middleName.charAt(0)}.` : '';
        return `${user.lastName} ${firstInitial}${middleInitial}`.trim();
    };

    useEffect(() => {
        if (isOpen && chatId && currentUserId) {
            loadMembers();
        }
    }, [isOpen, chatId, currentUserId]);

    const loadMembers = async () => {
        if (!chatId || !currentUserId) return;

        try {
            setLoading(true);
            const users = await ChatService.getChatUsers(currentUserId, chatId);
            setMembers(users);
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('chat.errorLoadingMembers'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveClick = (user: User) => {
        setUserToRemove(user);
        setIsAlertOpen(true);
    };

    const handleRemoveConfirm = async () => {
        if (!userToRemove || !chatId || !currentUserId) return;

        try {
            setRemovingUserId(userToRemove.id);
            await ChatService.removeUserFromChat(currentUserId, chatId, userToRemove.id);

            // Обновляем список участников
            setMembers(prev => prev.filter(m => m.id !== userToRemove.id));

            toast({
                title: t('common.success'),
                description: `${formatUserName(userToRemove)} ${t('chat.userRemoved')}`,
                status: 'success',
                duration: 2000,
                isClosable: true
            });
        } catch (error: any) {
            toast({
                title: t('common.error'),
                description: error.response?.data?.message || t('chat.errorRemovingMember'),
                status: 'error',
                duration: 3000,
                isClosable: true
            });
        } finally {
            setRemovingUserId(null);
            setIsAlertOpen(false);
            setUserToRemove(null);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('chat.membersCount')} ({members.length})</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {loading ? (
                            <Center py={8}>
                                <Spinner size="lg" />
                            </Center>
                        ) : members.length === 0 ? (
                            <Center py={8}>
                                <Text color="gray.500">{t('chat.noMembers')}</Text>
                            </Center>
                        ) : (
                            <VStack spacing={3} align="stretch">
                                {members.map((member) => {
                                    const isMemberOwner = member.id === chatOwnerId;
                                    const isCurrentUser = member.id === currentUserId;
                                    const canRemove = isOwner && !isMemberOwner && !isCurrentUser;

                                    return (
                                        <HStack
                                            key={member.id}
                                            p={3}
                                            borderRadius="md"
                                            bg="gray.50"
                                            justify="space-between"
                                            _hover={{ bg: 'gray.100' }}
                                        >
                                            <HStack spacing={3} flex={1}>
                                                <Avatar
                                                    size="sm"
                                                    name={formatUserName(member)}
                                                />
                                                <Box flex={1}>
                                                    <HStack spacing={2}>
                                                        <Text fontWeight="medium">
                                                            {formatUserName(member)}
                                                        </Text>
                                                        {isMemberOwner && (
                                                            <Badge colorScheme="blue" fontSize="xs">
                                                                {t('chat.chatOwner')}
                                                            </Badge>
                                                        )}
                                                        {isCurrentUser && (
                                                            <Badge colorScheme="green" fontSize="xs">
                                                                {t('chat.you')}
                                                            </Badge>
                                                        )}
                                                    </HStack>
                                                    {member.email && (
                                                        <Text fontSize="xs" color="gray.500">
                                                            {member.email}
                                                        </Text>
                                                    )}
                                                </Box>
                                            </HStack>
                                            {canRemove && (
                                                <IconButton
                                                    aria-label={t('common.delete')}
                                                    icon={<DeleteIcon />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveClick(member)}
                                                    isLoading={removingUserId === member.id}
                                                />
                                            )}
                                        </HStack>
                                    );
                                })}
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Диалог подтверждения удаления */}
            <AlertDialog
                isOpen={isAlertOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsAlertOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            {t('chat.removeMember')}
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            {t('chat.removeMemberConfirm')}{' '}
                            <strong>
                                {userToRemove ? formatUserName(userToRemove) : ''}
                            </strong>?
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsAlertOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={handleRemoveConfirm}
                                ml={3}
                                isLoading={removingUserId !== null}
                            >
                                {t('common.delete')}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </>
    );
};

