// frontend/tests/pages/UserDashboard.test.jsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UserDashboard from '../../src/pages/UserDashboard'; // Adjust path
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import axios from 'axios';

// --- Mocks ---
// Mock getApiUrl
vi.mock('../../src/utils/api', () => ({
    getApiUrl: vi.fn((endpoint) => `/mock-api${endpoint}`),
}));

// Mock useNavigate (even though not directly used, Navbar might use it)
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => vi.fn(), // Return a mock function
    };
});

// Mock useToast from Chakra UI
const mockToast = vi.fn();
vi.mock('@chakra-ui/react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useToast: () => mockToast,
        // Also mock useClipboard for now, as it's part of Chakra UI
        useClipboard: vi.fn((_text) => ({ hasCopied: false, onCopy: vi.fn() })),
    };
});

// Mock Navbar component
vi.mock('../../src/components/Navbar', () => ({
    default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));

// Mock axios
vi.mock('axios');

// Mock localStorage
const localStorageMock = (() => {
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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


describe('UserDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear(); // Clear local storage for each test
        localStorageMock.setItem('accessToken', 'fake_access_token'); // Set a default token
    });

    const renderUserDashboard = () =>
        render(
            <MemoryRouter>
                <ChakraProvider>
                    <UserDashboard />
                </ChakraProvider>
            </MemoryRouter>
        );

    // --- Initial Render & Loading States ---
    it('renders main dashboard elements and shows loading states initially', async () => {
        // Mock API calls to resolve after a delay to keep loading state visible
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return new Promise(resolve => setTimeout(() => resolve({ data: { is_bound: false } }), 100));
            } else if (url.includes('/reports/user/received-reports')) {
                return new Promise(resolve => setTimeout(() => resolve({ data: { items: [], pagination: {} } }), 100));
            } else {
                return Promise.reject(new Error('not mocked'));
            }
        });

        renderUserDashboard();

        expect(screen.getByTestId('navbar')).toHaveTextContent('Панель пользователя');
        expect(screen.getByRole('heading', { name: /Панель пользователя/i })).toBeInTheDocument();
        expect(screen.getByText(/Добро пожаловать в панель пользователя/i)).toBeInTheDocument();

        // Check for initial loading spinners by their accessible text
        expect(screen.getAllByText('Loading...').length).toBe(2);

        await waitFor(() => {
            // After loading, spinners should be gone and content should appear
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            expect(screen.getByText('Интеграция с Telegram')).toBeInTheDocument();
            expect(screen.getByText('Полученные отчеты')).toBeInTheDocument();
        });
    });

    // --- Telegram Integration Tests ---
    it('shows Telegram bound status if user is bound', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: true } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: {} } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByText('Аккаунт привязан к Telegram')).toBeInTheDocument();
            expect(screen.getByText('Вы получаете уведомления через Telegram')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Пересоздать ключ/i })).toBeInTheDocument();
        });
    });

    it('shows Telegram unbound status and generate key button', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: {} } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.queryByText('Аккаунт привязан к Telegram')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Сгенерировать ключ/i })).toBeInTheDocument();
        });
    });

    it('generates a new Telegram key on button click', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: {} } });
            }
            return Promise.reject(new Error('not mocked'));
        });
        axios.post.mockResolvedValueOnce({ data: { key: 'test-telegram-key-123' } });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Сгенерировать ключ/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Сгенерировать ключ/i }));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                '/mock-api/auth/telegram/generate',
                {},
                expect.any(Object)
            );
            expect(screen.getByDisplayValue('test-telegram-key-123')).toBeInTheDocument();
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'success', title: 'Ключ Telegram успешно сгенерирован' })
            );
        });
    });

    it('handles handleGenerateTelegramKey error', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: {} } });
            }
            return Promise.reject(new Error('not mocked'));
        });
        axios.post.mockRejectedValueOnce({ response: { data: { detail: 'Telegram key generation failed' } } });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Сгенерировать ключ/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Сгенерировать ключ/i }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'error', description: 'Telegram key generation failed' })
            );
        });
    });

    // --- Reports Table Tests ---
    it('displays received reports in a table', async () => {
        const mockReports = {
            items: [
                {
                    report_name: 'Отчет 1', sender_name: 'Отправитель А', delivery_method: 'EMAIL',
                    delivered_at: '2023-01-01T10:00:00Z', report_url: 'key1'
                },
                {
                    report_name: 'Отчет 2', sender_name: 'Отправитель Б', delivery_method: 'TELEGRAM',
                    delivered_at: '2023-01-02T11:00:00Z', report_url: 'key2'
                },
            ],
            pagination: { page: 1, per_page: 10, total_pages: 1, total: 2, has_next: false, has_prev: false }
        };
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: mockReports });
            }
            return Promise.reject(new Error('not mocked'));
        });


        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByText('Отчет 1')).toBeInTheDocument();
            expect(screen.getByText('Отправитель Б')).toBeInTheDocument();
            expect(screen.getByText('EMAIL')).toBeInTheDocument();
            expect(screen.getByText('TELEGRAM')).toBeInTheDocument();
            expect(screen.getAllByRole('button', { name: 'Скачать' }).length).toBe(2);
        });

        // Test pagination text
        expect(screen.getByText('Страница 1 из 1 страниц (2 всего отчетов)')).toBeInTheDocument();
    });

    it('shows "Отчетов пока нет." when no reports are received', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: { page: 1, per_page: 10, total_pages: 0, total: 0, has_next: false, has_prev: false } } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByText('Отчетов пока нет.')).toBeInTheDocument();
        });
    });

    it('handles download button click', async () => {
        const mockReports = {
            items: [
                {
                    report_name: 'Отчет 1', sender_name: 'Отправитель А', delivery_method: 'EMAIL',
                    delivered_at: '2023-01-01T10:00:00Z', report_url: 'key1'
                },
            ],
            pagination: { page: 1, per_page: 10, total_pages: 1, total: 1, has_next: false, has_prev: false }
        };
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: mockReports });
            }
            if (url.includes('/url-generate/download')) {
                return Promise.resolve({ data: { url: 'http://mock-download.url/key1' } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByText('Отчет 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Скачать' }));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                '/mock-api/url-generate/download',
                expect.objectContaining({ params: { object_key: 'key1' } })
            );
            expect(windowOpenSpy).toHaveBeenCalledWith('http://mock-download.url/key1', '_blank');
        });
    });

    it('handles handleDownload error', async () => {
        const mockReports = {
            items: [
                {
                    report_name: 'Отчет 1', sender_name: 'Отправитель А', delivery_method: 'EMAIL',
                    delivered_at: '2023-01-01T10:00:00Z', report_url: 'key1'
                },
            ],
            pagination: { page: 1, per_page: 10, total_pages: 1, total: 1, has_next: false, has_prev: false }
        };
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: mockReports });
            }
            if (url.includes('/url-generate/download')) {
                return Promise.reject({ response: { data: { detail: 'Download failed' } } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(screen.getByText('Отчет 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Скачать' }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'error', description: 'Download failed' })
            );
        });
    });

    // --- Error Handling ---
    it('shows toast on error when fetching telegram binding status', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.reject({ response: { data: { detail: 'Telegram error' } } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.resolve({ data: { items: [], pagination: {} } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'error', description: 'Telegram error' })
            );
        });
    });

    it('shows toast on error when fetching reports', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/auth/telegram/is-bound')) {
                return Promise.resolve({ data: { is_bound: false } });
            }
            if (url.includes('/reports/user/received-reports')) {
                return Promise.reject({ response: { data: { detail: 'Reports error' } } });
            }
            return Promise.reject(new Error('not mocked'));
        });

        renderUserDashboard();

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'error', description: 'Reports error' })
            );
        });
    });
});
