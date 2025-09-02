import React from 'react';
import { User, Mail, Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { validateEmail, validatePhone } from '../../lib/utils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PhoneInput from '../ui/PhoneInput';

interface CustomerData {
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
}

interface CustomerDetailsProps {
  customerData: CustomerData;
  onCustomerDataChange: (data: CustomerData) => void;
  onNext: () => void;
  isAuthenticated: boolean;
  onBack?: () => void;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customerData,
  onCustomerDataChange,
  onNext,
  isAuthenticated,
  onBack,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CustomerData>({
    defaultValues: customerData,
  });

  const watchedData = watch();

  // Update parent state when form data changes (debounced to prevent infinite loops)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      onCustomerDataChange(watchedData);
    }, 50); // Faster response time

    return () => clearTimeout(timeoutId);
  }, [
    watchedData.customerFirstName,
    watchedData.customerLastName,
    watchedData.customerEmail,
    watchedData.customerPhone,
    watchedData.notes,
    onCustomerDataChange
  ]);

  const onSubmit = (data: CustomerData) => {
    onCustomerDataChange(data);
    onNext();
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Arrow Left Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-neutral-600 hover:text-accent-600 mb-6 transition-colors duration-300 group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium">Back</span>
        </button>
      )}

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-accent-100 rounded-lg mr-3">
            <User className="h-6 w-6 text-accent-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-neutral-800">
              Contact Information
            </h3>
            <p className="text-neutral-600 text-sm">
              We'll use these details for your appointment
            </p>
          </div>
        </div>
        <p className="text-neutral-600">
          Please provide your contact details so we can confirm your appointment and send you updates
        </p>
      </div>

      {isAuthenticated && (
        <div className="mb-8 p-6 bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 rounded-2xl">
          <div className="flex items-center">
            <div className="p-2 bg-accent-200 rounded-lg mr-3">
              <User className="h-5 w-5 text-accent-700" />
            </div>
            <div>
              <p className="text-accent-800 font-medium">
                Signed in successfully
              </p>
              <p className="text-accent-700 text-sm">
                Your information has been pre-filled. You can modify it below if needed.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative group">
            <Input
              label="First Name"
              {...register('customerFirstName', {
                required: 'First name is required',
                minLength: {
                  value: 2,
                  message: 'First name must be at least 2 characters',
                },
              })}
              error={errors.customerFirstName?.message}
              placeholder="Enter your first name"
              className="pl-12 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg"
              autoComplete="given-name"
            />
            <User className="absolute left-4 top-9 h-5 w-5 text-accent-400 group-focus-within:text-accent-600 transition-colors duration-300" />
          </div>

          <div className="relative">
            <Input
              label="Last Name"
              {...register('customerLastName', {
                required: 'Last name is required',
                minLength: {
                  value: 2,
                  message: 'Last name must be at least 2 characters',
                },
              })}
              error={errors.customerLastName?.message}
              placeholder="Enter your last name"
              className="pl-10 transition-all duration-200 focus:scale-[1.02]"
              autoComplete="family-name"
            />
            <User className="absolute left-3 top-8 h-4 w-4 text-gray-400 transition-colors duration-200" />
          </div>
        </div>
        
        {/* Email */}
        <div className="relative">
          <Input
            label="Email Address"
            type="email"
            {...register('customerEmail', {
              required: 'Email is required',
              validate: (value) => {
                if (!validateEmail(value)) {
                  return 'Please enter a valid email address';
                }
                return true;
              },
            })}
            error={errors.customerEmail?.message}
            placeholder="your.email@example.com"
            className="pl-10 transition-all duration-200 focus:scale-[1.02]"
            autoComplete="email"
          />
          <Mail className="absolute left-3 top-8 h-4 w-4 text-gray-400 transition-colors duration-200" />
        </div>
        
        {/* Phone Number */}
        <div>
          <PhoneInput
            label="Phone Number"
            placeholder="Enter phone number"
            defaultCountry="BG"
            required
            value={watch('customerPhone') || ''}
            onChange={(value) => setValue('customerPhone', value)}
            error={errors.customerPhone?.message}
          />
          <input
            type="hidden"
            {...register('customerPhone', {
              required: 'Phone number is required',
            })}
          />
        </div>
        
        {/* Special Notes */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requests or Notes
            <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="Any special requests, allergies, or preferences..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none transition-all duration-200 focus:scale-[1.02]"
            />
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Let us know about any allergies, preferences, or special requests.
          </p>
        </div>
        
        {/* Privacy Notice */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Privacy & Communication
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• We'll send appointment confirmations to your email</li>
            <li>• SMS reminders will be sent to your phone number</li>
            <li>• Your information is kept secure and never shared</li>
            <li>• You can opt out of communications at any time</li>
          </ul>
        </div>
        
        {/* Continue Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={!watchedData.customerFirstName || !watchedData.customerLastName || !watchedData.customerEmail || !watchedData.customerPhone}
            className="min-w-[200px] transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
          >
            Continue to Payment
          </Button>
        </div>
      </form>
      
      {/* Guest Booking Notice */}
      {!isAuthenticated && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Booking as Guest
          </h4>
          <p className="text-sm text-yellow-700">
            You're booking as a guest. Consider creating an account to easily 
            manage your appointments and get exclusive offers.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
