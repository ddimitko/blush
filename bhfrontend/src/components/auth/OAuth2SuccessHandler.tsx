import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthUIStore } from '../../store/authUIStore';
import { useToast } from '../ui/Toast';
import LoadingSpinner from '../ui/LoadingSpinner';

const OAuth2SuccessHandler: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { triggerAuthSuccess } = useAuth();
  const { setToken } = useAuthUIStore();
  const { success } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    const provider = searchParams.get('provider');

    if (token) {
      console.log('🔑 OAUTH2: Setting token from OAuth2 success', {
        tokenLength: token.length,
        provider
      });

      // Store the token in auth UI store with 24 hour expiration
      setToken(token, 24 * 60 * 60); // 24 hours in seconds

      // Trigger auth success to close any open modals
      triggerAuthSuccess();

      // Show success message
      success(
        'Welcome to BeautyHub!',
        `Successfully signed in with ${provider || 'OAuth2'}`
      );

      // Small delay to ensure token is set before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } else {
      console.error('❌ OAUTH2: No token received from OAuth2 callback');
      // If no token, redirect to home with error
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate, triggerAuthSuccess, success, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuth2SuccessHandler;
