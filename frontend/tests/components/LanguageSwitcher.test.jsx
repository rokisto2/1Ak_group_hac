// frontend/tests/components/LanguageSwitcher.test.jsx
// Brief description:
// Tests the LanguageSwitcher component: language switching, menu interactions, and sessionStorage updates.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

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

// Mock scrollTo to avoid errors with Chakra UI Menu
Element.prototype.scrollTo = vi.fn();

describe('LanguageSwitcher Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorageMock.clear();
        i18n.changeLanguage('ru'); // Reset to Russian
    });

    const renderLanguageSwitcher = () =>
        render(
            <ChakraProvider>
                <I18nextProvider i18n={i18n}>
                    <LanguageSwitcher />
                </I18nextProvider>
            </ChakraProvider>
        );

    it('renders with current language (Russian by default)', () => {
        renderLanguageSwitcher();

        expect(screen.getByRole('button', { name: /русский/i })).toBeInTheDocument();
    });

    it('opens menu on button click', async () => {
        renderLanguageSwitcher();

        const button = screen.getByRole('button', { name: /русский/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByRole('menuitem', { name: 'Русский' })).toBeInTheDocument();
            expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument();
        });
    });

    it('switches to English and updates sessionStorage', async () => {
        renderLanguageSwitcher();

        const button = screen.getByRole('button', { name: /русский/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument();
        });

        const englishOption = screen.getByRole('menuitem', { name: 'English' });
        fireEvent.click(englishOption);

        await waitFor(() => {
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith('language', 'en');
            expect(i18n.language).toBe('en');
        }, { timeout: 3000 });
    });

    it('switches to Russian and updates sessionStorage', async () => {
        i18n.changeLanguage('en'); // Start with English
        renderLanguageSwitcher();

        const button = screen.getByRole('button', { name: /english/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByRole('menuitem', { name: 'Русский' })).toBeInTheDocument();
        });

        const russianOption = screen.getByRole('menuitem', { name: 'Русский' });
        fireEvent.click(russianOption);

        await waitFor(() => {
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith('language', 'ru');
            expect(i18n.language).toBe('ru');
        }, { timeout: 3000 });
    });

    it('displays correct label when language is English', async () => {
        i18n.changeLanguage('en');
        renderLanguageSwitcher();

        expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    });

    it('menu closes after selecting a language', async () => {
        renderLanguageSwitcher();

        const button = screen.getByRole('button', { name: /русский/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByRole('menuitem', { name: 'English' })).toBeInTheDocument();
        });

        const englishOption = screen.getByRole('menuitem', { name: 'English' });
        fireEvent.click(englishOption);

        await waitFor(() => {
            expect(screen.queryByRole('menuitem', { name: 'English' })).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
