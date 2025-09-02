import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface EmployeeRouteProps {
  children: React.ReactNode;
  showError?: boolean;
}

/**
 * Component that protects routes requiring EMPLOYEE role
 */
const EmployeeRoute: React.FC<EmployeeRouteProps> = ({ children, showError = false }) => {
  return (
    <ProtectedRoute 
      requiredRole="EMPLOYEE" 
      redirectTo="/" 
      showError={showError}
    >
      {children}
    </ProtectedRoute>
  );
};

export default EmployeeRoute;
