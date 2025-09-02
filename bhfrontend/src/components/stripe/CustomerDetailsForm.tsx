import React, { useState, useEffect } from 'react';
import { 
  User,
  Mail,
  MapPin,
  ArrowLeft,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useForm } from 'react-hook-form';
import { validateEmail } from '../../lib/utils';

interface Plan {
  id: string;
  displayName: string;
  formattedPrice: string;
  interval: string;
  description: string;
  features?: string[];
  isYearly?: boolean;
  savings?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface CustomerDetailsFormProps {
  initialCustomerInfo: CustomerInfo;
  selectedPlan: Plan;
  onComplete: (customerInfo: CustomerInfo) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  initialCustomerInfo,
  selectedPlan,
  onComplete,
  onBack,
  isProcessing = false
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(initialCustomerInfo);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!customerInfo.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    // Validate email
    if (!customerInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(customerInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate billing address
    if (!customerInfo.billingAddress.line1.trim()) {
      newErrors.line1 = 'Address line 1 is required';
    }

    if (!customerInfo.billingAddress.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!customerInfo.billingAddress.state.trim()) {
      newErrors.state = 'State/Province is required';
    }

    if (!customerInfo.billingAddress.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    if (!customerInfo.billingAddress.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onComplete(customerInfo);
    }
  };

  const updateCustomerInfo = (field: string, value: string) => {
    if (field.startsWith('billingAddress.')) {
      const addressField = field.replace('billingAddress.', '');
      setCustomerInfo(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [addressField]: value
        }
      }));
    } else {
      setCustomerInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field] || errors[field.replace('billingAddress.', '')]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        delete newErrors[field.replace('billingAddress.', '')];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Customer Details
        </h2>
        <p className="text-gray-600">
          Please provide your billing information for the subscription
        </p>
      </div>

      {/* Selected Plan Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-indigo-900">
              Selected Plan: {selectedPlan.displayName}
            </h3>
            <p className="text-sm text-indigo-700">
              {selectedPlan.formattedPrice}/{selectedPlan.interval}
            </p>
          </div>
          {selectedPlan.savings && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              {selectedPlan.savings}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Customer Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={customerInfo.name}
                onChange={(e) => updateCustomerInfo('name', e.target.value)}
                placeholder="Enter your full name"
                error={errors.name}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={customerInfo.email}
                onChange={(e) => updateCustomerInfo('email', e.target.value)}
                placeholder="Enter your email address"
                error={errors.email}
                required
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Billing Address
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 *
              </label>
              <Input
                type="text"
                value={customerInfo.billingAddress.line1}
                onChange={(e) => updateCustomerInfo('billingAddress.line1', e.target.value)}
                placeholder="Street address"
                error={errors.line1}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <Input
                type="text"
                value={customerInfo.billingAddress.line2 || ''}
                onChange={(e) => updateCustomerInfo('billingAddress.line2', e.target.value)}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <Input
                  type="text"
                  value={customerInfo.billingAddress.city}
                  onChange={(e) => updateCustomerInfo('billingAddress.city', e.target.value)}
                  placeholder="City"
                  error={errors.city}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province *
                </label>
                <Input
                  type="text"
                  value={customerInfo.billingAddress.state}
                  onChange={(e) => updateCustomerInfo('billingAddress.state', e.target.value)}
                  placeholder="State/Province"
                  error={errors.state}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code *
                </label>
                <Input
                  type="text"
                  value={customerInfo.billingAddress.postal_code}
                  onChange={(e) => updateCustomerInfo('billingAddress.postal_code', e.target.value)}
                  placeholder="Postal code"
                  error={errors.postal_code}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                value={customerInfo.billingAddress.country}
                onChange={(e) => updateCustomerInfo('billingAddress.country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="BG">Bulgaria</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="IT">Italy</option>
                <option value="ES">Spain</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Plans
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isProcessing}
            isLoading={isProcessing}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {isProcessing ? 'Setting up Payment...' : 'Continue to Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomerDetailsForm;
