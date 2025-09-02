import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, DollarSign, Calendar, Lock } from 'lucide-react';
import { Employee, EmployeeCreationRequest } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';
import SpecialtiesInput from '../ui/SpecialtiesInput';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreationRequest) => Promise<void>;
  employee?: Employee | null;
  shopId: string;
  isLoading?: boolean;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  bio: string;
  specialties: string;
  yearsExperience: number;
  hourlyRate: number;
  commissionRate: number;
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  shopId,
  isLoading = false,
}) => {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EmployeeFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      bio: '',
      specialties: '',
      yearsExperience: 0,
      hourlyRate: 0,
      commissionRate: 0,
    },
  });

  // Reset form when modal opens/closes or employee changes
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // Editing existing employee - don't show password fields for editing
        const fullName = employee.fullName || employee.name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        reset({
          firstName,
          lastName,
          email: employee.email || 'No email',
          password: '', // Don't populate password for editing
          confirmPassword: '',
          phone: employee.phone || '',
          bio: employee.bio || '',
          specialties: Array.isArray(employee.specialties)
            ? employee.specialties.join(', ')
            : employee.specialties || '',
          yearsExperience: employee.yearsExperience || 0,
          hourlyRate: employee.hourlyRate || 0,
          commissionRate: employee.commissionRate || 0,
        });
      } else {
        // Creating new employee
        reset({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          bio: '',
          specialties: '',
          yearsExperience: 0,
          hourlyRate: 0,
          commissionRate: 0,
        });
      }
    }
  }, [isOpen, employee, reset]);

  const handleFormSubmit = async (data: EmployeeFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const employeeData: EmployeeCreationRequest = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: data.phone,
        bio: data.bio.trim(),
        specialties: data.specialties.trim(),
        yearsExperience: Number(data.yearsExperience),
        hourlyRate: Number(data.hourlyRate),
        commissionRate: Number(data.commissionRate),
      };

      await onSubmit(employeeData);
      
      success(
        employee ? 'Employee updated!' : 'Employee created!',
        employee 
          ? 'Employee information has been updated successfully.' 
          : 'New employee has been added to your team.'
      );
      
      onClose();
    } catch (err: any) {
      console.error('Employee form error:', err);
      error(
        employee ? 'Failed to update employee' : 'Failed to create employee',
        err.message || 'Please check your information and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add New Employee'}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="Enter first name"
              icon={<User className="w-4 h-4" />}
              {...register('firstName', {
                required: 'First name is required',
                minLength: {
                  value: 1,
                  message: 'First name must be at least 1 character',
                },
                maxLength: {
                  value: 100,
                  message: 'First name must be less than 100 characters',
                },
              })}
              error={errors.firstName?.message}
            />

            <Input
              label="Last Name"
              placeholder="Enter last name"
              icon={<User className="w-4 h-4" />}
              {...register('lastName', {
                required: 'Last name is required',
                minLength: {
                  value: 1,
                  message: 'Last name must be at least 1 character',
                },
                maxLength: {
                  value: 100,
                  message: 'Last name must be less than 100 characters',
                },
              })}
              error={errors.lastName?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="employee@example.com"
              icon={<Mail className="w-4 h-4" />}
              disabled={!!employee} // Disable email editing for existing employees
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={errors.email?.message}
            />

            <div>
              <PhoneInput
                label="Phone"
                placeholder="Enter phone number"
                defaultCountry="BG"
                value={watch('phone') || ''}
                onChange={(value) => setValue('phone', value)}
                error={errors.phone?.message}
              />
              <input
                type="hidden"
                {...register('phone')}
              />
            </div>
          </div>

          {/* Password fields - only show when creating new employee */}
          {!employee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    value === watch('password') || 'Passwords do not match',
                })}
                error={errors.confirmPassword?.message}
              />
            </div>
          )}
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Professional Information
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
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingText={employee ? 'Updating...' : 'Creating...'}
            icon={<User className="w-4 h-4" />}
          >
            {employee ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeFormModal;
