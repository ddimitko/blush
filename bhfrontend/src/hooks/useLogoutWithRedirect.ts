import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Hook that provides logout functionality with automatic redirect
 * from authenticated pages to home page
 */
export const useLogoutWithRedirect = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const logoutWithRedirect = async () => {
    // Define paths that require redirect after logout
    const authenticatedPaths = [
      '/owner/dashboard',
      '/employee/dashboard', 
      '/user/profile',
      '/user/appointments',
      '/shop/create',
      '/shop/',
      '/notifications'
    ];
    
    const isOnAuthenticatedPage = authenticatedPaths.some(path => 
      location.pathname.startsWith(path)
    );

    try {
      // Perform logout
      await logout();
      
      // Redirect to home if on authenticated page
      if (isOnAuthenticatedPage) {
        console.log('🏠 LOGOUT: Redirecting to home after logout from authenticated page');
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('❌ LOGOUT: Logout failed, but still redirecting if needed:', error);
      
      // Still redirect if on authenticated page, even if logout failed
      if (isOnAuthenticatedPage) {
        console.log('🏠 LOGOUT: Redirecting to home after logout error from authenticated page');
        navigate('/', { replace: true });
      }
    }
  };

  return { logoutWithRedirect };
};
