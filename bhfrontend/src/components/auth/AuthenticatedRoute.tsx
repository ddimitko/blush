import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
  showError?: boolean;
}

/**
 * Component that protects routes requiring any authenticated user
 */
const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children, showError = false }) => {
  return (
    <ProtectedRoute 
      allowedRoles={['USER', 'OWNER', 'EMPLOYEE', 'ADMIN']}
      redirectTo="/" 
      showError={showError}
    >
      {children}
    </ProtectedRoute>
  );
};

export default AuthenticatedRoute;
