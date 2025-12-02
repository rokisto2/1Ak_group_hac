// src/components/Navbar.jsx
import { Flex, Box, Heading, Spacer, Button, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

function Navbar({ title }) {
    const navigate = useNavigate();
    const toast = useToast();
    const { t } = useTranslation();

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");

        toast({
            title: t('userDashboard.logoutSuccess'),
            status: "success",
            duration: 3000,
            isClosable: true,
        });

        navigate("/login");
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
            <Box mr={3}>
                <LanguageSwitcher />
            </Box>
            <Button
                size="xs"
                variant="ghost"
                onClick={handleLogout}
            >
                {t('navbar.logout')}
            </Button>
        </Flex>
    );
}

export default Navbar;