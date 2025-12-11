import {useState, useEffect} from "react";
import {
    Box, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
    Table, Thead, Tbody, Tr, Th, Td, Button, Input, FormControl,
    FormLabel, Select, Stack, useToast, HStack, IconButton,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
    ModalFooter, ModalCloseButton, useDisclosure, Flex, Badge,
    Tooltip
} from "@chakra-ui/react";
import {EditIcon, LockIcon, RepeatIcon, UnlockIcon} from "@chakra-ui/icons";
import Navbar from "../components/Navbar";
import {getApiUrl} from "../utils/api.js";
import {useTranslation} from "react-i18next";

function ManagerDashboard() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        per_page: 10,
        total_pages: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const { t } = useTranslation();
    const [newRole, setNewRole] = useState("");
    const {isOpen, onOpen, onClose} = useDisclosure();
    const {
        isOpen: isResetPasswordOpen,
        onOpen: onResetPasswordOpen,
        onClose: onResetPasswordClose
    } = useDisclosure();
    const [selectedUser, setSelectedUser] = useState(null);
    const [userForPasswordReset, setUserForPasswordReset] = useState(null);

    // User registration form state
    const [newUser, setNewUser] = useState({
        email: "",
        full_name: "",
        role: "user"
    });

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                getApiUrl(`/users/all?page=${pagination.page}&per_page=${pagination.per_page}`),
                {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`
                    }
                }
            );

            if (!response.ok) throw new Error(t('managerDashboard.errorFetchingUsers'));

            const data = await response.json();
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (error) {
            toast({
                title: t('managerDashboard.error'),
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load users on component mount and when pagination changes
    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.per_page]);


    const openResetPasswordModal = (user) => {
        setUserForPasswordReset(user);
        onResetPasswordOpen();
    };

    // Handle user creation
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(getApiUrl('/auth/register'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || t('managerDashboard.errorCreatingUser'));
            }

            // Reset form and refresh list
            setNewUser({email: "", full_name: "", password: "", role: "user"});
            fetchUsers();

            toast({
                title: t('managerDashboard.userCreated'),
                description: t('managerDashboard.userCreatedDescription'),
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('managerDashboard.error'),
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };


    // функцию сброса пароля
    const handleResetPassword = async () => {
        try {
            const response = await fetch(getApiUrl('/auth/password/reset'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({ user_id: userForPasswordReset.id })
            });

            if (!response.ok) throw new Error(t('managerDashboard.errorResettingPassword'));

            onResetPasswordClose();

            toast({
                title: t('managerDashboard.passwordReset'),
                description: t('managerDashboard.passwordResetDescription'),
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('managerDashboard.error'),
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    // Handle user ban/unban
    const handleToggleBanStatus = async (userId, currentBanStatus) => {
        try {
            const response = await fetch(getApiUrl(`/users/${userId}/ban-status`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    is_banned: !currentBanStatus
                })
            });

            if (!response.ok) throw new Error(t('managerDashboard.errorChangingStatus'));

            // Refresh user list
            fetchUsers();

            toast({
                title: currentBanStatus ? t('managerDashboard.userUnblocked') : t('managerDashboard.userBlocked'),
                description: currentBanStatus
                    ? t('managerDashboard.userUnblockedDescription')
                    : t('managerDashboard.userBlockedDescription'),
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('managerDashboard.error'),
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
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({role: newRole})
            });

            if (!response.ok) throw new Error(t('managerDashboard.errorChangingRole'));

            // Refresh user list and close modal
            fetchUsers();
            onClose();

            toast({
                title: t('managerDashboard.roleChanged'),
                description: t('managerDashboard.roleChangedDescription'),
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: t('managerDashboard.error'),
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title={t('managerDashboard.title')}/>
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>{t('managerDashboard.title')}</Heading>
                <Text mb={6}>{t('managerDashboard.welcome')}</Text>

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
                            {t('managerDashboard.usersList')}
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
                            {t('managerDashboard.createUser')}
                        </Tab>
                    </TabList>
                    <TabPanels>
                        {/* User List Panel */}
                        <TabPanel>
                            <Box mb={4}>
                                <HStack spacing={4} mb={4}>
                                    <FormControl maxW="250px">
                                        <FormLabel>{t("managerDashboard.usersPerPage")}</FormLabel>
                                        <Select
                                            value={pagination.per_page}
                                            onChange={(e) => setPagination({
                                                ...pagination,
                                                per_page: Number(e.target.value),
                                                page: 1
                                            })}
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
                                        <Th>{t('managerDashboard.name')}</Th>
                                        <Th>{t('managerDashboard.email')}</Th>
                                        <Th>{t('managerDashboard.role')}</Th>
                                        <Th>{t('managerDashboard.status')}</Th>
                                        <Th>{t('managerDashboard.actions')}</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {users.map((user) => (
                                        <Tr key={user.id}>
                                            <Td>{user.full_name}</Td>
                                            <Td>{user.email}</Td>
                                            <Td>
                                                <Badge
                                                    colorScheme={user.user_type === "superuser" ? "purple" : "green"}>
                                                    {user.user_type}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <Badge colorScheme={user.is_banned ? "red" : "green"}>
                                                    {user.is_banned ? t('managerDashboard.blocked') : t('managerDashboard.active')}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <Tooltip label={t("managerDashboard.tooltipChangeRole")} hasArrow>
                                                        <IconButton
                                                            aria-label={t("managerDashboard.tooltipChangeRole")}
                                                            icon={<EditIcon/>}
                                                            size="sm"
                                                            onClick={() => openRoleChangeModal(user)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip label={user.is_banned ? t("managerDashboard.tooltipUnblock") : t("managerDashboard.tooltipBlock")  } hasArrow>
                                                        <IconButton
                                                            aria-label={user.is_banned ? t("managerDashboard.tooltipUnblock")  : t("managerDashboard.tooltipBlock")}
                                                            icon={user.is_banned ? <UnlockIcon/> : <LockIcon/>}
                                                            colorScheme={user.is_banned ? "green" : "red"}
                                                            size="sm"
                                                            onClick={() => handleToggleBanStatus(user.id, user.is_banned)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip label={t('managerDashboard.tooltipResetPassword')} hasArrow>
                                                        <IconButton
                                                            aria-label={t('managerDashboard.tooltipResetPassword')}
                                                            icon={<RepeatIcon/>}
                                                            colorScheme="orange"
                                                            size="sm"
                                                            onClick={() => openResetPasswordModal(user)}
                                                        />
                                                    </Tooltip>
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>

                            {/* Pagination controls */}
                            <Flex justifyContent="space-between" mt={4}>
                                <Text>
                                    {""}
                                </Text>
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                                        isDisabled={!pagination.has_prev || isLoading}
                                    >
                                        {t('managerDashboard.previous')}
                                    </Button>
                                    <Text>
                                        {t('managerDashboard.page')} {pagination.page} {t('managerDashboard.of')} {pagination.total_pages}
                                    </Text>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                                        isDisabled={!pagination.has_next || isLoading}
                                    >
                                        {t('managerDashboard.next')}
                                    </Button>
                                </HStack>
                            </Flex>
                        </TabPanel>

                        {/* Create User Panel */}
                        <TabPanel>
                            <Box as="form" onSubmit={handleCreateUser} data-testid="create-user-form">
                                <Stack spacing={4}>
                                    <FormControl isRequired>
                                        <FormLabel>{t('managerDashboard.email')}</FormLabel>
                                        <Input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>{t('managerDashboard.fullName')}</FormLabel>
                                        <Input
                                            value={newUser.full_name}
                                            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>{t('managerDashboard.role')}</FormLabel>
                                        <Select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="user">{t('managerDashboard.user')}</option>
                                            <option value="superuser">{t('managerDashboard.superuser')}</option>
                                        </Select>
                                    </FormControl>

                                    <Button
                                        type="submit"
                                        colorScheme="blue"
                                        isLoading={isLoading}
                                    >
                                        {t('managerDashboard.createUserButton')}
                                    </Button>
                                </Stack>
                            </Box>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>

            {/* Role Change Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>{t('managerDashboard.changeUserRole')}</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        {selectedUser && (
                            <FormControl>
                                <FormLabel>{t('managerDashboard.newRole')} {selectedUser.full_name}</FormLabel>
                                <Select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="user">{t('managerDashboard.user')}</option>
                                    <option value="superuser">{t('managerDashboard.superuser')}</option>
                                </Select>
                            </FormControl>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={handleRoleChange}>
                            {t('managerDashboard.save')}
                        </Button>
                        <Button variant="ghost" onClick={onClose}>{t('managerDashboard.cancel')}</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


            {/* Модальное окно подтверждения сброса пароля */}
            <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose}>
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>{t('managerDashboard.confirmPasswordReset')}</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        {userForPasswordReset && (
                            <Text>
                                {t('managerDashboard.confirmPasswordResetText', { email: userForPasswordReset.email })}
                            </Text>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="red" mr={3} onClick={handleResetPassword}>
                            {t('managerDashboard.resetPassword')}
                        </Button>
                        <Button variant="ghost" onClick={onResetPasswordClose}>{t('managerDashboard.cancel')}</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}

export default ManagerDashboard;