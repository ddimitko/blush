import React from 'react';
import { useAuthErrorHandler } from '../../hooks/useAuthErrorHandler';

/**
 * Component that initializes the auth error handler
 * Must be inside Router context
 */
const AuthErrorHandler: React.FC = () => {
  useAuthErrorHandler();
  return null; // This component doesn't render anything
};

export default AuthErrorHandler;
