import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CheckCircle, AlertCircle, User, Lock, Phone } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { apiClient } from '../lib/api';

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

interface AcceptFormData {
  password: string;
  confirmPassword: string;
  phone?: string;
}

const EmployeeInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AcceptFormData>();

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setInvitationError('Invalid invitation link');
      setLoading(false);
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      const data = await apiClient.getEmployeeInvitation(token!);
      setInvitation(data);
    } catch (err: any) {
      console.error('Failed to fetch invitation details:', err);
      setInvitationError(err.response?.data?.message || 'Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AcceptFormData) => {
    if (!token) return;

    try {
      setAccepting(true);

      // Convert phone number if it starts with 0 (Bulgarian format)
      let formattedPhone = data.phone;
      if (formattedPhone && formattedPhone.startsWith('0')) {
        formattedPhone = '+359' + formattedPhone.substring(1);
      }

      const response = await apiClient.acceptEmployeeInvitation(token!, {
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: formattedPhone,
      });

      success(
        'Welcome to the team!',
        `You've successfully joined ${invitation?.shopName}. Redirecting to your dashboard...`
      );

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      error(
        'Failed to accept invitation',
        err.response?.data?.message || 'An unexpected error occurred'
      );
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">
            {invitationError || 'This invitation link is invalid or has expired.'}
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join the Team</h1>
          <p className="text-gray-600">
            You've been invited to join <strong>{String(invitation.shopName || 'Unknown Shop')}</strong>
          </p>
        </div>

        {/* Invitation Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Invitation Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Shop:</span>
              <span className="font-medium">{String(invitation.shopName || 'Unknown Shop')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Invited by:</span>
              <span className="font-medium">{String(invitation.shopOwnerName || 'Unknown Owner')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Your email:</span>
              <span className="font-medium">{String(invitation.email || 'No email')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">
                {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'No expiration'}
              </span>
            </div>
          </div>
        </div>

        {/* Accept Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Complete Your Account</h3>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Password"
              type="password"
              placeholder="Create a secure password"
              icon={<Lock className="w-4 h-4" />}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain uppercase, lowercase, and number',
                },
              })}
              error={errors.password?.message}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              icon={<Lock className="w-4 h-4" />}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              })}
              error={errors.confirmPassword?.message}
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="0888 123 456"
              icon={<Phone className="w-4 h-4" />}
              {...register('phone', {
                pattern: {
                  value: /^(\+359|0)[0-9]{8,9}$/,
                  message: 'Invalid phone number format',
                },
              })}
              error={errors.phone?.message}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={accepting}
              isLoading={accepting}
            >
              {accepting ? 'Joining Team...' : 'Accept Invitation & Join Team'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            By accepting this invitation, you agree to Lunara's{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-700">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeInvitationPage;
