import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Building, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorState from '../components/ui/ErrorState';

interface InvitationDetails {
  email: string;
  shopName: string;
  shopOwnerName: string;
  expiresAt: string;
  bio?: string;
  specialties?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  commissionRate?: number;
}

interface NewUserFormData {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const InvitationWizardPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<NewUserFormData>();

  const password = watch('password');

  useEffect(() => {
    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getInvitationDetails(token!);
      setInvitation(response);
      
      // Check if user exists
      const userCheckResponse = await apiClient.checkEmailExists(response.email);
      setUserExists(userCheckResponse.exists);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invitation details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      setIsAccepting(true);
      await apiClient.acceptInvitation(token!);
      success('Invitation accepted!', 'Welcome to the team! You can now access your employee dashboard.');
      navigate('/dashboard');
    } catch (err: any) {
      showError('Failed to accept invitation', err.response?.data?.message || 'An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectInvitation = () => {
    if (window.confirm('Are you sure you want to reject this invitation? This action cannot be undone.')) {
      navigate('/');
    }
  };

  const handleNewUserSubmit = async (data: NewUserFormData) => {
    try {
      setIsAccepting(true);
      await apiClient.acceptInvitationWithAccountSetup(token!, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword
      });
      success('Account created and invitation accepted!', 'Welcome to Lunara! You can now access your employee dashboard.');
      navigate('/dashboard');
    } catch (err: any) {
      showError('Failed to create account', err.response?.data?.message || 'An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading invitation..." />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorState
            title="Invalid Invitation"
            description={error || 'This invitation link is invalid or has expired.'}
            onGoHome={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {userExists ? 'Join the Team' : 'Create Your Account'}
            </h1>
            <p className="text-gray-600">
              You've been invited to join <strong>{String(invitation.shopName || 'Unknown Shop')}</strong>
            </p>
          </div>

          {/* Invitation Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Shop:</span>
                <span className="font-medium">{String(invitation.shopName || 'Unknown Shop')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invited by:</span>
                <span className="font-medium">{String(invitation.shopOwnerName || 'Unknown Owner')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{String(invitation.email || 'No email')}</span>
              </div>
              {invitation.bio && String(invitation.bio).trim() && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-600 text-xs">Role Description:</span>
                  <p className="text-gray-800 text-sm mt-1">{String(invitation.bio)}</p>
                </div>
              )}
            </div>
          </div>

          {userExists ? (
            /* Existing User - Accept/Reject */
            <div className="space-y-4">
              <p className="text-center text-gray-600 mb-6">
                Welcome back! You can accept or decline this invitation.
              </p>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleRejectInvitation}
                  className="flex-1"
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                  className="flex-1"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  {isAccepting ? 'Accepting...' : 'Accept Invitation'}
                </Button>
              </div>
            </div>
          ) : (
            /* New User - Account Setup Form */
            <form onSubmit={handleSubmit(handleNewUserSubmit)} className="space-y-4">
              <p className="text-center text-gray-600 mb-6">
                Complete your account setup to join the team.
              </p>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  type="text"
                  placeholder="John"
                  icon={<User className="w-4 h-4" />}
                  {...register('firstName', {
                    required: 'First name is required',
                    minLength: { value: 1, message: 'First name is required' },
                    maxLength: { value: 100, message: 'First name is too long' }
                  })}
                  error={errors.firstName?.message}
                />

                <Input
                  label="Last Name"
                  type="text"
                  placeholder="Doe"
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: { value: 1, message: 'Last name is required' },
                    maxLength: { value: 100, message: 'Last name is too long' }
                  })}
                  error={errors.lastName?.message}
                />
              </div>

              {/* Phone */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                icon={<Phone className="w-4 h-4" />}
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[\+]?[1-9][\d]{0,15}$/,
                    message: 'Please enter a valid phone number'
                  }
                })}
                error={errors.phone?.message}
              />

              {/* Password */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  icon={<Lock className="w-4 h-4" />}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number'
                    }
                  })}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  icon={<Lock className="w-4 h-4" />}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  error={errors.confirmPassword?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRejectInvitation}
                  className="flex-1"
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Decline
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAccepting}
                  className="flex-1"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  {isAccepting ? 'Creating Account...' : 'Create Account & Join'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationWizardPage;
