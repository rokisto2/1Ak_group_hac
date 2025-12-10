// frontend/tests/pages/Login.test.jsx
// Brief description:
// Tests for the Login page: form rendering, validation, visibility toggle, and login flow for different roles.
// API calls and navigation are mocked to validate component behavior in isolation.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../src/pages/Login'; // Adjust path
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

// Mock getApiUrl since it's used in fetch call
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

describe('Login Component', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
        // Reset localStorage for each test
        localStorage.clear();
    });

    const renderLoginForm = () =>
        render(
            <MemoryRouter>
                <ChakraProvider>
                    <I18nextProvider i18n={i18n}>
                        <Login />
                    </I18nextProvider>
                </ChakraProvider>
            </MemoryRouter>
        );

    it('renders the login form elements', () => {
        renderLoginForm();

        expect(screen.getByRole('heading', { name: i18n.t('login.title') })).toBeInTheDocument();
        expect(screen.getByLabelText(i18n.t('login.email'))).toBeInTheDocument();
        expect(screen.getByLabelText(i18n.t('login.password'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: i18n.t('login.loginButton') })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: i18n.t('login.showPassword') })).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
        renderLoginForm();

        const passwordInput = screen.getByLabelText(i18n.t('login.password'));
        const toggleButton = screen.getByRole('button', { name: i18n.t('login.showPassword') });

        expect(passwordInput).toHaveAttribute('type', 'password');
        await act(async () => {
            fireEvent.click(toggleButton);
        });
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getByRole('button', { name: i18n.t('login.hidePassword') })).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(toggleButton);
        });
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: i18n.t('login.showPassword') })).toBeInTheDocument();
    });

    it('shows validation errors for empty fields on submit', async () => {
        renderLoginForm();

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });

        await waitFor(() => {
            expect(screen.getByText(i18n.t('login.emailRequired'))).toBeInTheDocument();
            expect(screen.getByText(i18n.t('login.passwordRequired'))).toBeInTheDocument();
        });

        // Ensure no navigation happens
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles successful login and redirects based on role user', async () => {
        // Mock a successful fetch response
        vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ access_token: 'fake-token', role: 'user', user_id: 123 }),
            })
        );

        renderLoginForm();

        // Fill out the form
        await act(async () => {
            fireEvent.change(screen.getByLabelText(i18n.t('login.email')), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText(i18n.t('login.password')), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });


        // Wait for the asynchronous operations to complete
        await waitFor(() => {
            expect(screen.getByRole('button', { name: i18n.t('login.loginButton') })).not.toBeDisabled(); // Check if loading state is false
        });

        // Assert fetch was called correctly
        expect(global.fetch).toHaveBeenCalledWith(
            '/mock-api/auth/login',
            expect.objectContaining({
                method: 'POST',
                body: expect.any(FormData), // Expecting FormData
            })
        );

        // You can further inspect the FormData content if needed
        const fetchArgs = global.fetch.mock.calls[0][1];
        const formData = fetchArgs.body;
        expect(formData.get('username')).toBe('test@example.com');
        expect(formData.get('password')).toBe('password123');


        // Assert localStorage was set
        expect(localStorage.getItem('accessToken')).toBe('fake-token');
        expect(localStorage.getItem('userRole')).toBe('user');
        expect(localStorage.getItem('userId')).toBe('123');

        // Assert toast was shown
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: i18n.t('login.loginSuccess'),
                status: 'success',
            })
        );

        // Assert navigation occurred
        expect(mockNavigate).toHaveBeenCalledWith('/user-dashboard');
    });

    it('handles successful login and redirects based on role manager', async () => {
        // Mock a successful fetch response
        vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ access_token: 'fake-token', role: 'manager', user_id: 123 }),
            })
        );

        renderLoginForm();

        // Fill out the form
        await act(async () => {
            fireEvent.change(screen.getByLabelText(i18n.t('login.email')), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText(i18n.t('login.password')), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });


        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/manager-dashboard');
        });
    });

    it('handles successful login and redirects based on role superuser', async () => {
        // Mock a successful fetch response
        vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ access_token: 'fake-token', role: 'superuser', user_id: 123 }),
            })
        );

        renderLoginForm();

        // Fill out the form
        await act(async () => {
            fireEvent.change(screen.getByLabelText(i18n.t('login.email')), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText(i18n.t('login.password')), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });


        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/admin-dashboard');
        });
    });

    it('handles successful login and redirects based on default role', async () => {
        // Mock a successful fetch response
        vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ access_token: 'fake-token', role: 'unknown', user_id: 123 }),
            })
        );

        renderLoginForm();

        // Fill out the form
        await act(async () => {
            fireEvent.change(screen.getByLabelText(i18n.t('login.email')), { target: { value: 'test@example.com' } });
            fireEvent.change(screen.getByLabelText(i18n.t('login.password')), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });


        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/user-dashboard');
        });
    });

    it('handles failed login and shows error toast', async () => {
        // Mock a failed fetch response
        vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ detail: 'Invalid credentials' }),
            })
        );

        renderLoginForm();

        // Fill out the form
        await act(async () => {
            fireEvent.change(screen.getByLabelText(i18n.t('login.email')), { target: { value: 'wrong@example.com' } });
            fireEvent.change(screen.getByLabelText(i18n.t('login.password')), { target: { value: 'wrongpass' } });
            fireEvent.click(screen.getByRole('button', { name: i18n.t('login.loginButton') }));
        });


        await waitFor(() => {
            expect(screen.getByRole('button', { name: i18n.t('login.loginButton') })).not.toBeDisabled();
        });

        // Assert toast was shown
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: i18n.t('login.loginFailed'),
                status: 'error',
            })
        );

        // Ensure no navigation happens
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});