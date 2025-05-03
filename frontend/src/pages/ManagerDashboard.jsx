// src/pages/UserDashboard.jsx
import { Box, Heading, Text } from "@chakra-ui/react";
import Navbar from "../components/Navbar";

function ManagerDashboard() {
    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Manger Dashboard" />
            <Box p={5} flex="1">
                <Heading mb={4}>Manager Dashboard</Heading>
                <Text>Welcome to the manager dashboard. You have regular manager access.</Text>
            </Box>
        </Box>
    );
}

export default ManagerDashboard;