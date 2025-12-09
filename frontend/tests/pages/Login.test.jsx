// frontend/tests/pages/Login.test.jsx
// Brief description:
// Tests for the Login page: form rendering, validation, visibility toggle, and login flow for different roles.
// API calls and navigation are mocked to validate component behavior in isolation.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../src/pages/Login'; // Adjust path
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

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
                    <Login />
                </ChakraProvider>
            </MemoryRouter>
        );

    it('renders the login form elements', () => {
        renderLoginForm();

        expect(screen.getByRole('heading', { name: /Логин/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Пароль/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Вход/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Показать/i })).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
        renderLoginForm();

        const passwordInput = screen.getByLabelText(/Пароль/i);
        const toggleButton = screen.getByRole('button', { name: /Показать/i });

        expect(passwordInput).toHaveAttribute('type', 'password');
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getByRole('button', { name: /Скрыть/i })).toBeInTheDocument();
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(screen.getByRole('button', { name: /Показать/i })).toBeInTheDocument();
    });

    it('shows validation errors for empty fields on submit', async () => {
        renderLoginForm();

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
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
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

        // Wait for the asynchronous operations to complete
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Вход/i })).not.toBeDisabled(); // Check if loading state is false
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
                title: 'Login Successful',
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
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

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
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

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
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

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
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'wrongpass' } });

        fireEvent.click(screen.getByRole('button', { name: /Вход/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Вход/i })).not.toBeDisabled();
        });

        // Assert toast was shown
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Login Failed',
                status: 'error',
            })
        );

        // Ensure no navigation happens
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});