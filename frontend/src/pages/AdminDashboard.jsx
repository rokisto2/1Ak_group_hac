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
import { useNavigate } from "react-router-dom";


function AdminDashboard() {
    const toast = useToast();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [reportFile, setReportFile] = useState(null);

    const [reportName, setReportName] = useState("");





    useEffect(() => {
        fetchReports();
    }, []);









    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchReports = async () => {
        try {
            const response = await axios.get(getApiUrl('/reports/admin'), {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (response.data && Array.isArray(response.data.items)) {
                setReports(response.data.items);
                setTotalPages(Math.ceil(response.data.items.length / 5));
            } else if (Array.isArray(response.data)) {
                setReports(response.data);
                setTotalPages(Math.ceil(response.data.length / 5));
            } else {
                setReports([]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);

            toast({
                title: "Ошибка",
                description: "Не удалось загрузить список отчетов",
                status: "error",
                duration: 3000,
                isClosable: true
            });
            setReports([]);
        }
    };

    const getPaginatedReports = () => {
        const startIndex = (currentPage - 1) * 5;
        const endIndex = startIndex + 5;
        return reports.slice(startIndex, endIndex);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleReportFileChange = (e) => {
        setReportFile(e.target.files[0]);
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();

        if (!reportFile || !reportName.trim()) {
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

        const formData = new FormData();
        formData.append("file", reportFile);
        formData.append("report_name", reportName.trim()); // Добавляем report_name в FormData

        try {
            await axios.post(getApiUrl('/reports'), formData, { // Убираем query-параметр из URL
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            toast({
                title: "Успешно",
                description: "Отчет успешно загружен",
                status: "success",
                duration: 3000,
                isClosable: true
            });

            setReportFile(null);
            setReportName("");
            document.getElementById("report-file").value = "";

            fetchReports();
        } catch (error) {
            toast({
                title: "Ошибка",
                description: `Не удалось загрузить отчет: ${error.response?.data?.detail || error.message}`,
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
        return date.toLocaleString();
    };



    const handleDownload = async (objectKey) => {
        try {
            const response = await axios.get(getApiUrl('/url-generate/download'), {
                params: { object_key: objectKey },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const downloadUrl = response.data.url;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            toast({
                title: "Ошибка скачивания",
                description: error.response?.data?.detail || "Не удалось скачать файл",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };


    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Панель администратора" />
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>Панель администратора</Heading>

                <Tabs variant="enclosed" mt={6}>
                    <TabList>
                        <Tab>Загрузка отчета</Tab>
                        <Tab>История отчетов</Tab>
                    </TabList>

                    <Box width="800px"> {/* Фиксированная ширина для всех панелей */}
                        <TabPanels>
                            <TabPanel>
                                <Card>
                                    <CardBody>
                                        <form onSubmit={handleCreateReport} data-testid="upload-form">
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
                                                    <FormLabel>Файл отчета</FormLabel>
                                                    <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                                                        <Input
                                                            id="report-file"
                                                            type="file"
                                                            accept=".docx,.doc,.pdf"
                                                            onChange={handleReportFileChange}
                                                            display="none"
                                                            data-testid="report-file-input"
                                                        />
                                                        <Button as="label" htmlFor="report-file" colorScheme="blue" mb={2}>
                                                            Выбрать файл
                                                        </Button>
                                                        {reportFile && (
                                                            <Text mt={2} fontSize="sm" color="gray.600">
                                                                Выбранный файл: <strong>{reportFile.name}</strong>
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </FormControl>

                                                <Button
                                                    mt={4}
                                                    colorScheme="blue"
                                                    type="submit"
                                                    isLoading={isLoading}
                                                >
                                                    Загрузить отчет
                                                </Button>
                                            </VStack>
                                        </form>
                                    </CardBody>
                                </Card>
                            </TabPanel>


                            <TabPanel>
                                <Card>
                                    <CardBody>
                                        <Heading size="md" mb={4}>История созданных отчетов</Heading>

                                        {!Array.isArray(reports) || reports.length === 0 ? (
                                            <Text>Нет созданных отчетов</Text>
                                        ) : (
                                            <>
                                                <Table variant="simple">
                                                    <Thead>
                                                        <Tr>
                                                            <Th>Название</Th>
                                                            <Th>Дата создания</Th>
                                                            <Th>Действия</Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {getPaginatedReports().map(report => (
                                                            <Tr key={report.id}>
                                                                <Td>{report.report_name}</Td>
                                                                <Td>{formatDate(report.generated_at)}</Td>
                                                                <Td>
                                                                    <HStack spacing={2}>
                                                                        <Button
                                                                            size="sm"
                                                                            colorScheme="blue"
                                                                            onClick={() => handleDownload(report.report_url)}
                                                                        >
                                                                            Скачать отчет
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            colorScheme="green"
                                                                            onClick={() => navigate(`/send-report/${report.id}`)}
                                                                        >
                                                                            Отправить
                                                                        </Button>
                                                                    </HStack>
                                                                </Td>
                                                            </Tr>
                                                        ))}
                                                    </Tbody>
                                                </Table>

                                                <HStack mt={4} justifyContent="center">
                                                    <Button
                                                        onClick={handlePreviousPage}
                                                        isDisabled={currentPage === 1}
                                                    >
                                                        Назад
                                                    </Button>
                                                    <Text>Страница {currentPage} из {totalPages}</Text>
                                                    <Button
                                                        onClick={handleNextPage}
                                                        isDisabled={currentPage === totalPages}
                                                    >
                                                        Вперед
                                                    </Button>

                                                </HStack>
                                            </>
                                        )}
                                    </CardBody>
                                </Card>
                            </TabPanel>
                        </TabPanels>
                    </Box>
                </Tabs>
            </Box>
        </Box>
    );
}

export default AdminDashboard;