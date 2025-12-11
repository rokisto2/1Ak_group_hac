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
import {useTranslation} from "react-i18next";

function AdminDashboard() {
    const toast = useToast();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [reportFile, setReportFile] = useState(null);
    const { t } = useTranslation();
    const [reportName, setReportName] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await axios.get(getApiUrl('/reports/admin'), {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
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
            console.error("Error fetching reports:", error);

            toast({
                title: t('adminDashboard.error'),
                description: t('adminDashboard.errorLoadingReports'),
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
                title: t('adminDashboard.error'),
                description: t('adminDashboard.fillAllFields'),
                status: "error",
                duration: 3000,
                isClosable: true
            });
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append("file", reportFile);
        formData.append("report_name", reportName.trim());

        try {
            await axios.post(getApiUrl('/reports'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
                }
            });

            toast({
                title: t('adminDashboard.success'),
                description: t('adminDashboard.reportUploaded'),
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
                title: t('adminDashboard.error'),
                description: `${t('adminDashboard.errorUploadingReport')}: ${error.response?.data?.detail || error.message}`,
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
                    Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
                }
            });

            const downloadUrl = response.data.url;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            toast({
                title: t('adminDashboard.downloadError'),
                description: error.response?.data?.detail || t('adminDashboard.downloadErrorDescription'),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    return (
        <Box width="100%" height="100vh" display="flex" flexDirection="column">
            <Navbar title={t('adminDashboard.title')} />
            <Box p={5} flex="1" overflowY="auto">
                <Heading mb={4}>{t('adminDashboard.title')}</Heading>

                <Tabs variant="enclosed" mt={6}>
                    <TabList>
                        <Tab>{t('adminDashboard.uploadReportTab')}</Tab>
                        <Tab>{t('adminDashboard.reportsHistoryTab')}</Tab>
                    </TabList>

                    <Box width="800px">
                        <TabPanels>
                            <TabPanel>
                                <Card>
                                    <CardBody>
                                        <form onSubmit={handleCreateReport} data-testid="upload-form">
                                            <VStack spacing={4} align="stretch">
                                                <FormControl isRequired>
                                                    <FormLabel>{t('adminDashboard.reportName')}</FormLabel>
                                                    <Input
                                                        value={reportName}
                                                        onChange={(e) => setReportName(e.target.value)}
                                                        placeholder={t('adminDashboard.reportName')}
                                                    />
                                                </FormControl>

                                                <FormControl isRequired>
                                                    <FormLabel>{t('adminDashboard.uploadFile')}</FormLabel>
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
                                                            {t('adminDashboard.uploadFile')}
                                                        </Button>
                                                        {reportFile && (
                                                            <Text mt={2} fontSize="sm" color="gray.600">
                                                                {reportFile.name}
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
                                                    {t('adminDashboard.createReportButton')}
                                                </Button>
                                            </VStack>
                                        </form>
                                    </CardBody>
                                </Card>
                            </TabPanel>

                            <TabPanel>
                                <Card>
                                    <CardBody>
                                        <Heading size="md" mb={4}>{t('adminDashboard.reportsList')}</Heading>

                                        {!Array.isArray(reports) || reports.length === 0 ? (
                                            <Text>{t('adminDashboard.noReports')}</Text>
                                        ) : (
                                            <>
                                                <Table variant="simple">
                                                    <Thead>
                                                        <Tr>
                                                            <Th>{t('adminDashboard.reportName')}</Th>
                                                            <Th>{t('adminDashboard.createdAt')}</Th>
                                                            <Th>{t('adminDashboard.actions')}</Th>
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
                                                                            {t('userDashboard.download')}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            colorScheme="green"
                                                                            onClick={() => navigate(`/send-report/${report.id}`)}
                                                                        >
                                                                            {t('adminDashboard.sendReport')}
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
                                                        {t('adminDashboard.previous')}
                                                    </Button>
                                                    <Text>{t('adminDashboard.page')} {currentPage} {t('adminDashboard.of')} {totalPages}</Text>
                                                    <Button
                                                        onClick={handleNextPage}
                                                        isDisabled={currentPage === totalPages}
                                                    >
                                                        {t('adminDashboard.next')}
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
