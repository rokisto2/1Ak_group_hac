import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box, Heading, Text, Button, Checkbox,
    Stack, useToast, VStack, HStack,
    Card, CardBody, Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { getApiUrl } from "../utils/api.js";

function SendReport() {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState({});

    const deliverySystems = [
        { id: "email", name: "Электронная почта" },
        { id: "telegram", name: "Telegram" },
        { id: "platform", name: "Платформа" }
    ];

    const [userCurrentPage, setUserCurrentPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [usersPerPage] = useState(10);

    useEffect(() => {
        fetchUsers();
        fetchReportDetails();
    }, []);


    const CheckboxWithSync = ({ userId, deliveryMethod, selectedUsers, onChange }) => {
        const isChecked =
            selectedUsers[userId] &&
            selectedUsers[userId].includes(deliveryMethod);

        const handleChange = (e) => {
            onChange(userId, deliveryMethod, e.target.checked);
        };

        return <Checkbox isChecked={isChecked} onChange={handleChange} />;
    };

    const fetchReportDetails = async () => {
        try {
            // Логируем ID отчета для диагностики
            console.log("Загрузка отчета с ID:", reportId);


        } catch (error) {
            console.error("Ошибка при загрузке отчета:", error);

            // Показываем более детальную ошибку
            toast({
                title: "Ошибка",
                description: `Не удалось загрузить данные отчета: ${error.response?.data?.detail || error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };

    const fetchUsers = async (page = userCurrentPage) => {
        try {
            const response = await axios.get(getApiUrl('/users'), {
                params: {
                    page: page,
                    per_page: usersPerPage
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (response.data && response.data.users && Array.isArray(response.data.users)) {
                setUsers(response.data.users);
                setUserTotalPages(response.data.pagination.total_pages);
            } else if (Array.isArray(response.data)) {
                setUsers(response.data);
                setUserTotalPages(Math.ceil(response.data.length / usersPerPage));
            } else {
                setUserTotalPages(1);
                setUsers([]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);

            toast({
                title: "Ошибка",
                description: "Не удалось загрузить список пользователей",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            setUsers([]);
            setUserTotalPages(1);
        }
    };

    const handlePreviousUserPage = () => {
        if (userCurrentPage > 1) {
            setUserCurrentPage(prev => prev - 1);
        }
    };

    const handleNextUserPage = () => {
        if (userCurrentPage < userTotalPages) {
            setUserCurrentPage(prev => prev + 1);
        }
    };

    const [selectAllState, setSelectAllState] = useState({});

    useEffect(() => {
        const updatedSelectAllState = {};
        deliverySystems.forEach((system) => {
            updatedSelectAllState[system.id] = users.every(
                (user) =>
                    selectedUsers[user.id] &&
                    selectedUsers[user.id].includes(system.id)
            );
        });
        setSelectAllState(updatedSelectAllState);
    }, [selectedUsers, users]);

    const handleSelectAll = (deliveryMethod, isChecked) => {
        setSelectedUsers((prev) => {
            const updatedUsers = { ...prev };

            users.forEach((user) => {
                if (isChecked) {
                    updatedUsers[user.id] = [
                        ...(updatedUsers[user.id] || []),
                        deliveryMethod,
                    ].filter((v, i, a) => a.indexOf(v) === i);
                } else {
                    if (updatedUsers[user.id]) {
                        updatedUsers[user.id] = updatedUsers[user.id].filter(
                            (method) => method !== deliveryMethod
                        );
                        if (updatedUsers[user.id].length === 0) {
                            delete updatedUsers[user.id];
                        }
                    }
                }
            });

            return updatedUsers;
        });
    };

    const handleUserDeliverySelection = (userId, deliveryMethod, isChecked) => {
        setSelectedUsers((prev) => {
            const updatedUsers = { ...prev };
            const userMethods = updatedUsers[userId] || [];

            if (isChecked) {
                // Добавляем метод доставки
                updatedUsers[userId] = [...userMethods, deliveryMethod];
            } else {
                // Удаляем метод доставки
                updatedUsers[userId] = userMethods.filter((method) => method !== deliveryMethod);
                if (updatedUsers[userId].length === 0) {
                    delete updatedUsers[userId];
                }
            }

            return updatedUsers;
        });
    };

    useEffect(() => {
        console.log("Обновлено состояние selectedUsers:", selectedUsers);
    }, [selectedUsers]);

    const handleSendReport = async () => {
        const usersInfo = Object.entries(selectedUsers).map(([userId, methods]) => {
            return [userId, methods];
        });

        if (usersInfo.length === 0) {
            toast({
                title: "Ошибка",
                description: "Выберите получателей и способы доставки",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            return;
        }

        setIsLoading(true);

        try {
            await axios.post(getApiUrl('/reports/send'), {
                report_id: reportId,
                users_info: usersInfo
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            toast({
                title: "Успешно",
                description: "Отчет успешно отправлен",
                status: "success",
                duration: 3000,
                isClosable: true
            });

            navigate('/admin-dashboard');
        } catch (error) {
            toast({
                title: "Ошибка",
                description: error.response?.data?.detail || "Не удалось отправить отчет",
                status: "error",
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Отправка отчета" />
            <Box p={5} flex="1" overflowY="auto">
                <HStack mb={4} spacing={4}>
                    <Button variant="outline" onClick={() => navigate('/admin-dashboard')}>
                        ← Назад
                    </Button>
                    <Heading>Отправка отчета</Heading>
                </HStack>



                <Card>
                    <CardBody>
                        <Heading size="md" mb={4}>Выберите получателей и способы доставки</Heading>

                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Пользователь</Th>
                                    {deliverySystems.map((system) => (
                                        <Th key={system.id}>
                                            {system.name}
                                            <Checkbox
                                                ml={2}
                                                isChecked={selectAllState[system.id] || false}
                                                onChange={(e) =>
                                                    handleSelectAll(system.id, e.target.checked)
                                                }
                                            />
                                        </Th>
                                    ))}
                                </Tr>
                            </Thead>
                            <Tbody>
                                {Array.isArray(users) &&
                                    users.map((user) => (
                                        <Tr key={user.id}>
                                            <Td>{user.full_name || user.email}</Td>
                                            {deliverySystems.map((system) => (
                                                <Td key={system.id}>
                                                    <CheckboxWithSync
                                                        userId={user.id}
                                                        deliveryMethod={system.id}
                                                        selectedUsers={selectedUsers}
                                                        onChange={handleUserDeliverySelection}
                                                    />
                                                </Td>
                                            ))}
                                        </Tr>
                                    ))}
                            </Tbody>
                        </Table>

                        <HStack mt={4} justifyContent="center">
                            <Button
                                onClick={handlePreviousUserPage}
                                isDisabled={userCurrentPage === 1}
                                size="sm"
                            >
                                Назад
                            </Button>
                            <Text>Страница {userCurrentPage} из {userTotalPages}</Text>
                            <Button
                                onClick={handleNextUserPage}
                                isDisabled={userCurrentPage === userTotalPages}
                                size="sm"
                            >
                                Вперед
                            </Button>
                        </HStack>

                        <Button
                            mt={6}
                            colorScheme="green"
                            onClick={handleSendReport}
                            isLoading={isLoading}
                            isDisabled={Object.keys(selectedUsers).length === 0}
                        >
                            Отправить отчет
                        </Button>
                    </CardBody>
                </Card>
            </Box>
        </Box>
    );
}

export default SendReport;