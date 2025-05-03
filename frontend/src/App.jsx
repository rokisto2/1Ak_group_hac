import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/user-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['user']}>
                            <UserDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/manager-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['superuser']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Redirect root to login page */}
                <Route path="/" element={<Navigate to="/login" />} />

                {/* Catch-all route for non-existent URLs */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}

export default App;