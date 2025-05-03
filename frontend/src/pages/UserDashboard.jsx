// src/pages/UserDashboard.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
    Link, Flex, Button, Spinner, useToast, Badge, Divider,
    Input, InputGroup, InputRightElement, useClipboard
} from "@chakra-ui/react";
import Navbar from "../components/Navbar";
import axios from 'axios';
import {getApiUrl} from "../utils/api.js";

function UserDashboard() {
    const [reports, setReports] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const toast = useToast();

    const [telegramKey, setTelegramKey] = useState("");
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const { hasCopied, onCopy } = useClipboard(telegramKey);

    useEffect(() => {
        fetchUserReceivedReports();
    }, [currentPage]);



    const fetchUserReceivedReports = async () => {
        setLoading(true);
        try {
            const response = await axios.get(getApiUrl('/reports/user/received-reports'), {
                params: { page: currentPage, per_page: perPage },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            setReports(response.data.items);
            setPagination(response.data.pagination);
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.detail || 'Failed to load reports',
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
            // Step 1: Get the presigned URL from backend
            const response = await axios.get(getApiUrl('/url-generate/download'), {
                params: { object_key: objectKey },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            // Step 2: Use the returned URL to download the file
            const downloadUrl = response.data.url;

            // Open the download URL in a new tab or trigger download
            window.open(downloadUrl, '_blank');
        } catch (error) {
            toast({
                title: 'Download Failed',
                description: error.response?.data?.detail || 'Failed to download the report',
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
                title: 'Ключ Telegram успешно сгенерирован',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Ошибка генерации ключа',
                description: error.response?.data?.detail || 'Не удалось сгенерировать ключ Telegram',
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
            <Navbar title="User Dashboard" />
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>User Dashboard</Heading>
                <Text mb={4}>Welcome to the user dashboard. You have regular user access.</Text>

                <Box my={4} p={3} borderWidth="1px" borderRadius="md" bg="white" boxShadow="sm">
                    <Heading size="sm" mb={2}>Telegram Integration</Heading>
                    <Text fontSize="sm" mb={3}>Connect your Telegram account using a one-time key.</Text>

                    <Flex direction="column" align="center" mb={2}>
                        <Button
                            colorScheme="gray"
                            size="sm"
                            onClick={handleGenerateTelegramKey}
                            isLoading={isGeneratingKey}
                            mb={3}
                            width="200px"
                        >
                            Generate Key
                        </Button>

                        {telegramKey && (
                            <InputGroup size="sm" width="200px">
                                <Input
                                    value={telegramKey}
                                    isReadOnly
                                    pr="4rem"
                                    fontSize="sm"
                                    textAlign="center"
                                />
                                <InputRightElement width="4rem">
                                    <Button h="1.5rem" size="xs" onClick={onCopy} colorScheme="blue" variant="ghost">
                                        {hasCopied ? "Copied" : "Copy"}
                                    </Button>
                                </InputRightElement>
                            </InputGroup>
                        )}
                    </Flex>

                    {telegramKey && (
                        <Text fontSize="xs" color="gray.600" textAlign="center" mt={2}>
                            Use this key to connect with Telegram bot. Valid for one-time use only.
                        </Text>
                    )}
                </Box>

                <Divider my={4} />

                <Heading size="md" mb={4}>Your Received Reports</Heading>

                {loading ? (
                    <Flex justify="center" my={8}>
                        <Spinner size="xl" />
                    </Flex>
                ) : reports.length === 0 ? (
                    <Text>No reports received yet.</Text>
                ) : (
                    <>
                        <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Report Name</Th>
                                        <Th>Sender</Th>
                                        <Th>Delivery Method</Th>
                                        <Th>Received At</Th>
                                        <Th>Action</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {reports.map((report, index) => (
                                        <Tr key={index}>
                                            <Td>{report.report_name}</Td>
                                            <Td>{report.sender_name}</Td>
                                            <Td>
                                                <Badge colorScheme={report.delivery_method === 'EMAIL' ? 'blue' : 'green'}>
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
                                                    Download
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>

                        <Flex justify="space-between" mt={4} align="center">
                            <Text>
                                Page {pagination.page || 0} of {pagination.total_pages || 0} pages
                                ({pagination.total || 0} total reports)
                            </Text>
                            <Flex>
                                <Button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.has_prev}
                                    size="sm"
                                    mr={2}
                                >
                                    ← Previous
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={!pagination.has_next}
                                    size="sm"
                                >
                                    Next →
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