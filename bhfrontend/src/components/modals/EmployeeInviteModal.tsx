import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Calendar, DollarSign, UserPlus, CheckCircle, XCircle, User } from 'lucide-react';
import { EmployeeInvitationRequest } from '../../types';
import { apiClient } from '../../lib/api';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SpecialtiesInput from '../ui/SpecialtiesInput';

interface EmployeeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeInvitationRequest) => Promise<void>;
  shopId: string;
  isLoading?: boolean;
}

interface InviteFormData {
  email: string;
  bio: string;
  specialties: string;
  yearsExperience: number;
  hourlyRate: number;
  commissionRate: number;
}

const EmployeeInviteModal: React.FC<EmployeeInviteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shopId,
  isLoading = false,
}) => {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState<{
    checking: boolean;
    exists: boolean | null;
    firstName?: string;
    lastName?: string;
  }>({ checking: false, exists: null });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      bio: '',
      specialties: '',
      yearsExperience: 0,
      hourlyRate: 0,
      commissionRate: 0,
    },
  });

  const emailValue = watch('email');

  // Real-time email checking with debounce
  useEffect(() => {
    if (!emailValue || emailValue.length < 3) {
      setEmailCheckStatus({ checking: false, exists: null });
      return;
    }

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(emailValue)) {
      setEmailCheckStatus({ checking: false, exists: null });
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setEmailCheckStatus({ checking: true, exists: null });
        const response = await apiClient.checkEmailExists(emailValue);
        setEmailCheckStatus({
          checking: false,
          exists: response.exists,
          firstName: response.firstName,
          lastName: response.lastName,
        });
      } catch (err) {
        setEmailCheckStatus({ checking: false, exists: null });
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [emailValue]);

  const handleFormSubmit = async (data: InviteFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const inviteData: EmployeeInvitationRequest = {
        email: data.email.trim().toLowerCase(),
        bio: data.bio.trim(),
        specialties: data.specialties.trim(),
        yearsExperience: Number(data.yearsExperience),
        hourlyRate: Number(data.hourlyRate),
        commissionRate: Number(data.commissionRate),
      };

      await onSubmit(inviteData);
      
      const userName = emailCheckStatus.exists && emailCheckStatus.firstName && emailCheckStatus.lastName
        ? `${emailCheckStatus.firstName} ${emailCheckStatus.lastName}`
        : data.email;

      success(
        'Invitation sent!',
        `An invitation has been sent to ${userName} to join your team.`
      );
      
      reset();
      onClose();
    } catch (err: any) {
      console.error('Employee invite error:', err);
      error(
        'Failed to send invitation',
        err.message || 'Please check the email address and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Employee"
      size="lg"
    >
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <UserPlus className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Invite someone to join your team
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Enter their email address and optional employee details. The system will automatically detect if they have an existing account.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Email with real-time checking */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              icon={<Mail className="w-4 h-4" />}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={errors.email?.message}
            />

            {/* Status indicator overlay */}
            <div className="absolute right-3 top-9 transform -translate-y-1/2">
              {emailCheckStatus.checking ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : emailCheckStatus.exists === true ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : emailCheckStatus.exists === false ? (
                <XCircle className="w-4 h-4 text-orange-600" />
              ) : null}
            </div>
          </div>

          {/* User status indicator */}
          {emailCheckStatus.exists === true && emailCheckStatus.firstName && emailCheckStatus.lastName && (
            <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <User className="w-4 h-4" />
              <span>
                <strong>{emailCheckStatus.firstName} {emailCheckStatus.lastName}</strong> will be invited to join your team
              </span>
            </div>
          )}

          {emailCheckStatus.exists === false && (
            <div className="flex items-center space-x-2 text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
              <Mail className="w-4 h-4" />
              <span>
                This user will receive an invitation to create an account and join your team
              </span>
            </div>
          )}
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Employee Details (Optional)
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              placeholder="Tell us about this employee's background and expertise..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              rows={3}
              {...register('bio', {
                maxLength: {
                  value: 500,
                  message: 'Bio must be less than 500 characters',
                },
              })}
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
            )}
          </div>

          <SpecialtiesInput
            label="Specialties"
            placeholder="e.g., Hair Coloring, Manicure, Massage Therapy"
            value={watch('specialties') || ''}
            onChange={(value) => setValue('specialties', value)}
            error={errors.specialties?.message}
            maxLength={200}
          />
          {/* Hidden input for form validation */}
          <input
            type="hidden"
            {...register('specialties', {
              maxLength: {
                value: 200,
                message: 'Specialties must be less than 200 characters',
              },
            })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Years of Experience"
              type="number"
              min="0"
              max="50"
              placeholder="0"
              icon={<Calendar className="w-4 h-4" />}
              {...register('yearsExperience', {
                min: {
                  value: 0,
                  message: 'Experience cannot be negative',
                },
                max: {
                  value: 50,
                  message: 'Experience must be less than 50 years',
                },
              })}
              error={errors.yearsExperience?.message}
            />

            <Input
              label="Hourly Rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              icon={<DollarSign className="w-4 h-4" />}
              {...register('hourlyRate', {
                min: {
                  value: 0,
                  message: 'Rate cannot be negative',
                },
                max: {
                  value: 1000,
                  message: 'Rate must be less than 1000',
                },
              })}
              error={errors.hourlyRate?.message}
            />

            <Input
              label="Commission Rate (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              icon={<DollarSign className="w-4 h-4" />}
              {...register('commissionRate', {
                min: {
                  value: 0,
                  message: 'Commission cannot be negative',
                },
                max: {
                  value: 100,
                  message: 'Commission cannot exceed 100%',
                },
              })}
              error={errors.commissionRate?.message}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText="Sending Invitation..."
            icon={<UserPlus className="w-4 h-4" />}
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeInviteModal;
