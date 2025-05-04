import { useState, useEffect } from "react";
import {
    Box, Heading, Text, FormControl, FormLabel,
    Input, Button, Select, Checkbox,
    Stack, useToast, Divider, VStack, HStack,
    Card, CardBody, Tabs, TabList, TabPanels, Tab, TabPanel,
    Table, Thead, Tbody, Tr, Th, Td, Badge, Link
} from "@chakra-ui/react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { getApiUrl } from "../utils/api.js";

function AdminDashboard() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);

    // Файлы для загрузки
    const [excelFile, setExcelFile] = useState(null);
    const [templateFile, setTemplateFile] = useState(null);
    const [reportName, setReportName] = useState("");

    // Определение систем доставки (хардкод, так как они фиксированы)
    const deliverySystems = [
        { id: "email", name: "Электронная почта" },
        { id: "telegram", name: "Telegram" },
        { id: "platform", name: "Платформа" }
    ];

    // Состояние для формы отправки отчета
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState({});

    // Загрузка пользователей и отчетов
    useEffect(() => {
        fetchUsers();
        fetchReports();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(getApiUrl('/users'), {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            // Добавляем логирование для отладки
            console.log('API response (users):', response.data);

            // Более гибкая обработка различных форматов данных
            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else if (response.data && response.data.items) {
                setUsers(response.data.items);
            } else if (response.data && typeof response.data === 'object') {
                // Пробуем извлечь данные из других возможных структур
                const possibleItems = Object.values(response.data).find(Array.isArray);
                setUsers(possibleItems || []);
            } else {
                setUsers([]);
                console.error('Неожиданный формат ответа API:', response.data);
            }
        } catch (error) {
            console.error("Ошибка при загрузке пользователей:", error);
            console.error("Детали ошибки:", error.response?.data);
            toast({
                title: "Ошибка",
                description: "Не удалось загрузить список пользователей",
                status: "error",
                duration: 3000,
                isClosable: true
            });
        }
    };
    const fetchReports = async () => {
        try {
            const response = await axios.get(getApiUrl('/reports/admin'), {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            console.log('API response:', response.data);

            // Проверяем формат данных и правильно устанавливаем reports
            if (Array.isArray(response.data)) {
                setReports(response.data);
            } else if (response.data && typeof response.data === 'object') {
                // Если API возвращает объект с items
                setReports(response.data.items || []);
            } else {
                setReports([]);
                console.error('Неожиданный формат ответа API:', response.data);
            }
        } catch (error) {
            console.error("Ошибка при загрузке отчетов:", error);
            toast({
                title: "Ошибка",
                description: "Не удалось загрузить список отчетов",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            // При ошибке устанавливаем пустой массив
            setReports([]);
        }
    };

    const handleExcelFileChange = (e) => {
        setExcelFile(e.target.files[0]);
    };

    const handleTemplateFileChange = (e) => {
        setTemplateFile(e.target.files[0]);
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();

        if (!excelFile || !templateFile || !reportName.trim()) {
            toast({
                title: "Ошибка",
                description: "Пожалуйста, заполните все поля",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            return;
        }

        setIsLoading(true);

        // Формируем URL с query-параметром для имени отчета
        const url = getApiUrl(`/reports?report_name=${encodeURIComponent(reportName.trim())}`);

        // Создаем FormData только для файлов
        const formData = new FormData();
        formData.append("excel_file", excelFile);
        formData.append("template_file", templateFile);

        console.log("Отправляем отчет с именем:", reportName);

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            console.log("Ответ сервера:", response.data);

            toast({
                title: "Успешно",
                description: "Отчет успешно создан",
                status: "success",
                duration: 3000,
                isClosable: true
            });

            // Очистка формы и обновление списка отчетов
            setExcelFile(null);
            setTemplateFile(null);
            setReportName("");
            document.getElementById("excel-file").value = "";
            document.getElementById("template-file").value = "";

            fetchReports();
        } catch (error) {
            console.error("Детали ошибки:", error.response?.data || error.message);
            toast({
                title: "Ошибка",
                description: `Не удалось создать отчет: ${error.response?.data?.detail || error.message}`,
                status: "error",
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsLoading(false);
        }
    };


    const formatDate = (dateString) => {
        const date = new Date(dateString);
        // Добавляем 3 часа к UTC времени
        const dateWithOffset = new Date(date.getTime() + 3 * 60 * 60 * 1000);
        return dateWithOffset.toLocaleString();
    };

    const handleReportSelection = (reportId) => {
        setSelectedReport(reportId);
        // При выборе нового отчета сбрасываем выбранных пользователей
        setSelectedUsers({});
    };

    const handleSelectAll = (deliveryMethod, isChecked) => {
        setSelectedUsers(prev => {
            const updatedUsers = { ...prev };

            users.forEach(user => {
                if (isChecked) {
                    // Добавляем метод доставки для всех пользователей
                    updatedUsers[user.id] = [
                        ...(updatedUsers[user.id] || []),
                        deliveryMethod
                    ].filter((v, i, a) => a.indexOf(v) === i); // Убираем дубликаты
                } else {
                    // Удаляем метод доставки для всех пользователей
                    if (updatedUsers[user.id]) {
                        updatedUsers[user.id] = updatedUsers[user.id].filter(method => method !== deliveryMethod);
                        if (updatedUsers[user.id].length === 0) {
                            delete updatedUsers[user.id];
                        }
                    }
                }
            });

            return updatedUsers;
        });
    };

    const handleUserDeliverySelection = (userId, deliveryMethod) => {
        setSelectedUsers(prev => {
            const userMethods = prev[userId] || [];

            if (userMethods.includes(deliveryMethod)) {
                // Удаляем метод доставки, если он уже выбран
                const updatedMethods = userMethods.filter(method => method !== deliveryMethod);
                return { ...prev, [userId]: updatedMethods };
            } else {
                // Добавляем новый метод доставки для пользователя
                return { ...prev, [userId]: [...userMethods, deliveryMethod] };
            }
        });
    };

    const handleDownload = async (objectKey) => {
        try {
            // Получаем предподписанный URL от бэкенда
            const response = await axios.get(getApiUrl('/url-generate/download'), {
                params: { object_key: objectKey },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            // Используем полученный URL для скачивания
            const downloadUrl = response.data.url;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error("Ошибка скачивания:", error);
            toast({
                title: "Ошибка скачивания",
                description: error.response?.data?.detail || "Не удалось скачать файл",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };
    const handleSendReport = async () => {
        if (!selectedReport) {
            toast({
                title: "Ошибка",
                description: "Выберите отчет для отправки",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            return;
        }

        // Преобразуем выбранных пользователей в формат API
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

        console.log("Отправляем данные:", { report_id: selectedReport, users_info: usersInfo });

        setIsLoading(true);

        try {
            await axios.post(getApiUrl('/reports/send'), {
                report_id: selectedReport,
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

            setSelectedReport(null);
            setSelectedUsers({});
        } catch (error) {
            console.error("Ошибка при отправке:", error);
            console.error("Детали ошибки:", error.response?.data);

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
            <Navbar title="Панель администратора" />
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>Панель администратора</Heading>

                <Tabs variant="enclosed" mt={6}>
                    <TabList>
                        <Tab>Создание отчета</Tab>
                        <Tab>Рассылка отчетов</Tab>
                        <Tab>История отчетов</Tab>
                    </TabList>

                    <TabPanels>
                        {/* Вкладка создания отчета */}
                        <TabPanel>
                            <Card>
                                <CardBody>
                                    <form onSubmit={handleCreateReport}>
                                        <VStack spacing={4} align="stretch">
                                            <FormControl isRequired>
                                                <FormLabel>Название отчета</FormLabel>
                                                <Input
                                                    value={reportName}
                                                    onChange={(e) => setReportName(e.target.value)}
                                                    placeholder="Введите название отчета"
                                                />
                                            </FormControl>

                                            <FormControl isRequired>
                                                <FormLabel>Excel-файл с данными</FormLabel>
                                                <Input
                                                    id="excel-file"
                                                    type="file"
                                                    accept=".xlsx,.xls,.csv"
                                                    onChange={handleExcelFileChange}
                                                />
                                            </FormControl>

                                            <FormControl isRequired>
                                                <FormLabel>Файл шаблона</FormLabel>
                                                <Input
                                                    id="template-file"
                                                    type="file"
                                                    onChange={handleTemplateFileChange}
                                                />
                                            </FormControl>

                                            <Button
                                                mt={4}
                                                colorScheme="blue"
                                                type="submit"
                                                isLoading={isLoading}
                                            >
                                                Создать отчет
                                            </Button>
                                        </VStack>
                                    </form>
                                </CardBody>
                            </Card>
                        </TabPanel>

                        {/* Вкладка рассылки отчетов */}
                        <TabPanel>
                            <Card>
                                <CardBody>
                                    <Heading size="md" mb={4}>Отправка отчета пользователям</Heading>

                                    <FormControl mb={6}>
                                        <FormLabel>Выберите отчет</FormLabel>
                                        <Select
                                            placeholder="Выберите отчет для отправки"
                                            value={selectedReport || ""}
                                            onChange={(e) => handleReportSelection(e.target.value)}
                                        >
                                            {Array.isArray(reports) && reports.map(report => (
                                                <option key={report.id} value={report.id}>
                                                    {report.report_name} ({formatDate(report.generated_at)})
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {selectedReport && (
                                        <>
                                            <Divider my={4} />

                                            <Heading size="sm" mb={4}>Выберите получателей и способы доставки</Heading>

                                            <Table variant="simple" size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Пользователь</Th>
                                                        {deliverySystems.map(system => (
                                                            <Th key={system.id}>
                                                                {system.name}
                                                                <Checkbox
                                                                    onChange={(e) => handleSelectAll(system.id, e.target.checked)}
                                                                >
                                                                </Checkbox>
                                                            </Th>
                                                        ))}
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {Array.isArray(users) && users.map(user => (
                                                        <Tr key={user.id}>
                                                            <Td>{user.full_name || user.email}</Td>
                                                            {deliverySystems.map(system => (
                                                                <Td key={system.id}>
                                                                    <Checkbox
                                                                        isChecked={
                                                                            selectedUsers[user.id] &&
                                                                            selectedUsers[user.id].includes(system.id)
                                                                        }
                                                                        onChange={() => handleUserDeliverySelection(user.id, system.id)}
                                                                    />
                                                                </Td>
                                                            ))}
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>

                                            <Button
                                                mt={6}
                                                colorScheme="green"
                                                onClick={handleSendReport}
                                                isLoading={isLoading}
                                                isDisabled={Object.keys(selectedUsers).length === 0}
                                            >
                                                Отправить отчет
                                            </Button>
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPanel>

                        {/* Вкладка истории отчетов */}
                        <TabPanel>
                            <Card>
                                <CardBody>
                                    <Heading size="md" mb={4}>История созданных отчетов</Heading>

                                    {!Array.isArray(reports) || reports.length === 0 ? (
                                        <Text>Нет созданных отчетов</Text>
                                    ) : (
                                        <Table variant="simple">
                                            <Thead>
                                                <Tr>
                                                    <Th>Название</Th>
                                                    <Th>Дата создания</Th>
                                                    <Th>Действия</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {reports.map(report => (
                                                    <Tr key={report.id}>
                                                        <Td>{report.report_name}</Td>
                                                        <Td>{formatDate(report.generated_at)}</Td>
                                                        <Td>
                                                            <Button
                                                                size="sm"
                                                                colorScheme="blue"
                                                                mr={2}
                                                                onClick={() => handleDownload(report.report_url)}
                                                            >
                                                                Скачать отчет
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                colorScheme="gray"
                                                                onClick={() => handleDownload(report.excel_url)}
                                                            >
                                                                Excel
                                                            </Button>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </Box>
    );
}

export default AdminDashboard;