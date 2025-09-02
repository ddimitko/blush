import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Scissors, DollarSign, Clock, Tag, User, FileText, X, Plus, Users, HelpCircle } from 'lucide-react';
import { Service, Employee, ServiceCreationRequest } from '../../types';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatCurrency } from '../../lib/utils';
import { apiClient } from '../../lib/api';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceCreationRequest) => Promise<void>;
  service?: Service | null;
  employees: Employee[];
  shopId: string;
  shopCountry?: string;
  isLoading?: boolean;
}

interface ServiceFormData {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  employeeIds: string[];
  depositAmount?: number;
  active?: boolean;
  bookingBufferMinutes: number;
}

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  service,
  employees,
  shopId,
  shopCountry,
  isLoading = false,
}) => {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ServiceFormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      durationMinutes: 60,
      category: '',
      employeeIds: [],
      depositAmount: 0,
      active: undefined, // Let backend determine based on employee assignment
      bookingBufferMinutes: 15,
    },
  });

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getServiceCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch service categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Reset form when modal opens/closes or service changes
  useEffect(() => {
    if (isOpen) {
      if (service) {
        // Editing existing service
        reset({
          name: service.name,
          description: service.description || '',
          price: service.price,
          durationMinutes: service.durationMinutes,
          category: service.category || '',
          employeeIds: service.employees?.map(emp => emp.id) || [],
          depositAmount: 0, // Note: depositAmount not in Service interface
          active: service.active,
          bookingBufferMinutes: service.bookingBufferMinutes ?? 15,
        });
      } else {
        // Creating new service
        reset({
          name: '',
          description: '',
          price: 0,
          durationMinutes: 60,
          category: '',
          employeeIds: [],
          depositAmount: 0,
          active: undefined, // Let backend determine based on employee assignment
          bookingBufferMinutes: 15,
        });
      }
    }
  }, [isOpen, service, employees, reset]);

  const watchedPrice = watch('price');
  const watchedDuration = watch('durationMinutes');
  const watchedEmployeeIds = watch('employeeIds');

  // Filter out terminated employees first
  const activeEmployees = employees.filter(emp => emp.active !== false);

  // Get currently assigned employees (only active ones)
  const assignedEmployees = activeEmployees.filter(emp => watchedEmployeeIds?.includes(emp.id));
  const availableEmployees = activeEmployees.filter(emp => !watchedEmployeeIds?.includes(emp.id));

  const handleAddEmployee = (employeeId: string) => {
    const currentIds = watchedEmployeeIds || [];
    setValue('employeeIds', [...currentIds, employeeId]);
  };

  const handleRemoveEmployee = (employeeId: string) => {
    const currentIds = watchedEmployeeIds || [];
    setValue('employeeIds', currentIds.filter(id => id !== employeeId));
  };

  const handleFormSubmit = async (data: ServiceFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const serviceData: ServiceCreationRequest = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        durationMinutes: Number(data.durationMinutes),
        category: data.category.trim(),
        employeeIds: data.employeeIds || [],
        shopId,
        bookingBufferMinutes: Number(data.bookingBufferMinutes),
        // Don't send active field for new services - let backend determine based on employees
        // For existing services, preserve the current active state
        ...(service && { active: data.active }),
      };

      await onSubmit(serviceData);
      
      success(
        service ? 'Service updated!' : 'Service created!',
        service 
          ? 'Your service has been updated successfully.' 
          : 'Your new service is now available for booking.'
      );
      
      onClose();
    } catch (err: any) {
      console.error('Service form error:', err);
      error(
        service ? 'Failed to update service' : 'Failed to create service',
        err.message || 'Please check your information and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add New Service'}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Service Name */}
        <Input
          label="Service Name"
          placeholder="e.g., Haircut & Styling"
          icon={<Scissors className="w-4 h-4" />}
          {...register('name', {
            required: 'Service name is required',
            minLength: {
              value: 2,
              message: 'Service name must be at least 2 characters',
            },
            maxLength: {
              value: 100,
              message: 'Service name must be less than 100 characters',
            },
          })}
          error={errors.name?.message}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            placeholder="Describe your service..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            rows={3}
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'Description must be less than 500 characters',
              },
            })}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Price and Duration Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              icon={<DollarSign className="w-4 h-4" />}
              {...register('price', {
                required: 'Price is required',
                min: {
                  value: 0.01,
                  message: 'Price must be greater than 0',
                },
                max: {
                  value: 10000,
                  message: 'Price must be less than 10,000',
                },
                valueAsNumber: true,
              })}
              error={errors.price?.message}
            />
            {watchedPrice && Number(watchedPrice) > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                {formatCurrency(Number(watchedPrice), shopCountry)}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Duration (minutes)"
              type="number"
              step="1"
              placeholder="60"
              icon={<Clock className="w-4 h-4" />}
              {...register('durationMinutes', {
                required: 'Duration is required',
                min: {
                  value: 5,
                  message: 'Duration must be at least 5 minutes',
                },
                max: {
                  value: 480,
                  message: 'Duration must be less than 8 hours',
                },
                valueAsNumber: true,
                validate: (value) => {
                  const num = Number(value);
                  if (!Number.isInteger(num)) {
                    return 'Duration must be a whole number';
                  }
                  return true;
                },
              })}
              error={errors.durationMinutes?.message}
            />
            {watchedDuration && Number(watchedDuration) > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                {formatDuration(Number(watchedDuration))}
              </p>
            )}
          </div>
        </div>

        {/* Booking Buffer */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Booking Buffer (minutes)
            </label>
            <div className="relative group">
              <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Minimum time before customers can book this service.
                <br />
                Prevents last-minute bookings and gives time for preparation.
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <Input
            type="number"
            step="1"
            placeholder="15"
            icon={<Clock className="w-4 h-4" />}
            {...register('bookingBufferMinutes', {
              required: 'Booking buffer is required',
              min: {
                value: 0,
                message: 'Booking buffer must be at least 0 minutes',
              },
              max: {
                value: 120,
                message: 'Booking buffer must be less than 2 hours',
              },
              valueAsNumber: true,
              validate: (value) => {
                const num = Number(value);
                if (!Number.isInteger(num)) {
                  return 'Booking buffer must be a whole number';
                }
                return true;
              },
            })}
            error={errors.bookingBufferMinutes?.message}
          />
          <p className="mt-1 text-xs text-gray-500">
            Customers cannot book this service within {watch('bookingBufferMinutes') || 15} minutes of the current time.
          </p>
        </div>

        {/* Category and Employee Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                {...register('category', {
                  required: 'Please select a category',
                })}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Users className="w-4 h-4 inline mr-2" />
              Assigned Employees
            </label>

            {employees.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No employees available</p>
            ) : (
              <div className="space-y-3">
                {/* Currently Assigned Employees */}
                {assignedEmployees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Currently Assigned ({assignedEmployees.length})</p>
                    <div className="space-y-2">
                      {assignedEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-sm font-medium text-blue-900">
                            {employee.name || employee.fullName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmployee(employee.id)}
                            className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove employee"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Employees to Add */}
                {availableEmployees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Available to Add ({availableEmployees.length})</p>
                    <div className="space-y-2">
                      {availableEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-sm text-gray-700">
                            {employee.name || employee.fullName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddEmployee(employee.id)}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Add employee"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignedEmployees.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ No employees assigned. This service will be inactive and not visible to customers.
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Only assigned employees can perform this service. Add employees to make the service bookable.
            </p>
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
            loadingText={service ? 'Updating...' : 'Creating...'}
            icon={<Scissors className="w-4 h-4" />}
          >
            {service ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ServiceFormModal;
