// src/pages/UserDashboard.jsx
import {useState, useEffect} from 'react';
import {
    Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
    Flex, Button, Spinner, useToast, Badge, Divider,
    Input, InputGroup, InputRightElement, useClipboard
} from "@chakra-ui/react";
import Navbar from "../components/Navbar";
import axios from 'axios';
import {getApiUrl} from "../utils/api.js";
import { useTranslation } from "react-i18next";

function UserDashboard() {
    const [reports, setReports] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const toast = useToast();
    const { t } = useTranslation();

    const [telegramKey, setTelegramKey] = useState("");
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const {hasCopied, onCopy} = useClipboard(telegramKey);

    const [isTelegramBound, setIsTelegramBound] = useState(false);
    const [checkingTelegramStatus, setCheckingTelegramStatus] = useState(true);

    useEffect(() => {
        fetchUserReceivedReports();
    }, [currentPage]);

    useEffect(() => {
        checkTelegramBinding();
    }, []);

    const checkTelegramBinding = async () => {
        setCheckingTelegramStatus(true);
        try {
            const response = await axios.get(getApiUrl('/auth/telegram/is-bound'), {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            setIsTelegramBound(response.data.is_bound);
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.response?.data?.detail || 'Не удалось проверить статус привязки к Telegram',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCheckingTelegramStatus(false);
        }
    };

    const fetchUserReceivedReports = async () => {
        setLoading(true);
        try {
            const response = await axios.get(getApiUrl('/reports/user/received-reports'), {
                params: {page: currentPage, per_page: perPage},
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            setReports(response.data.items);
            setPagination(response.data.pagination);
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.response?.data?.detail || 'Не удалось загрузить отчеты',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (objectKey) => {
        try {
            // Шаг 1: Получаем предподписанный URL с бэкенда
            const response = await axios.get(getApiUrl('/url-generate/download'), {
                params: {object_key: objectKey},
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            // Шаг 2: Используем полученный URL для скачивания файла
            const downloadUrl = response.data.url;

            // Открываем URL скачивания в новой вкладке
            window.open(downloadUrl, '_blank');
        } catch (error) {
            toast({
                title: 'Ошибка скачивания',
                description: error.response?.data?.detail || 'Не удалось скачать отчет',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleGenerateTelegramKey = async () => {
        setIsGeneratingKey(true);
        try {
            const response = await axios.post(getApiUrl('/auth/telegram/generate'), {}, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            setTelegramKey(response.data.key);

            toast({
                title: t('userDashboard.telegramKeyGenerated'),
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: t('userDashboard.telegramKeyError'),
                description: error.response?.data?.detail || t('userDashboard.telegramKeyErrorDescription'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title="Панель пользователя"/>
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>Панель пользователя</Heading>
                <Text mb={4}>Добро пожаловать в панель пользователя. У вас есть доступ обычного пользователя.</Text>

                <Box my={4} p={3} borderWidth="1px" borderRadius="md" bg="white" boxShadow="sm">
                    <Heading size="sm" mb={2}>Интеграция с Telegram</Heading>

                    {checkingTelegramStatus ? (
                        <Flex justify="center" my={2}>
                            <Spinner size="sm" />
                        </Flex>
                    ) : (
                        <Box>
                            {isTelegramBound && (
                                <Box mb={3}>
                                    <Badge colorScheme="green" mb={2}>Аккаунт привязан к Telegram</Badge>
                                    <Text fontSize="sm">Вы получаете уведомления через Telegram</Text>
                                </Box>
                            )}

                            <Box mb={2} display="flex" flexDirection="column" alignItems="center">
                                <Button
                                    colorScheme="blue"
                                    size="sm"
                                    onClick={handleGenerateTelegramKey}
                                    isLoading={isGeneratingKey}
                                    mb={3}
                                    width="200px"
                                >
                                    {isTelegramBound ? "Пересоздать ключ" : "Сгенерировать ключ"}
                                </Button>

                                {telegramKey && (
                                    <InputGroup size="sm" width="250px">
                                        <Input
                                            value={telegramKey}
                                            isReadOnly
                                            pr="4.5rem"
                                            fontSize="sm"
                                            textAlign="center"
                                        />
                                        <InputRightElement width="4.5rem">
                                            <Button h="1.5rem" size="xs" onClick={onCopy} colorScheme="blue" variant="ghost">
                                                {hasCopied ? "Скопировано" : "Копировать"}
                                            </Button>
                                        </InputRightElement>
                                    </InputGroup>
                                )}
                            </Box>

                            {telegramKey && (
                                <Text fontSize="xs" color="gray.600" textAlign="center" mt={2}>
                                    Используйте этот ключ для подключения к Telegram боту.
                                </Text>
                            )}
                        </Box>
                    )}
                </Box>

                <Divider my={4}/>

                <Heading size="md" mb={4}>Полученные отчеты</Heading>

                {loading ? (
                    <Flex justify="center" my={8}>
                        <Spinner size="xl"/>
                    </Flex>
                ) : reports.length === 0 ? (
                    <Text>{t('userDashboard.noReports')}</Text>
                ) : (
                    <>
                        <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>{t('userDashboard.reportName')}</Th>
                                        <Th>{t('userDashboard.sentBy')}</Th>
                                        <Th>Способ доставки</Th>
                                        <Th>{t('userDashboard.receivedAt')}</Th>
                                        <Th>{t('userDashboard.actions')}</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {reports.map((report, index) => (
                                        <Tr key={index}>
                                            <Td>{report.report_name}</Td>
                                            <Td>{report.sender_name}</Td>
                                            <Td>
                                                <Badge
                                                    colorScheme={report.delivery_method === 'EMAIL' ? 'blue' : 'green'}>
                                                    {report.delivery_method}
                                                </Badge>
                                            </Td>
                                            <Td>{formatDate(report.delivered_at)}</Td>
                                            <Td>
                                                <Button
                                                    size="xs"
                                                    colorScheme="blue"
                                                    onClick={() => handleDownload(report.report_url)}
                                                >
                                                    {t('userDashboard.download')}
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>

                        <Flex justify="space-between" mt={4} align="center">
                            <Text>
                                {t('userDashboard.page')} {pagination.page || 0} {t('userDashboard.of')} {pagination.total_pages || 0} страниц
                                ({pagination.total || 0} всего отчетов)
                            </Text>
                            <Flex>
                                <Button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.has_prev}
                                    size="sm"
                                    mr={2}
                                >
                                    ← {t('userDashboard.previous')}
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={!pagination.has_next}
                                    size="sm"
                                >
                                    {t('userDashboard.next')} →
                                </Button>
                            </Flex>
                        </Flex>
                    </>
                )}
            </Box>
        </Box>
    );
}

export default UserDashboard;