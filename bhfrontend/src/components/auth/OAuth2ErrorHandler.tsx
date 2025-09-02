import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { AlertCircle } from 'lucide-react';

const OAuth2ErrorHandler: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error: showError } = useToast();

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      showError(
        'Authentication Failed',
        errorDescription || 'An error occurred during authentication. Please try again.'
      );
    }

    // Redirect to home page after showing error
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams, navigate, showError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-error-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentication Failed
        </h2>
        <p className="text-gray-600 mb-4">
          There was an error during authentication. You will be redirected to the home page shortly.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="text-accent-600 hover:text-accent-500 font-medium"
        >
          Go to Home Page
        </button>
      </div>
    </div>
  );
};

export default OAuth2ErrorHandler;
