import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessModule } from '../config/permissions';

const ProtectedModuleRoute = ({ children, module, fallbackPath = '/app/dashboard' }) => {
  const { user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user can access this module
  if (!canAccessModule(user, module)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // User has permission, render the component
  return children;
};

export default ProtectedModuleRoute;
