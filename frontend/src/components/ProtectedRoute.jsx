// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRoles }) {
    const userRole = localStorage.getItem('userRole');
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        switch(userRole) {
            case 'user':
                return <Navigate to="/user-dashboard" replace />;
            case 'manager':
                return <Navigate to="/manager-dashboard" replace />;
            case 'superuser':
                return <Navigate to="/admin-dashboard" replace />;
            default:
                return <Navigate to="/login" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;