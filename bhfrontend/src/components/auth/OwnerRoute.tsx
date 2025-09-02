import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface OwnerRouteProps {
  children: React.ReactNode;
  showError?: boolean;
}

/**
 * Component that protects routes requiring OWNER role
 */
const OwnerRoute: React.FC<OwnerRouteProps> = ({ children, showError = false }) => {
  return (
    <ProtectedRoute 
      requiredRole="OWNER" 
      redirectTo="/" 
      showError={showError}
    >
      {children}
    </ProtectedRoute>
  );
};

export default OwnerRoute;
