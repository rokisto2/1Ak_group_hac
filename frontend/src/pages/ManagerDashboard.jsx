import { useState, useEffect } from "react";
import {
    Box, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
    Table, Thead, Tbody, Tr, Th, Td, Button, Input, FormControl,
    FormLabel, Select, Stack, useToast, HStack, IconButton,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
    ModalFooter, ModalCloseButton, useDisclosure, Flex, Badge
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import Navbar from "../components/Navbar";
import { getApiUrl } from "../utils/api.js";

function ManagerDashboard() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        per_page: 10,
        total_pages: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState(["user", "superuser"]);
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState("");

    // User registration form state
    const [newUser, setNewUser] = useState({
        email: "",
        full_name: "",
        password: "",
        role: "user"
    });

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const rolesQuery = selectedRoles.map(role => `roles=${role}`).join("&");
            const response = await fetch(
                getApiUrl(`/users/?${rolesQuery}&page=${pagination.page}&per_page=${pagination.per_page}`),
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                    }
                }
            );

            if (!response.ok) throw new Error("Failed to fetch users");

            const data = await response.json();
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load users on component mount and when pagination or filters change
    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.per_page, selectedRoles]);

    // Handle user creation
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(getApiUrl('/auth/register'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to create user");
            }

            // Reset form and refresh list
            setNewUser({ email: "", full_name: "", password: "", role: "user" });
            fetchUsers();

            toast({
                title: "User created",
                description: "New user has been successfully created",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Error creating user",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle user deletion
    const handleDeleteUser = async (userId) => {
        try {
            const response = await fetch(getApiUrl(`/users/${userId}`), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                }
            });

            if (!response.ok) throw new Error("Failed to delete user");

            // Refresh user list
            fetchUsers();

            toast({
                title: "User deleted",
                description: "User has been successfully deleted",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    // Open role change modal
    const openRoleChangeModal = (user) => {
        setSelectedUser(user);
        setNewRole(user.user_type);
        onOpen();
    };

    // Handle role change
    const handleRoleChange = async () => {
        try {
            const response = await fetch(getApiUrl(`/users/${selectedUser.id}/role`), {
                method: "PUT", // Change from PATCH to PUT to match backend
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) throw new Error("Failed to change user role");

            // Refresh user list and close modal
            fetchUsers();
            onClose();

            toast({
                title: "Role updated",
                description: `User role changed to ${newRole}`,
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Manager Dashboard" />
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>Manager Dashboard</Heading>
                <Text mb={6}>Manage users and their permissions from this dashboard.</Text>

                <Tabs isFitted variant="enclosed">
                    <TabList mb="1em">
                        <Tab
                            _selected={{
                                color: "blue.500",
                                borderColor: "blue.500",
                                borderBottom: "none",
                                fontWeight: "bold"
                            }}
                            _focus={{
                                outline: "none",
                                boxShadow: "none"
                            }}
                            mx="1px"
                            px={6}
                            py={3}
                        >
                            User List
                        </Tab>
                        <Tab
                            _selected={{
                                color: "blue.500",
                                borderColor: "blue.500",
                                borderBottom: "none",
                                fontWeight: "bold"
                            }}
                            _focus={{
                                outline: "none",
                                boxShadow: "none"
                            }}
                            mx="1px"
                            px={6}
                            py={3}
                        >
                            Create User
                        </Tab>
                    </TabList>
                    <TabPanels>
                        {/* User List Panel */}
                        <TabPanel>
                            <Box mb={4}>
                                <HStack spacing={4} mb={4}>
                                    <FormControl>
                                        <FormLabel>Filter by role:</FormLabel>
                                        <Select
                                            value={selectedRoles.join(",")}
                                            onChange={(e) => {
                                                const values = e.target.value ? e.target.value.split(",") : [];
                                                setSelectedRoles(values);
                                            }}
                                        >
                                            <option value="user,superuser">All roles</option>
                                            <option value="user">User only</option>
                                            <option value="superuser">Superuser only</option>
                                        </Select>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Users per page:</FormLabel>
                                        <Select
                                            value={pagination.per_page}
                                            onChange={(e) => setPagination({...pagination, per_page: Number(e.target.value), page: 1})}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </Select>
                                    </FormControl>
                                </HStack>
                            </Box>

                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Name</Th>
                                        <Th>Email</Th>
                                        <Th>Role</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {users.map((user) => (
                                        <Tr key={user.id}>
                                            <Td>{user.full_name}</Td>
                                            <Td>{user.email}</Td>
                                            <Td>
                                                <Badge colorScheme={user.user_type === "superuser" ? "purple" : "green"}>
                                                    {user.user_type}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <IconButton
                                                        aria-label="Change role"
                                                        icon={<EditIcon />}
                                                        size="sm"
                                                        onClick={() => openRoleChangeModal(user)}
                                                    />
                                                    <IconButton
                                                        aria-label="Delete user"
                                                        icon={<DeleteIcon />}
                                                        colorScheme="red"
                                                        size="sm"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                    />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>

                            {/* Pagination controls */}
                            <Flex justifyContent="space-between" mt={4}>
                                <Text>
                                    Showing {users.length} of {pagination.total} users
                                </Text>
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                                        isDisabled={!pagination.has_prev || isLoading}
                                    >
                                        Previous
                                    </Button>
                                    <Text>
                                        Page {pagination.page} of {pagination.total_pages}
                                    </Text>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                                        isDisabled={!pagination.has_next || isLoading}
                                    >
                                        Next
                                    </Button>
                                </HStack>
                            </Flex>
                        </TabPanel>

                        {/* Create User Panel */}
                        <TabPanel>
                            <Box as="form" onSubmit={handleCreateUser}>
                                <Stack spacing={4}>
                                    <FormControl isRequired>
                                        <FormLabel>Email</FormLabel>
                                        <Input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>Full Name</FormLabel>
                                        <Input
                                            value={newUser.full_name}
                                            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>Password</FormLabel>
                                        <Input
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>Role</FormLabel>
                                        <Select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="user">User</option>
                                            <option value="superuser">Superuser</option>
                                        </Select>
                                    </FormControl>

                                    <Button
                                        type="submit"
                                        colorScheme="blue"
                                        isLoading={isLoading}
                                    >
                                        Create User
                                    </Button>
                                </Stack>
                            </Box>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>

            {/* Role Change Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Change User Role</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {selectedUser && (
                            <FormControl>
                                <FormLabel>Role for {selectedUser.full_name}</FormLabel>
                                <Select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="user">User</option>
                                    <option value="superuser">Superuser</option>
                                </Select>
                            </FormControl>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={handleRoleChange}>
                            Save
                        </Button>
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}

export default ManagerDashboard;