// frontend/tests/pages/AdminDashboard.test.jsx
// Brief description:
// Tests the AdminDashboard page: upload reports, report history, pagination, downloads, and error handling.
// Mocks API calls and Chakra UI hooks to focus on component behavior. Uses i18n for localized text.

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../src/pages/AdminDashboard'; // Adjust path
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import axios from 'axios';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

// --- Mocks ---
vi.mock('../../src/utils/api', () => ({
    getApiUrl: vi.fn((endpoint) => `/mock-api${endpoint}`),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockToast = vi.fn();
vi.mock('@chakra-ui/react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useToast: () => mockToast,
    };
});

vi.mock('../../src/components/Navbar', () => ({
    default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));

vi.mock('axios');

const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });




describe('AdminDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorageMock.clear();
        sessionStorageMock.setItem('accessToken', 'fake_access_token');
    });

    const renderAdminDashboard = () =>
        render(
            <MemoryRouter>
                <ChakraProvider>
                    <I18nextProvider i18n={i18n}>
                        <AdminDashboard />
                    </I18nextProvider>
                </ChakraProvider>
            </MemoryRouter>
        );

    // --- Initial Render ---
    it('renders main dashboard elements and default tab', async () => {
        axios.get.mockResolvedValue({ data: { items: [] } }); // Mock initial fetch
        renderAdminDashboard();

        expect(screen.getByTestId('navbar')).toHaveTextContent(i18n.t('adminDashboard.title'));
        expect(screen.getByRole('heading', { name: i18n.t('adminDashboard.title') })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: i18n.t('adminDashboard.uploadReportTab') })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: i18n.t('adminDashboard.uploadReportTab') })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByPlaceholderText(i18n.t('adminDashboard.reportName'))).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/mock-api/reports/admin', expect.any(Object));
        });
    });

    it('handles fetchReports error', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'));
        renderAdminDashboard();

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('adminDashboard.errorLoadingReports'),
                })
            );
        });
    });

    // --- Report Upload Tab ---
    it('shows validation errors for empty fields on upload attempt', async () => {
        axios.get.mockResolvedValue({ data: { items: [] } }); // Mock initial fetch
        renderAdminDashboard();

        await act(async () => {
            fireEvent.submit(screen.getByTestId('upload-form'));
        });

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('adminDashboard.fillAllFields'),
                })
            );
        });
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('handles successful report upload', async () => {
        axios.post.mockResolvedValueOnce({ status: 200 });
        axios.get.mockResolvedValue({ data: { items: [] } });

        renderAdminDashboard();

        const reportNameInput = screen.getByPlaceholderText(i18n.t('adminDashboard.reportName'));
        const fileInput = screen.getByTestId('report-file-input');

        fireEvent.change(reportNameInput, { target: { value: 'Test Report Name' } });
        const testFile = new File(['report content'], 'test-report.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        fireEvent.change(fileInput, { target: { files: [testFile] } });

        fireEvent.submit(screen.getByTestId('upload-form'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                '/mock-api/reports',
                expect.any(FormData),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer fake_access_token',
                    }),
                })
            );
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'success',
                    description: i18n.t('adminDashboard.reportUploaded'),
                })
            );
            expect(reportNameInput).toHaveValue('');
        });
    });

    it('handles handleCreateReport error', async () => {
        axios.post.mockRejectedValue({ response: { data: { detail: 'Upload failed' } } });
        renderAdminDashboard();

        const reportNameInput = screen.getByPlaceholderText(i18n.t('adminDashboard.reportName'));
        const fileInput = screen.getByTestId('report-file-input');

        fireEvent.change(reportNameInput, { target: { value: 'Test Report Name' } });
        const testFile = new File(['report content'], 'test-report.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        fireEvent.change(fileInput, { target: { files: [testFile] } });

        fireEvent.submit(screen.getByTestId('upload-form'));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: expect.stringContaining('Upload failed'),
                })
            );
        });
    });

    // --- Report History Tab ---
    it('switches to report history tab and displays reports', async () => {
        const mockReports = {
            items: [
                { id: 1, report_name: 'Hist Report 1', generated_at: '2023-01-01T10:00:00Z', report_url: 'hist_key1' },
            ],
        };
        axios.get.mockResolvedValueOnce({ data: mockReports });

        renderAdminDashboard();
        
        await waitFor(() => { // Wait for initial fetch to complete
          expect(axios.get).toHaveBeenCalledTimes(1);
        });

        fireEvent.click(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') }));

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') })).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByText('Hist Report 1')).toBeInTheDocument();
            expect(screen.getByText(/01.01.2023/)).toBeInTheDocument();
        });
    });

    it('shows "Нет созданных отчетов" when no reports are found', async () => {
        axios.get.mockResolvedValueOnce({ data: { items: [] } });

        renderAdminDashboard();

        fireEvent.click(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') }));

        await waitFor(() => {
            expect(screen.getByText(i18n.t('adminDashboard.noReports'))).toBeInTheDocument();
        });
    });

    it('handles pagination', async () => {
        const mockReports = Array.from({ length: 7 }, (_, i) => ({ 
            id: i + 1, 
            report_name: `Report ${i + 1}`,
            generated_at: '2023-01-01T10:00:00Z',
            report_url: `key${i + 1}`
        }));
        axios.get.mockResolvedValueOnce({ data: { items: mockReports } });

        renderAdminDashboard();
        
        // Wait for initial data to load
        await waitFor(() => {
           expect(axios.get).toHaveBeenCalledTimes(1);
        });

        fireEvent.click(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') }));

        // On first page, after tab click
        await waitFor(() => {
            expect(screen.getByText('Report 1')).toBeInTheDocument();
            expect(screen.queryByText('Report 6')).not.toBeInTheDocument();
        });

        const nextButton = screen.getByRole('button', { name: i18n.t('adminDashboard.next') });
        fireEvent.click(nextButton);

        // On second page
        await waitFor(() => {
            expect(screen.getByText(new RegExp(`${i18n.t('adminDashboard.page')} 2 ${i18n.t('adminDashboard.of')} 2`))).toBeInTheDocument();
            expect(screen.queryByText('Report 1')).not.toBeInTheDocument();
            expect(screen.getByText('Report 6')).toBeInTheDocument();
        });

        const prevButton = screen.getByRole('button', { name: i18n.t('adminDashboard.previous') });
        fireEvent.click(prevButton);

        // Back on first page
        await waitFor(() => {
            expect(screen.getByText(new RegExp(`${i18n.t('adminDashboard.page')} 1 ${i18n.t('adminDashboard.of')} 2`))).toBeInTheDocument();
            expect(screen.getByText('Report 1')).toBeInTheDocument();
            expect(screen.queryByText('Report 6')).not.toBeInTheDocument();
        });
    });

    it('handles successful download', async () => {
        const mockReports = {
            items: [
                { id: 1, report_name: 'Downloadable Report', generated_at: '2023-01-01T10:00:00Z', report_url: 'download_key' },
            ],
        };
        axios.get.mockResolvedValueOnce({ data: mockReports });
        axios.get.mockResolvedValueOnce({ data: { url: 'http://download-url.com' } });
        window.open = vi.fn();

        renderAdminDashboard();

        fireEvent.click(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') }));

        await waitFor(() => {
            expect(screen.getByText('Downloadable Report')).toBeInTheDocument();
        });

        const downloadButton = screen.getByRole('button', { name: 'Скачать' });
        fireEvent.click(downloadButton);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/mock-api/url-generate/download', {
                params: { object_key: 'download_key' },
                headers: { Authorization: 'Bearer fake_access_token' },
            });
            expect(window.open).toHaveBeenCalledWith('http://download-url.com', '_blank');
        });
    });

    it('handles download error', async () => {
        const mockReports = {
            items: [
                { id: 1, report_name: 'Downloadable Report', generated_at: '2023-01-01T10:00:00Z', report_url: 'download_key' },
            ],
        };
        axios.get.mockResolvedValueOnce({ data: mockReports });
        axios.get.mockRejectedValueOnce({ response: { data: { detail: 'Download failed' } } });

        renderAdminDashboard();

        fireEvent.click(screen.getByRole('tab', { name: i18n.t('adminDashboard.reportsHistoryTab') }));

        await waitFor(() => {
            expect(screen.getByText('Downloadable Report')).toBeInTheDocument();
        });

        const downloadButton = screen.getByRole('button', { name: 'Скачать' });
        fireEvent.click(downloadButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: 'Download failed',
                })
            );
        });
    });
});
