import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Flex, Box, Card, CardBody, Text, HStack, Portal
} from '@chakra-ui/react';
import { EditIcon, RepeatIcon, ViewIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { Message } from '../../types/chat';
import { extractTimestampFromUUID7, formatMessageTime } from '../../utils/uuid7';

interface MessageItemProps {
    message: Message;
    isOwn: boolean;
    onEdit?: () => void;
    onReply: () => void;
    onScrollToMessage?: (messageId: string) => void;
    onViewMessage?: (messageId: string) => void;
    onShowViewers?: (messageId: string) => void;
    replyToMessage?: Message | null;
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(({
    message,
    isOwn,
    onEdit,
    onReply,
    onScrollToMessage,
    onViewMessage,
    onShowViewers,
    replyToMessage
}) => {
    const { t } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const [hasBeenViewed, setHasBeenViewed] = useState(false);

    // Извлекаем время из UUID7
    const messageTime = useMemo(() => {
        const timestamp = extractTimestampFromUUID7(message.id);
        return timestamp ? formatMessageTime(timestamp, t) : null;
    }, [message.id, t]);

    // Форматируем ФИО автора: Фамилия И.О.
    const authorName = useMemo(() => {
        if(!isOwn) {
            const firstNameInitial = message.ownerFirstName ? message.ownerFirstName.charAt(0) + '.' : '';
            const middleNameInitial = message.ownerMiddleName ? message.ownerMiddleName.charAt(0) + '.' : '';
            return `${message.ownerLastName} ${firstNameInitial}${middleNameInitial}`.trim();
        }
        else {
            return t("chat.you");
        }
    }, [message.ownerLastName, message.ownerFirstName, message.ownerMiddleName, isOwn, t]);

    // Отслеживание видимости сообщения
    useEffect(() => {
        if (!cardRef.current || isOwn || hasBeenViewed || !onViewMessage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasBeenViewed) {
                        // Сообщение стало видимым
                        setHasBeenViewed(true);
                        onViewMessage(message.id);
                    }
                });
            },
            { threshold: 0.5 } // Сообщение видимо на 50%
        );

        observer.observe(cardRef.current);

        return () => {
            observer.disconnect();
        };
    }, [message.id, isOwn, hasBeenViewed, onViewMessage]);


    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setIsMenuOpen(true);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleReply = () => {
        onReply();
        closeMenu();
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit();
            closeMenu();
        }
    };

    const handleShowViewers = () => {
        if (onShowViewers) {
            onShowViewers(message.id);
            closeMenu();
        }
    };
    return (
        <Flex justify={isOwn ? 'flex-end' : 'flex-start'} overflow="hidden">
            <Box
                maxW="70%"
                position="relative"
                overflow="hidden"
            >
                {message.repeatedMessageId && replyToMessage && (
                    <Box
                        bg={isOwn ? "blue.100" : "gray.200"}
                        p={2}
                        borderRadius="md"
                        mb={1}
                        fontSize="xs"
                        borderLeft="3px solid"
                        borderColor="blue.500"
                        cursor="pointer"
                        _hover={{ bg: isOwn ? "blue.200" : "gray.300" }}
                        onClick={() => onScrollToMessage?.(message.repeatedMessageId!)}
                    >
                        <HStack spacing={1}>
                            <RepeatIcon boxSize={3} color="blue.600" />
                            <Box flex={1} overflow="hidden">
                                <Text fontWeight="bold" fontSize="xs" color="blue.600">
                                    {t('chat.replyToMessage')}
                                </Text>
                                <Text
                                    fontStyle="italic"
                                    noOfLines={1}
                                    color="gray.700"
                                >
                                    {replyToMessage.text}
                                </Text>
                            </Box>
                        </HStack>
                    </Box>
                )}

                <Card
                    ref={cardRef}
                    bg={isOwn ? 'blue.500' : 'white'}
                    color={isOwn ? 'white' : 'black'}
                    borderRadius="lg"
                    borderTopRightRadius={isOwn ? 0 : 'lg'}
                    borderTopLeftRadius={!isOwn ? 0 : 'lg'}
                    boxShadow="sm"
                    position="relative"
                    cursor="context-menu"
                    _hover={{ transform: 'scale(1.01)' }}
                    transition="transform 0.1s"
                    onContextMenu={handleContextMenu}
                >
                    <CardBody p={3}>
                        <Text
                            fontSize="xs"
                            fontWeight="bold"
                            opacity={0.8}
                            mb={1}
                        >
                            {authorName}
                        </Text>
                        <Text whiteSpace="pre-wrap" wordBreak="break-word">
                            {message.text}
                        </Text>
                        <HStack justifyContent="space-between" mt={1} spacing={2}>
                            <Text fontSize="xs" opacity={0.7}>
                                {messageTime}
                            </Text>
                            {message.edited && (
                                <Text fontSize="xs" opacity={0.7}>
                                    ({t('chat.edited')})
                                </Text>
                            )}
                        </HStack>
                    </CardBody>
                </Card>

                {/* Контекстное меню */}
                {isMenuOpen && (
                    <>
                        <Box
                            position="fixed"
                            top="0"
                            left="0"
                            right="0"
                            bottom="0"
                            onClick={closeMenu}
                            zIndex={1000}
                        />
                        <Portal>
                            <Box
                                position="fixed"
                                top={`${menuPosition.y}px`}
                                left={`${menuPosition.x}px`}
                                bg="white"
                                boxShadow="lg"
                                borderRadius="md"
                                py={1}
                                zIndex={1001}
                                minW="150px"
                            >
                                <Box
                                    px={3}
                                    py={2}
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.100' }}
                                    onClick={handleReply}
                                >
                                    <HStack spacing={2}>
                                        <RepeatIcon />
                                        <Text>{t('chat.reply')}</Text>
                                    </HStack>
                                </Box>
                                {isOwn && onEdit && (
                                    <Box
                                        px={3}
                                        py={2}
                                        cursor="pointer"
                                        _hover={{ bg: 'gray.100' }}
                                        onClick={handleEdit}
                                    >
                                        <HStack spacing={2}>
                                            <EditIcon />
                                            <Text>{t('common.edit')}</Text>
                                        </HStack>
                                    </Box>
                                )}
                                {isOwn && onShowViewers && (
                                    <Box
                                        px={3}
                                        py={2}
                                        cursor="pointer"
                                        _hover={{ bg: 'gray.100' }}
                                        onClick={handleShowViewers}
                                    >
                                        <HStack spacing={2}>
                                            <ViewIcon />
                                            <Text>{t('chat.whoViewed')}</Text>
                                        </HStack>
                                    </Box>
                                )}
                            </Box>
                        </Portal>
                    </>
                )}
            </Box>
        </Flex>
    );
});

MessageItem.displayName = 'MessageItem';

