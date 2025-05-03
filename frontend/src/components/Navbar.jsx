// src/components/Navbar.jsx
import { Flex, Box, Heading, Spacer, Button, useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

function Navbar({ title }) {
    const navigate = useNavigate();
    const toast = useToast();

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");

        toast({
            title: "Logged out successfully",
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
            <Button
                size="xs"
                variant="ghost"
                onClick={handleLogout}
            >
                Logout
            </Button>
        </Flex>
    );
}

export default Navbar;