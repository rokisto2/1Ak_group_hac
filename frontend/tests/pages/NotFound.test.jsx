// frontend/tests/pages/NotFound.test.jsx
// Brief description:
// Tests for NotFound (404) page component: validates rendering of error messages
// and navigation functionality. Uses i18n for localized text.

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../../src/pages/NotFound'; // Adjust path
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

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
                    <I18nextProvider i18n={i18n}>
                        <NotFound />
                    </I18nextProvider>
                </ChakraProvider>
            </MemoryRouter>
        );

    it('renders the 404 heading and messages', () => {
        renderNotFound();

        expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
        expect(screen.getByText(i18n.t('notFound.title'))).toBeInTheDocument();
        expect(screen.getByText(i18n.t('notFound.message'))).toBeInTheDocument();
        expect(screen.getByRole('button', { name: i18n.t('notFound.backToLogin') })).toBeInTheDocument();
    });

    it('navigates to home when "Go to Home" button is clicked', () => {
        renderNotFound();

        fireEvent.click(screen.getByRole('button', { name: i18n.t('notFound.backToLogin') }));

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});
