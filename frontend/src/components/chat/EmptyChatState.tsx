import React from 'react';
import { Center, VStack, Box, Heading, Text, Avatar } from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';

export const EmptyChatState: React.FC = () => {
    const { t } = useTranslation();

    return (
        <Center h="100%" bg="gray.50">
            <VStack spacing={4}>
                <Box p={6} bg="white" borderRadius="full" shadow="sm">
                    <Avatar size="xl" src="" icon={<SettingsIcon fontSize="3rem" />} />
                </Box>
                <Heading size="lg" color="gray.600">
                    {t('chat.selectChat')}
                </Heading>
                <Text color="gray.500">
                    {t('chat.selectChatDescription')}
                </Text>
            </VStack>
        </Center>
    );
};

