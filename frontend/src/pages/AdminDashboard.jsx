// src/pages/UserDashboard.jsx
import { Box, Heading, Text } from "@chakra-ui/react";
import Navbar from "../components/Navbar";

function AdminDashboard() {
    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Admin Dashboard" />
            <Box p={5} flex="1">
                <Heading mb={4}>Admin Dashboard</Heading>
                <Text>Welcome to the admin dashboard. You have regular admin access.</Text>
            </Box>
        </Box>
    );
}

export default AdminDashboard;