import React, { useState, useEffect } from 'react';
import {
  Globe,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Hash,
  MapPin
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

interface TaxRegistrationFormProps {
  shopId: string;
  shopCountry: string;
  onRegistrationComplete: () => void;
}

interface RegistrationRequirements {
  countryCode: string;
  countryName: string;
  isEuCountry: boolean;
  requiresVatRegistration: boolean;
  supportedTaxCodes: string[];
  requiredFields: {
    vatNumber?: boolean;
    businessRegistrationNumber?: boolean;
    businessAddress?: boolean;
    businessType?: boolean;
    taxNumber?: boolean;
  };
}

const TaxRegistrationForm: React.FC<TaxRegistrationFormProps> = ({
  shopId,
  shopCountry,
  onRegistrationComplete
}) => {
  const [requirements, setRequirements] = useState<RegistrationRequirements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    country: shopCountry,
    vatNumber: '',
    businessRegistrationNumber: '',
    businessType: '',
    taxNumber: '',
    activeFrom: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success, error } = useToast();

  useEffect(() => {
    loadRequirements();
  }, [shopCountry]);

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getTaxRegistrationRequirements(shopCountry);
      setRequirements(response);
      setFormData(prev => ({ ...prev, country: response.countryCode }));
    } catch (err: any) {
      console.error('Error loading tax requirements:', err);
      error('Error', 'Failed to load tax registration requirements');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!requirements) return false;

    // Validate required fields based on country requirements
    if (requirements.requiredFields.vatNumber && !formData.vatNumber.trim()) {
      newErrors.vatNumber = 'VAT number is required';
    }

    if (requirements.requiredFields.businessRegistrationNumber && !formData.businessRegistrationNumber.trim()) {
      newErrors.businessRegistrationNumber = 'Business registration number is required';
    }

    if (requirements.requiredFields.businessType && !formData.businessType.trim()) {
      newErrors.businessType = 'Business type is required';
    }

    if (requirements.requiredFields.taxNumber && !formData.taxNumber.trim()) {
      newErrors.taxNumber = 'Tax number is required';
    }

    if (!formData.activeFrom) {
      newErrors.activeFrom = 'Active from date is required';
    }

    // Validate VAT number format for EU countries
    if (formData.vatNumber && requirements.isEuCountry) {
      const vatRegex = new RegExp(`^${requirements.countryCode}[0-9A-Z]{8,12}$`);
      if (!vatRegex.test(formData.vatNumber.toUpperCase())) {
        newErrors.vatNumber = `Invalid VAT number format for ${requirements.countryName}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const registrationData = {
        ...formData,
        activeFrom: new Date(formData.activeFrom).getTime() / 1000 // Convert to Unix timestamp
      };

      await apiClient.registerShopForTax(shopId, registrationData);
      success('Success', 'Tax registration completed successfully');
      onRegistrationComplete();
    } catch (err: any) {
      console.error('Error registering for tax:', err);
      error('Error', err.response?.data?.message || 'Failed to register for tax');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!requirements) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-900">Requirements Not Available</h4>
            <p className="text-sm text-red-800 mt-1">
              Unable to load tax registration requirements for {shopCountry}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Globe className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Tax Registration</h3>
          <p className="text-sm text-gray-600">
            Register for tax collection in {requirements.countryName}
          </p>
        </div>
      </div>

      {/* Country Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Registration Requirements</h4>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-blue-800">
                Country: {requirements.countryName} ({requirements.countryCode})
              </p>
              {requirements.isEuCountry && (
                <p className="text-sm text-blue-800">
                  EU VAT registration required
                </p>
              )}
              <p className="text-sm text-blue-800">
                Supported tax codes: {requirements.supportedTaxCodes.length} available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* VAT Number */}
        {requirements.requiredFields.vatNumber && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT Number *
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                placeholder={`${requirements.countryCode}123456789`}
                className={`
                  w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  ${errors.vatNumber ? 'border-red-300' : 'border-gray-300'}
                `}
              />
            </div>
            {errors.vatNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.vatNumber}</p>
            )}
          </div>
        )}

        {/* Business Registration Number */}
        {requirements.requiredFields.businessRegistrationNumber && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration Number *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.businessRegistrationNumber}
                onChange={(e) => handleInputChange('businessRegistrationNumber', e.target.value)}
                placeholder="Enter business registration number"
                className={`
                  w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  ${errors.businessRegistrationNumber ? 'border-red-300' : 'border-gray-300'}
                `}
              />
            </div>
            {errors.businessRegistrationNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.businessRegistrationNumber}</p>
            )}
          </div>
        )}

        {/* Business Type */}
        {requirements.requiredFields.businessType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type *
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => handleInputChange('businessType', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                ${errors.businessType ? 'border-red-300' : 'border-gray-300'}
              `}
            >
              <option value="">Select business type</option>
              <option value="individual">Individual/Sole Proprietor</option>
              <option value="company">Company/Corporation</option>
              <option value="partnership">Partnership</option>
              <option value="non_profit">Non-Profit Organization</option>
            </select>
            {errors.businessType && (
              <p className="text-sm text-red-600 mt-1">{errors.businessType}</p>
            )}
          </div>
        )}

        {/* Tax Number */}
        {requirements.requiredFields.taxNumber && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Number *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                placeholder="Enter tax number"
                className={`
                  w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  ${errors.taxNumber ? 'border-red-300' : 'border-gray-300'}
                `}
              />
            </div>
            {errors.taxNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.taxNumber}</p>
            )}
          </div>
        )}

        {/* Active From Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Active From Date *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={formData.activeFrom}
              onChange={(e) => handleInputChange('activeFrom', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`
                w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                ${errors.activeFrom ? 'border-red-300' : 'border-gray-300'}
              `}
            />
          </div>
          {errors.activeFrom && (
            <p className="text-sm text-red-600 mt-1">{errors.activeFrom}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Date when tax registration becomes active
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Register for Tax Collection
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaxRegistrationForm;
