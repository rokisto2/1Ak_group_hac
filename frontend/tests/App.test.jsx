// frontend/tests/App.test.jsx
// Brief description:
// Tests verify application routing (redirects and page rendering) using MemoryRouter.
// Page components are mocked so tests focus only on App's routing behavior.

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import React from 'react';

// Mock the page components that are not being directly tested
vi.mock('../src/pages/Login', () => ({
    default: () => <div><button>Войти</button></div>
}));
vi.mock('../src/pages/UserDashboard', () => ({
    default: () => <div>User Dashboard</div>
}));
vi.mock('../src/pages/ManagerDashboard', () => ({
    default: () => <div>Manager Dashboard</div>
}));
vi.mock('../src/pages/AdminDashboard', () => ({
    default: () => <div>Admin Dashboard</div>
}));
vi.mock('../src/pages/NotFound', () => ({
    default: () => <div>Page Not Found</div>
}));
vi.mock('../src/pages/SendReport', () => ({
    default: () => <div>Send Report</div>
}));
vi.mock('../src/components/ProtectedRoute', () => ({
    default: ({ children }) => <div>{children}</div>
}));


// Test suite: verify routing including redirect to /login
describe('App Routing', () => {

    // Ensure root path ('/') redirects to the login page
    it('should redirect from / to /login', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );
        // After redirect, the login button should be visible on the mocked Login page
        expect(screen.getByRole('button', { name: /Войти/i })).toBeInTheDocument();
    });

    // Ensure direct navigation to /login renders the login page
    it('should render the login page for the /login route', () => {
        render(
            <MemoryRouter initialEntries={['/login']}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByRole('button', { name: /Войти/i })).toBeInTheDocument();
    });

    // Ensure unknown routes render the NotFound page
    it('should render the NotFound page for a nonexistent route', () => {
        render(
            <MemoryRouter initialEntries={['/some/bad/route']}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });

    // Ensure /user-dashboard route renders the UserDashboard page
    it('should render the user dashboard for the /user-dashboard route', () => {
        render(
            <MemoryRouter initialEntries={['/user-dashboard']}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByText('User Dashboard')).toBeInTheDocument();
    });
});
