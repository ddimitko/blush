import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, Facebook, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFacebookLoginMutation } from '../../hooks/queries/useAuthQueries';
import { useModalUIStore } from '../../store/uiStore';
import { useToast } from '../ui/Toast';
import { LoginRequest, RegisterRequest } from '../../types';
import { isValidPassword } from '../../lib/utils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';
import LoadingSpinner from '../ui/LoadingSpinner';
import LunaraLogo from '../ui/LunaraLogo';
import facebookSDK from '../../lib/facebook';
import { resolveFacebookConflicts } from '../../utils/facebookConflictResolver';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const { login, register, isLoading, error, clearError, setToken, triggerAuthSuccess } = useAuth();
  const { authModalMode, setAuthModalMode } = useModalUIStore();
  const { success, error: showError } = useToast();

  // Facebook login mutation
  const facebookLoginMutation = useFacebookLoginMutation();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<LoginRequest & RegisterRequest>();

  // Sync with modal UI store
  useEffect(() => {
    if (authModalMode !== mode) {
      setMode(authModalMode);
    }
  }, [authModalMode, mode]);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      reset();
      clearError();
      setShowPassword(false);
    }
  }, [isOpen, defaultMode, reset, clearError]);

  // Clear errors when switching modes
  useEffect(() => {
    clearError();
    reset();
  }, [mode, clearError, reset]);

  const onSubmit = async (data: LoginRequest & RegisterRequest) => {
    try {
      if (mode === 'login') {
        await login({ email: data.email, password: data.password });
        success('Welcome back!', 'You have been successfully signed in.');
        onClose(); // Auto-close modal on successful login
      } else {
        await register({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        });
        success('Welcome to Lunara!', 'Your account has been created successfully.');
        onClose(); // Auto-close modal on successful registration
      }
    } catch (error: any) {
      // Error is already set in the store
      console.error('Authentication failed:', error);
      // Don't close modal on error - let user try again
    }
  };

  const handleFacebookLoginInternal = async (isRetry = false) => {
    setIsFacebookLoading(true);
    try {
      // If this is a retry, perform a complete reset
      if (isRetry) {
        console.log('🔄 Retrying Facebook login with complete reset...');
        facebookSDK.reset();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Resolve any Facebook authentication conflicts before login
      console.log('🧹 Resolving Facebook authentication conflicts...');
      await resolveFacebookConflicts();

      // Wait a moment for conflict resolution to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const { accessToken } = await facebookSDK.login();
      const response = await facebookLoginMutation.mutateAsync(accessToken);

      console.log('✅ FACEBOOK LOGIN: Setting token in auth UI store', {
        hasToken: !!response.token,
        tokenLength: response.token?.length
      });

      // Set token in auth UI store with 24 hour expiration
      setToken(response.token, 24 * 60 * 60); // 24 hours in seconds

      // Trigger auth success to close modal
      triggerAuthSuccess();

      success('Welcome to Lunara!', 'Successfully signed in with Facebook');
      onClose(); // Auto-close modal on successful Facebook login
    } catch (error: any) {
      console.error('Facebook login error:', error);
      let errorMessage = 'Unable to sign in with Facebook';
      let showRetryOption = false;

      if (error.message?.includes('App ID not configured')) {
        errorMessage = 'Facebook authentication is not configured. Please contact support.';
      } else if (error.message?.includes('cancelled')) {
        errorMessage = 'Facebook login was cancelled';
      } else if (error.message?.includes('not authorized')) {
        errorMessage = 'Facebook login was not authorized. Please grant permission to continue.';
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        errorMessage = 'Facebook login timed out. Please check your internet connection and try again.';
        showRetryOption = true;
      } else if (error.message?.includes('Failed to load')) {
        errorMessage = 'Failed to load Facebook authentication. Please check your internet connection and try again.';
        showRetryOption = true;
      } else if (error.message?.includes('initialization')) {
        errorMessage = 'Facebook authentication failed to initialize. Please try again.';
        showRetryOption = true;
      } else {
        errorMessage = 'Facebook login failed. Please try again.';
        showRetryOption = true;
      }

      // Show error with retry option if applicable
      if (showRetryOption && !isRetry) {
        showError('Facebook Login Failed', errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => handleFacebookLoginInternal(true)
          }
        });
      } else {
        showError('Facebook Login Failed', errorMessage);
      }
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    handleFacebookLoginInternal(false);
  };

  const password = watch('password');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="relative p-8 pb-6">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-full hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-4">
            <LunaraLogo size="lg" variant="full" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-neutral-800">
                {mode === 'login' ? 'Welcome back' : 'Join Lunara'}
              </h2>
              <p className="text-neutral-600">
                {mode === 'login'
                  ? 'Sign in to your account to continue'
                  : 'Create your account to start booking premium beauty services'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {/* Mode Toggle */}
          <div className="flex bg-neutral-100 rounded-xl p-1 mb-8">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setAuthModalMode('login');
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setAuthModalMode('register');
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-shake" data-cy="error-message">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-3 h-3 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    {mode === 'login' ? 'Sign in failed' : 'Registration failed'}
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="firstName"
                      type="text"
                      className="pl-10"
                      placeholder="First name"
                      data-cy="first-name-input"
                      {...registerField('firstName', {
                        required: mode === 'register' ? 'First name is required' : false,
                        minLength: {
                          value: 2,
                          message: 'First name must be at least 2 characters',
                        },
                      })}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="lastName"
                      type="text"
                      className="pl-10"
                      placeholder="Last name"
                      data-cy="last-name-input"
                      {...registerField('lastName', {
                        required: mode === 'register' ? 'Last name is required' : false,
                        minLength: {
                          value: 2,
                          message: 'Last name must be at least 2 characters',
                        },
                      })}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  placeholder="Enter your email"
                  data-cy="email-input"
                  {...registerField('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <PhoneInput
                  label="Phone number"
                  placeholder="Enter phone number"
                  defaultCountry="BG"
                  required
                  value={watch('phone') || ''}
                  onChange={(value) => setValue('phone', value)}
                  error={errors.phone?.message}
                />
                <input
                  type="hidden"
                  {...registerField('phone', {
                    required: 'Phone number is required',
                  })}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pl-10 pr-10"
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                  data-cy="password-input"
                  {...registerField('password', {
                    required: 'Password is required',
                    validate: mode === 'register' ? (value) => {
                      if (!isValidPassword(value)) {
                        return 'Password must be at least 8 characters with uppercase, lowercase, and number';
                      }
                      return true;
                    } : undefined,
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
              {mode === 'register' && password && (
                <div className="mt-2">
                  <div className="text-xs text-gray-600">Password strength:</div>
                  <div className="flex space-x-1 mt-1">
                    <div className={`h-1 w-1/4 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`h-1 w-1/4 rounded ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-cy={mode === 'login' ? 'login-submit' : 'register-submit'}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500 font-medium">or continue with</span>
            </div>
          </div>

          {/* Facebook Login */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 py-3 rounded-xl"
            onClick={handleFacebookLogin}
            disabled={isFacebookLoading || isLoading}
          >
            {isFacebookLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Facebook className="w-5 h-5 mr-2" />
            )}
            {isFacebookLoading ? 'Connecting...' : 'Continue with Facebook'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
