import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';
import { UnauthorizedErrorState } from '../ui/ErrorState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'OWNER' | 'EMPLOYEE' | 'ADMIN';
  allowedRoles?: Array<'USER' | 'OWNER' | 'EMPLOYEE' | 'ADMIN'>;
  redirectTo?: string;
  showError?: boolean;
}

/**
 * Component that protects routes based on authentication and role requirements
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
  redirectTo = '/',
  showError = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user has required role
  const hasRequiredRole = () => {
    if (!user) return false;
    
    // If specific role is required
    if (requiredRole) {
      return user.role === requiredRole;
    }
    
    // If multiple roles are allowed
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(user.role as any);
    }
    
    // If no role requirements, just need to be authenticated
    return true;
  };

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      console.log('🚫 PROTECTED ROUTE: User not authenticated, redirecting to:', redirectTo);
      navigate(redirectTo, { 
        replace: true,
        state: { from: location.pathname }
      });
      return;
    }

    // If authenticated but doesn't have required role
    if (isAuthenticated && user && !hasRequiredRole()) {
      console.log('🚫 PROTECTED ROUTE: User lacks required role, redirecting to:', redirectTo);
      navigate(redirectTo, { 
        replace: true,
        state: { 
          from: location.pathname,
          error: 'insufficient_permissions'
        }
      });
      return;
    }
  }, [isAuthenticated, user, isLoading, navigate, location.pathname, redirectTo]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error state if requested and user is not authenticated
  if (showError && !isAuthenticated) {
    return <UnauthorizedErrorState />;
  }

  // Show error state if user doesn't have required role
  if (showError && isAuthenticated && user && !hasRequiredRole()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-accent-600 text-white px-4 py-2 rounded-md hover:bg-accent-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated or doesn't have role, don't render children
  // (redirect will happen in useEffect)
  if (!isAuthenticated || (user && !hasRequiredRole())) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
