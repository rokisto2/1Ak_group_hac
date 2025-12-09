// frontend/tests/pages/NotFound.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../../src/pages/NotFound'; // Adjust path
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

describe('NotFound Component', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    const renderNotFound = () =>
        render(
            <MemoryRouter>
                <ChakraProvider>
                    <NotFound />
                </ChakraProvider>
            </MemoryRouter>
        );

    it('renders the 404 heading and messages', () => {
        renderNotFound();

        expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
        expect(screen.getByText('Page Not Found')).toBeInTheDocument();
        expect(screen.getByText(/The page you're looking for doesn't exist/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument();
    });

    it('navigates to home when "Go to Home" button is clicked', () => {
        renderNotFound();

        fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});
