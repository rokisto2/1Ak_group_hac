// frontend/tests/components/Navbar.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../src/components/Navbar';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

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

describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    const renderNavbar = (title) =>
        render(
            <MemoryRouter>
                <ChakraProvider>
                    <Navbar title={title} />
                </ChakraProvider>
            </MemoryRouter>
        );

    it('renders the navbar with the correct title', () => {
        renderNavbar('Test Title');
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('handles logout correctly', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('userId', '123');

        renderNavbar('Test Title');

        fireEvent.click(screen.getByRole('button', { name: /Выйти/i }));

        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('userRole')).toBeNull();
        expect(localStorage.getItem('userId')).toBeNull();

        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Успешный выход из системы',
                status: 'success',
            })
        );

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});
