// src/components/Navbar.jsx
import { Flex, Box, Heading, Spacer, Button, useToast, HStack } from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { ChatIcon, ArrowBackIcon } from "@chakra-ui/icons";

function Navbar({ title }) {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const { t } = useTranslation();

    const isOnChatPage = location.pathname === '/chat';

    const handleLogout = () => {
        sessionStorage.removeItem("accessToken");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("userId");

        toast({
            title: t('userDashboard.logoutSuccess'),
            status: "success",
            duration: 3000,
            isClosable: true,
        });

        navigate("/login");
    };

    const handleChatNavigation = () => {
        if (isOnChatPage) {
            // Возвращаемся на предыдущую страницу
            navigate(-1);
        } else {
            // Переходим на страницу чата
            navigate('/chat');
        }
    };

    return (
        <Flex
            width="100%"
            alignItems="center"
            py={2}
            px={4}
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.200"
        >
            <Box>
                <Heading size="sm">{title}</Heading>
            </Box>
            <Spacer />
            <HStack spacing={2}>
                <Button
                    size="sm"
                    leftIcon={isOnChatPage ? <ArrowBackIcon /> : <ChatIcon />}
                    colorScheme={isOnChatPage ? "gray" : "blue"}
                    variant={isOnChatPage ? "outline" : "solid"}
                    onClick={handleChatNavigation}
                >
                    {isOnChatPage ? t('navbar.back') || 'Назад' : t('navbar.chat') || 'Чат'}
                </Button>
                <Box>
                    <LanguageSwitcher />
                </Box>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleLogout}
                >
                    {t('navbar.logout')}
                </Button>
            </HStack>
        </Flex>
    );
}

export default Navbar;