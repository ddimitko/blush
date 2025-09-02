import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Star,
  DollarSign,
  Save,
  Edit3,
  Building2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

interface EmployeeProfileForm {
  bio: string;
  specialties: string;
  yearsExperience: number;
  hourlyRate: number;
  commissionRate: number;
}

// Mock employee data - replace with actual API calls
const mockEmployeeData = {
  id: '1',
  fullName: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+359888123456',
  bio: 'Experienced beauty specialist with a passion for helping clients look and feel their best. Specialized in advanced skincare treatments and makeup artistry.',
  specialties: 'Facial treatments, Anti-aging, Makeup artistry, Skincare consultation',
  yearsExperience: 5,
  hourlyRate: 45.00,
  commissionRate: 15.00,
  hireDate: '2023-01-15',
  active: true,
  shop: {
    id: '1',
    name: 'Bella Beauty Salon',
    address: '123 Beauty Street, Sofia'
  }
};

const EmployeeProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<EmployeeProfileForm>();

  // Mock employee data
  const employeeData = mockEmployeeData;

  useEffect(() => {
    if (employeeData) {
      reset({
        bio: employeeData.bio || '',
        specialties: employeeData.specialties || '',
        yearsExperience: employeeData.yearsExperience || 0,
        hourlyRate: employeeData.hourlyRate || 0,
        commissionRate: employeeData.commissionRate || 0
      });
    }
  }, [employeeData, reset]);

  const onSubmit = async (data: EmployeeProfileForm) => {
    setIsSaving(true);
    try {
      // API call to update employee profile
      if (process.env.NODE_ENV === 'development') {
        console.log('Updating employee profile:', data);
        // Simulate API call in development
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // TODO: Replace with actual API call when backend endpoint is ready
        // await apiClient.updateEmployeeProfile(employeeData.id, data);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    reset({
      bio: employeeData.bio || '',
      specialties: employeeData.specialties || '',
      yearsExperience: employeeData.yearsExperience || 0,
      hourlyRate: employeeData.hourlyRate || 0,
      commissionRate: employeeData.commissionRate || 0
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <EmptyState
          variant="general"
          title="Employee profile not found"
          description="Unable to load your employee profile. Please contact your shop owner."
          action={{
            label: 'Go to Dashboard',
            onClick: () => navigate('/employee/dashboard'),
            variant: 'primary'
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/employee/dashboard')}
              >
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Profile</h1>
                <p className="text-gray-600">Manage your professional information</p>
              </div>
            </div>
            
            {!isEditing && (
              <Button
                variant="outline"
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information (Read-only) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{employeeData.fullName}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{employeeData.email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{employeeData.phone}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop
                </label>
                <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Building2 className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">{employeeData.shop.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information (Editable) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
            <div className="space-y-6">
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    {...register('bio', {
                      maxLength: {
                        value: 500,
                        message: 'Bio must be less than 500 characters'
                      }
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    placeholder="Tell clients about your experience and expertise..."
                  />
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900">{employeeData.bio || 'No bio provided'}</p>
                  </div>
                )}
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                )}
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialties
                </label>
                {isEditing ? (
                  <Input
                    {...register('specialties')}
                    placeholder="e.g., Facial treatments, Makeup artistry, Skincare"
                    error={errors.specialties?.message}
                  />
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900">{employeeData.specialties || 'No specialties listed'}</p>
                  </div>
                )}
              </div>

              {/* Experience and Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...register('yearsExperience', {
                        min: { value: 0, message: 'Experience cannot be negative' },
                        max: { value: 50, message: 'Experience cannot exceed 50 years' }
                      })}
                      icon={<Briefcase className="w-4 h-4" />}
                      error={errors.yearsExperience?.message}
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <Briefcase className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{employeeData.yearsExperience} years</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (BGN)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      {...register('hourlyRate', {
                        min: { value: 0, message: 'Rate cannot be negative' }
                      })}
                      icon={<DollarSign className="w-4 h-4" />}
                      error={errors.hourlyRate?.message}
                      disabled={!isEditing}
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{employeeData.hourlyRate} BGN</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Rate (%)
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      {...register('commissionRate', {
                        min: { value: 0, message: 'Commission cannot be negative' },
                        max: { value: 100, message: 'Commission cannot exceed 100%' }
                      })}
                      icon={<Star className="w-4 h-4" />}
                      error={errors.commissionRate?.message}
                      disabled={!isEditing}
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <Star className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{employeeData.commissionRate}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
