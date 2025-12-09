// src/pages/NotFound.jsx
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function NotFound() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <Box textAlign="center" py={10} px={6}>
            <Heading
                display="inline-block"
                as="h2"
                size="2xl"
                bgGradient="linear(to-r, teal.400, teal.600)"
                backgroundClip="text"
            >
                404
            </Heading>
            <Text fontSize="18px" mt={3} mb={2}>
                {t('notFound.title')}
            </Text>
            <Text color="gray.500" mb={6}>
                {t('notFound.message')}
            </Text>

            <Button
                colorScheme="teal"
                bgGradient="linear(to-r, teal.400, teal.500, teal.600)"
                color="white"
                onClick={() => navigate('/')}
            >
                {t('notFound.backToLogin')}
            </Button>
        </Box>
    );
}

export default NotFound;