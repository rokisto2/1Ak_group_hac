// frontend/tests/components/ProtectedRoute.test.jsx
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import React from 'react';

// Mock component to render if protected route allows access
const MockProtectedComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Login Page</div>;
const UserDashboard = () => <div>User Dashboard</div>;
const ManagerDashboard = () => <div>Manager Dashboard</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

describe('ProtectedRoute Component', () => {

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    const renderWithRouter = (ui, { route = '/', path = '/' } = {}) => {
        window.history.pushState({}, 'Test page', route);

        return render(
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path={path} element={ui} />
                    <Route path="/login" element={<LoginComponent />} />
                    <Route path="/user-dashboard" element={<UserDashboard />} />
                    <Route path="/manager-dashboard" element={<ManagerDashboard />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('redirects to /login if no access token is present', () => {
        const { getByText } = renderWithRouter(
            <ProtectedRoute>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('Login Page')).toBeInTheDocument();
    });

    it('renders the child component if user has required role and token', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'admin');

        const { getByText } = renderWithRouter(
            <ProtectedRoute allowedRoles={['admin']}>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects to user dashboard if user does not have the required role', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'user');

        const { getByText } = renderWithRouter(
            <ProtectedRoute allowedRoles={['admin']}>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('User Dashboard')).toBeInTheDocument();
    });

    it('redirects to manager dashboard if user does not have the required role', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'manager');

        const { getByText } = renderWithRouter(
            <ProtectedRoute allowedRoles={['admin']}>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('Manager Dashboard')).toBeInTheDocument();
    });

    it('redirects to admin dashboard if user does not have the required role', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'superuser');

        const { getByText } = renderWithRouter(
            <ProtectedRoute allowedRoles={['user']}>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('redirects to login if user role is not recognized', () => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('userRole', 'unknown');

        const { getByText } = renderWithRouter(
            <ProtectedRoute allowedRoles={['admin']}>
                <MockProtectedComponent />
            </ProtectedRoute>
        );

        expect(getByText('Login Page')).toBeInTheDocument();
    });

});
