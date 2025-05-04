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
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                    }
                }
            );

            if (!response.ok) throw new Error("Не удалось получить список пользователей");

            const data = await response.json();
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (error) {
            toast({
                title: "Ошибка",
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
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Не удалось создать пользователя");
            }

            // Reset form and refresh list
            setNewUser({email: "", full_name: "", password: "", role: "user"});
            fetchUsers();

            toast({
                title: "Пользователь создан",
                description: "Новый пользователь успешно создан",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Ошибка создания пользователя",
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
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({ user_id: userForPasswordReset.id })
            });

            if (!response.ok) throw new Error("Не удалось сбросить пароль");

            onResetPasswordClose();

            toast({
                title: "Пароль сброшен",
                description: "Новый пароль отправлен на почту пользователя",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Ошибка",
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
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    is_banned: !currentBanStatus
                })
            });

            if (!response.ok) throw new Error("Не удалось изменить статус пользователя");

            // Refresh user list
            fetchUsers();

            toast({
                title: currentBanStatus ? "Пользователь разблокирован" : "Пользователь заблокирован",
                description: currentBanStatus
                    ? "Пользователь успешно разблокирован"
                    : "Пользователь успешно заблокирован",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Ошибка",
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
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({role: newRole})
            });

            if (!response.ok) throw new Error("Не удалось изменить роль пользователя");

            // Refresh user list and close modal
            fetchUsers();
            onClose();

            toast({
                title: "Роль обновлена",
                description: `Роль пользователя изменена на ${newRole}`,
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (error) {
            toast({
                title: "Ошибка",
                description: error.message,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Панель менеджера"/>
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>Панель менеджера</Heading>
                <Text mb={6}>Управление пользователями и их правами доступа.</Text>

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
                            Список пользователей
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
                            Создать пользователя
                        </Tab>
                    </TabList>
                    <TabPanels>
                        {/* User List Panel */}
                        <TabPanel>
                            <Box mb={4}>
                                <HStack spacing={4} mb={4}>
                                    <FormControl maxW="250px">
                                        <FormLabel>Пользователей на странице:</FormLabel>
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
                                        <Th>Имя</Th>
                                        <Th>Email</Th>
                                        <Th>Роль</Th>
                                        <Th>Статус</Th>
                                        <Th>Действия</Th>
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
                                                <Badge
                                                    colorScheme={user.is_banned ? "red" : "green"}
                                                    minWidth="110px"
                                                    textAlign="center"
                                                    display="block"
                                                >
                                                    {user.is_banned ? "Заблокирован" : "Активен"}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <Tooltip label="Изменить роль" hasArrow>
                                                        <IconButton
                                                            aria-label="Изменить роль"
                                                            icon={<EditIcon/>}
                                                            size="sm"
                                                            onClick={() => openRoleChangeModal(user)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip label={user.is_banned ? "Разблокировать" : "Заблокировать"} hasArrow>
                                                        <IconButton
                                                            aria-label={user.is_banned ? "Разблокировать" : "Заблокировать"}
                                                            icon={user.is_banned ? <UnlockIcon/> : <LockIcon/>}
                                                            colorScheme={user.is_banned ? "green" : "red"}
                                                            size="sm"
                                                            onClick={() => handleToggleBanStatus(user.id, user.is_banned)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip label="Сбросить пароль" hasArrow>
                                                        <IconButton
                                                            aria-label="Сбросить пароль"
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
                                    Показано {users.length} из {pagination.total} пользователей
                                </Text>
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                                        isDisabled={!pagination.has_prev || isLoading}
                                    >
                                        Предыдущая
                                    </Button>
                                    <Text>
                                        Страница {pagination.page} из {pagination.total_pages}
                                    </Text>
                                    <Button
                                        size="sm"
                                        onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                                        isDisabled={!pagination.has_next || isLoading}
                                    >
                                        Следующая
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
                                        <FormLabel>Полное имя</FormLabel>
                                        <Input
                                            value={newUser.full_name}
                                            onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel>Роль</FormLabel>
                                        <Select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="user">Пользователь</option>
                                            <option value="superuser">Суперпользователь</option>
                                        </Select>
                                    </FormControl>

                                    <Button
                                        type="submit"
                                        colorScheme="blue"
                                        isLoading={isLoading}
                                    >
                                        Создать пользователя
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
                    <ModalHeader>Изменить роль пользователя</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        {selectedUser && (
                            <FormControl>
                                <FormLabel>Роль для {selectedUser.full_name}</FormLabel>
                                <Select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="user">Пользователь</option>
                                    <option value="superuser">Суперпользователь</option>
                                </Select>
                            </FormControl>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={handleRoleChange}>
                            Сохранить
                        </Button>
                        <Button variant="ghost" onClick={onClose}>Отмена</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


            {/* Модальное окно подтверждения сброса пароля */}
            <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose}>
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Подтверждение сброса пароля</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        {userForPasswordReset && (
                            <Text>
                                Вы уверены, что хотите сбросить пароль для пользователя <b>{userForPasswordReset.full_name}</b>?
                                Новый пароль будет отправлен на email: <b>{userForPasswordReset.email}</b>.
                            </Text>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="red" mr={3} onClick={handleResetPassword}>
                            Сбросить пароль
                        </Button>
                        <Button variant="ghost" onClick={onResetPasswordClose}>Отмена</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}

export default ManagerDashboard;