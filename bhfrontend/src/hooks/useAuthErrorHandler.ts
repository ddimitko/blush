import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';

/**
 * Hook that handles authentication errors and automatic logout/redirect
 */
export const useAuthErrorHandler = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useToast();

  // Memoize protected paths to prevent unnecessary re-renders
  const protectedPaths = useMemo(() => [
    '/owner/dashboard',
    '/employee/dashboard',
    '/user/profile',
    '/user/appointments',
    '/shop/create',        // Any authenticated user can create shops
    '/notifications',
    '/appointment/'        // Appointment details require authentication
  ], []);

  // Memoize shop management paths to prevent unnecessary re-renders
  const shopManagementPaths = useMemo(() => [
    '/settings',
    '/employees',
    '/services',
    '/analytics'
  ], []);

  // Memoize the protected path check function
  const isOnProtectedPath = useCallback(() => {
    const currentPath = location.pathname;

    // Check basic protected paths
    const isBasicProtected = protectedPaths.some(path =>
      currentPath.startsWith(path)
    );

    // Check shop management paths (e.g., /shop/123/settings)
    const isShopManagement = currentPath.startsWith('/shop/') &&
      shopManagementPaths.some(managementPath =>
        currentPath.includes(managementPath)
      );

    return isBasicProtected || isShopManagement;
  }, [location.pathname, protectedPaths, shopManagementPaths]);

  // Memoize the error handler to prevent unnecessary re-renders
  const showAuthError = useCallback(() => {
    error(
      'Authentication Required',
      'Please sign in to access this page.'
    );
  }, [error]);

  useEffect(() => {
    const currentPath = location.pathname;
    const isProtected = isOnProtectedPath();

    // Only show auth error when user is actually trying to access a protected page
    // Don't show it during logout redirects or when already on home page
    if (isProtected && !isAuthenticated && currentPath !== '/') {
      console.log('🚫 AUTH ERROR HANDLER: User on protected path but not authenticated, redirecting');

      showAuthError();

      navigate('/', {
        replace: true,
        state: {
          from: location.pathname,
          error: 'authentication_required'
        }
      });
    }
  }, [isAuthenticated, location.pathname, navigate, showAuthError, isOnProtectedPath]);

  // Memoize the access denied error handler
  const showAccessDeniedError = useCallback((errorMessage: string) => {
    error('Access Denied', errorMessage);
  }, [error]);

  // Handle role-based access
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const currentPath = location.pathname;
    let hasAccess = true;
    let errorMessage = '';

    // Check owner-only routes
    if (currentPath.startsWith('/owner/') ||
        currentPath.startsWith('/shop/') &&
        (currentPath.includes('/settings') ||
         currentPath.includes('/employees') ||
         currentPath.includes('/analytics'))) {
      if (user.role !== 'OWNER') {
        hasAccess = false;
        errorMessage = 'This page is only accessible to shop owners.';
      }
    }

    // Check employee-only routes
    if (currentPath.startsWith('/employee/')) {
      if (user.role !== 'EMPLOYEE') {
        hasAccess = false;
        errorMessage = 'This page is only accessible to employees.';
      }
    }

    // Check owner/employee routes (like service management)
    if (currentPath.startsWith('/shop/') && currentPath.includes('/services')) {
      if (user.role !== 'OWNER' && user.role !== 'EMPLOYEE') {
        hasAccess = false;
        errorMessage = 'This page is only accessible to shop owners and employees.';
      }
    }

    if (!hasAccess) {
      console.log('🚫 AUTH ERROR HANDLER: User lacks required role for current path');

      showAccessDeniedError(errorMessage);

      // Redirect based on user role
      const redirectPath = user.role === 'OWNER' ? '/owner/dashboard' :
                          user.role === 'EMPLOYEE' ? '/employee/dashboard' :
                          '/user/profile';

      navigate(redirectPath, {
        replace: true,
        state: {
          from: location.pathname,
          error: 'insufficient_permissions'
        }
      });
    }
  }, [isAuthenticated, user, location.pathname, navigate, showAccessDeniedError]);

  // Memoize the auth error handler
  const handleAuthError = useCallback(async () => {
    console.log('🚪 AUTH ERROR HANDLER: Handling auth error, logging out');
    await logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  return {
    isOnProtectedPath: isOnProtectedPath(),
    handleAuthError
  };
};
