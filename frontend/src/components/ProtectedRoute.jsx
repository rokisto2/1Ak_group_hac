import { Navigate } from 'react-router-dom';
import { cloneElement } from 'react';

function ProtectedRoute({ children, allowedRoles }) {
    const userRole = sessionStorage.getItem('userRole');
    const accessToken = sessionStorage.getItem('accessToken');
    const userId = sessionStorage.getItem('userId');

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
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

    // Передаем userId в дочерний компонент
    return cloneElement(children, { userId });
}

export default ProtectedRoute;
