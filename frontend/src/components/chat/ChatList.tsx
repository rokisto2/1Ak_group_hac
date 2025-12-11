import React, { useMemo } from 'react';
import {
    Box, VStack, HStack, Heading, Spacer, IconButton,
    InputGroup, InputLeftElement, Input, Text, Center,
    Spinner, Card, CardBody, Avatar
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { Chat } from '../../types/chat';

interface ChatListProps {
    chats: Chat[];
    selectedChatId: string | null;
    searchQuery: string;
    loading?: boolean;
    onSelectChat: (chat: Chat) => void;
    onSearchChange: (query: string) => void;
    onCreateChat: () => void;
}

export const ChatList: React.FC<ChatListProps> = React.memo(({
    chats,
    selectedChatId,
    searchQuery,
    loading = false,
    onSelectChat,
    onSearchChange,
    onCreateChat
}) => {
    const { t } = useTranslation();

    const filteredChats = useMemo(() => {
        return chats.filter(chat =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [chats, searchQuery]);

    return (
        <Box
            w="350px"
            flexShrink={0}
            borderRight="1px"
            borderColor="gray.200"
            bg="gray.50"
            display="flex"
            flexDirection="column"
            overflow="hidden"
        >
            <VStack p={4} spacing={4} align="stretch" flexShrink={0}>
                <HStack>
                    <Heading size="md">{t('chat.title')}</Heading>
                    <Spacer />
                    <IconButton
                        aria-label={t('chat.createChat')}
                        icon={<AddIcon />}
                        colorScheme="blue"
                        size="sm"
                        onClick={onCreateChat}
                    />
                </HStack>

                <InputGroup>
                    <InputLeftElement pointerEvents="none">
                        <SearchIcon color="gray.300" />
                    </InputLeftElement>
                    <Input
                        placeholder={t('chat.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        bg="white"
                    />
                </InputGroup>
            </VStack>

            <Box flex={1} overflowY="auto" p={2}>
                {loading || chats.length === 0 ? (
                    <Center p={4}>
                        <Spinner />
                    </Center>
                ) : filteredChats.length === 0 ? (
                    <Text p={4} color="gray.500" textAlign="center">
                        {t('chat.noChatsAvailable')}
                    </Text>
                ) : (
                    <VStack spacing={2} align="stretch">
                        {filteredChats.map((chat) => (
                            <Card
                                key={chat.id}
                                cursor="pointer"
                                bg={selectedChatId === chat.id ? 'blue.50' : 'white'}
                                borderWidth={selectedChatId === chat.id ? '2px' : '1px'}
                                borderColor={selectedChatId === chat.id ? 'blue.500' : 'gray.200'}
                                onClick={() => onSelectChat(chat)}
                                _hover={{ bg: 'gray.100' }}
                                boxShadow="sm"
                            >
                                <CardBody p={3}>
                                    <HStack>
                                        <Avatar name={chat.title} size="sm" />
                                        <VStack align="start" spacing={0} flex={1} overflow="hidden">
                                            <Text fontWeight="bold" fontSize="sm" isTruncated w="100%">
                                                {chat.title}
                                            </Text>
                                            <Text fontSize="xs" color="gray.500" isTruncated w="100%">
                                                {chat.description || t('chat.noDescription')}
                                            </Text>
                                        </VStack>
                                        {selectedChatId === chat.id && <ChevronRightIcon color="blue.500" />}
                                    </HStack>
                                </CardBody>
                            </Card>
                        ))}
                    </VStack>
                )}
            </Box>
        </Box>
    );
});

