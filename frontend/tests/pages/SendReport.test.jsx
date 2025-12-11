// frontend/tests/pages/SendReport.test.jsx
// Brief description:
// Tests for SendReport component: validates report sending functionality, recipient selection,
// delivery methods, and error handling. Uses i18n for localized text.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SendReport from '../../src/pages/SendReport';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import axios from 'axios';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

// Mock axios
vi.mock('axios');

// Mock getApiUrl
vi.mock('../../src/utils/api', () => ({
    getApiUrl: vi.fn((endpoint) => `/mock-api${endpoint}`),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock useToast from Chakra UI
const mockToast = vi.fn();
vi.mock('@chakra-ui/react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useToast: () => mockToast,
    };
});

const mockUsers = {
    users: [
        { id: 1, full_name: 'User One', email: 'user1@example.com' },
        { id: 2, full_name: 'User Two', email: 'user2@example.com' },
    ],
    pagination: { total_pages: 2, page: 1 }
};

describe('SendReport Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('accessToken', 'test-token');
        axios.get.mockResolvedValue({ data: mockUsers });
        axios.post.mockResolvedValue({ data: {} });
    });

    const renderSendReport = () =>
        render(
            <ChakraProvider>
                <I18nextProvider i18n={i18n}>
                    <MemoryRouter initialEntries={['/send-report/1']}>
                        <Routes>
                            <Route path="/send-report/:reportId" element={<SendReport />} />
                        </Routes>
                    </MemoryRouter>
                </I18nextProvider>
            </ChakraProvider>
        );

    it('renders the component and fetches users', async () => {
        renderSendReport();

        const headings = screen.getAllByRole('heading', { name: i18n.t('sendReport.title') });
        expect(headings.length).toBeGreaterThan(0);
        
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/mock-api/users', expect.any(Object));
        });

        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
            expect(screen.getByText('User Two')).toBeInTheDocument();
        });
    });

    it('handles fetchUsers error', async () => {
        axios.get.mockRejectedValueOnce({ response: { data: { detail: 'Users not found' } } });
        renderSendReport();
        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    description: i18n.t('sendReport.errorLoadingUsers'),
                })
            );
        });
    });

    it('handles fetchUsers with invalid data', async () => {
        axios.get.mockResolvedValueOnce({ data: { users: null } });
        renderSendReport();
        await waitFor(() => {
            expect(screen.queryByText('User One')).not.toBeInTheDocument();
        });
    });

    it('allows selecting and deselecting users for delivery', async () => {
        renderSendReport();
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });

        const user1_email_checkbox = screen.getAllByRole('checkbox')[1]; // First is select all for email
        fireEvent.click(user1_email_checkbox);

        expect(user1_email_checkbox).toBeChecked();

        fireEvent.click(user1_email_checkbox);

        expect(user1_email_checkbox).not.toBeChecked();
    });

    it('allows selecting all users for a delivery method and deselecting them', async () => {
        const { container } = renderSendReport();
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });
    
        const emailHeader = screen.getByText(i18n.t('sendReport.deliveryEmail'));
        const selectAllEmail = emailHeader.parentElement.querySelector('input[type="checkbox"]');
        fireEvent.click(selectAllEmail);
    
        await waitFor(() => {
            const selectedUsersDiv = container.querySelector('[data-testid="selected-users"]');
            const selectedUsers = JSON.parse(selectedUsersDiv.textContent);
            expect(selectedUsers).toEqual({
                '1': ['email'],
                '2': ['email']
            });
        });

        fireEvent.click(selectAllEmail);

        await waitFor(() => {
            const selectedUsersDiv = container.querySelector('[data-testid="selected-users"]');
            const selectedUsers = JSON.parse(selectedUsersDiv.textContent);
            expect(selectedUsers).toEqual({});
        });
    });
    

    it('sends the report successfully', async () => {
        renderSendReport();
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });
    
        // Find the checkbox for User One and email
        const userOneRow = screen.getByText('User One').closest('tr');
        const emailCheckbox = userOneRow.querySelectorAll('input[type="checkbox"]')[0];
        fireEvent.click(emailCheckbox);
    
        const sendButton = screen.getByRole('button', { name: i18n.t('sendReport.sendButton') });
        fireEvent.click(sendButton);
    
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                '/mock-api/reports/send',
                {
                    report_id: '1',
                    users_info: [['1', ['email']]],
                },
                expect.any(Object)
            );
        });
    
        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                title: i18n.t('sendReport.success'),
                status: 'success'
            }));
            expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
        });
    });

    it('shows an error if no users are selected and button is disabled', async () => {
        renderSendReport();
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });

        const sendButton = screen.getByRole('button', { name: i18n.t('sendReport.sendButton') });
        expect(sendButton).toBeDisabled();
    });


    it('handles API error on send', async () => {
        axios.post.mockRejectedValue({ response: { data: { detail: 'Failed to send' } } });
        
        renderSendReport();
        await waitFor(() => {
            expect(screen.getByText('User One')).toBeInTheDocument();
        });

        const user1_email_checkbox = screen.getAllByRole('checkbox')[1];
        fireEvent.click(user1_email_checkbox);

        const sendButton = screen.getByRole('button', { name: i18n.t('sendReport.sendButton') });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                title: i18n.t('sendReport.error'),
                description: 'Failed to send',
                status: 'error'
            }));
        });
    });
});
