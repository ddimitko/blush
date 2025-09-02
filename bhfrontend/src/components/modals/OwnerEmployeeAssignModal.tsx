import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserCheck, Calendar, DollarSign, User } from 'lucide-react';
import { EmployeeCreationRequest } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SpecialtiesInput from '../ui/SpecialtiesInput';

interface OwnerEmployeeAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<EmployeeCreationRequest, 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'phone'>) => Promise<void>;
  shopId: string;
  isLoading?: boolean;
}

interface AssignFormData {
  bio: string;
  specialties: string;
  yearsExperience: number;
  hourlyRate: number;
  commissionRate: number;
}

const OwnerEmployeeAssignModal: React.FC<OwnerEmployeeAssignModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
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
  } = useForm<AssignFormData>({
    defaultValues: {
      bio: '',
      specialties: '',
      yearsExperience: 0,
      hourlyRate: 0,
      commissionRate: 0,
    },
  });

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: AssignFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const employeeData = {
        bio: data.bio.trim(),
        specialties: data.specialties.trim(),
        yearsExperience: Number(data.yearsExperience),
        hourlyRate: Number(data.hourlyRate),
        commissionRate: Number(data.commissionRate),
      };

      await onSubmit(employeeData);
      
      success(
        'Successfully assigned as employee!',
        'You can now be booked for appointments and manage your employee profile.'
      );
      
      handleClose();
    } catch (err: any) {
      console.error('Owner assignment error:', err);
      error(
        'Assignment failed',
        err?.response?.data?.message || err?.message || 'Failed to assign yourself as employee'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Yourself as Employee"
      size="lg"
    >
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Become an employee at your own shop
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                This will allow customers to book appointments with you directly. You'll maintain all owner privileges while also being able to work as an employee.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-none"
            rows={3}
            placeholder="Tell customers about yourself and your expertise..."
            {...register('bio')}
          />
        </div>

        {/* Specialties */}
        <div>
          <SpecialtiesInput
            label="Specialties"
            placeholder="e.g., Hair Styling, Color Correction, Bridal Makeup"
            value={watch('specialties') || ''}
            onChange={(value) => setValue('specialties', value)}
            error={errors.specialties?.message}
          />
          <input
            type="hidden"
            {...register('specialties')}
          />
        </div>

        {/* Experience and Rates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Years of Experience"
            type="number"
            min="0"
            max="50"
            placeholder="0"
            icon={<Calendar className="w-4 h-4" />}
            {...register('yearsExperience', {
              min: { value: 0, message: 'Experience cannot be negative' },
              max: { value: 50, message: 'Experience cannot exceed 50 years' },
            })}
            error={errors.yearsExperience?.message}
          />

          <Input
            label="Hourly Rate (BGN)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            icon={<DollarSign className="w-4 h-4" />}
            {...register('hourlyRate', {
              min: { value: 0, message: 'Rate cannot be negative' },
            })}
            error={errors.hourlyRate?.message}
          />

          <Input
            label="Commission Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
            icon={<DollarSign className="w-4 h-4" />}
            {...register('commissionRate', {
              min: { value: 0, message: 'Commission cannot be negative' },
              max: { value: 100, message: 'Commission cannot exceed 100%' },
            })}
            error={errors.commissionRate?.message}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isLoading}
            icon={<UserCheck className="w-4 h-4" />}
          >
            {isSubmitting ? 'Assigning...' : 'Assign as Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OwnerEmployeeAssignModal;
