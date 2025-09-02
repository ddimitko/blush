import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { Shop, BusinessType } from '../../types';
import { useUpdateShopMutation } from '../../hooks/queries';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { businessTypeOptions } from '../../lib/utils';
import ShopGalleryManager from './ShopGalleryManager';
import LocationPicker from '../maps/LocationPicker';
import { LocationDropdowns } from '../ui/LocationDropdowns';
import { getAddressConfig, getAddressValidationRules } from '../../lib/addressValidation';
import { isValidPostalCode, getPostalCodeLabel, getPostalCodePlaceholder } from '../../lib/validation';

interface ShopSettingsFormProps {
  shop: Shop;
}

interface ShopFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  businessTypes: BusinessType[];
  latitude?: number;
  longitude?: number;
}

const ShopSettingsForm: React.FC<ShopSettingsFormProps> = ({ shop }) => {
  const updateShopMutation = useUpdateShopMutation();
  const { success, error, loading, dismiss } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<BusinessType[]>(shop.businessTypes || []);
  const [currentLatitude, setCurrentLatitude] = useState<number | undefined>(shop.latitude);
  const [currentLongitude, setCurrentLongitude] = useState<number | undefined>(shop.longitude);
  const [currentCountry, setCurrentCountry] = useState<string>(shop.country || 'US');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    clearErrors,
    trigger
  } = useForm<ShopFormData>({
    defaultValues: {
      name: shop.name,
      description: shop.description,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      postalCode: shop.postalCode,
      country: shop.country,
      phone: shop.phone,
      email: shop.email,
      website: shop.website || '',
      businessTypes: shop.businessTypes || [],
      latitude: shop.latitude,
      longitude: shop.longitude
    }
  });

  // Get country-specific address configuration
  const addressConfig = getAddressConfig(currentCountry);

  // Update validation rules when country changes
  useEffect(() => {
    const validationRules = getAddressValidationRules(currentCountry);

    // Re-register fields with new validation rules
    register('address', validationRules.address);
    register('city', validationRules.city);
    register('state', validationRules.state);
    register('postalCode', validationRules.postalCode);
    register('country', validationRules.country);

    // Trigger validation for existing values
    trigger(['address', 'city', 'state', 'postalCode']);
  }, [currentCountry, register, trigger]);

  // Watch address fields for location picker
  const watchedAddress = watch(['address', 'city', 'state', 'postalCode', 'country']);
  const fullAddress = watchedAddress.filter(Boolean).join(', ');

  const handleBusinessTypeToggle = (type: BusinessType) => {
    setSelectedBusinessTypes(prev => {
      const currentTypes = prev || [];
      if (currentTypes.includes(type)) {
        return currentTypes.filter(t => t !== type);
      } else {
        return [...currentTypes, type];
      }
    });
  };

  const handleLocationChange = (latitude: number, longitude: number) => {
    setCurrentLatitude(latitude);
    setCurrentLongitude(longitude);
  };

  const handleCountryChange = (countryCode: string) => {
    setCurrentCountry(countryCode);
    setValue('country', countryCode);

    // Clear state and postal code when country changes
    setValue('state', '');
    setValue('postalCode', '');

    // Clear errors for state and postal code
    clearErrors(['state', 'postalCode']);

    // Trigger validation for country
    trigger('country');
  };

  const handleStateChange = (stateCode: string) => {
    setValue('state', stateCode);
    clearErrors('state');
    trigger('state');
  };

  const handleCityChange = (cityName: string) => {
    setValue('city', cityName);
    clearErrors('city');
    trigger('city');
  };

  const handleAddressChange = (address: string) => {
    setValue('address', address);
    clearErrors('address');
    trigger('address');
  };

  const handlePostalCodeChange = (postalCode: string) => {
    setValue('postalCode', postalCode);
    clearErrors('postalCode');
    trigger('postalCode');
  };

  const onSubmit = async (data: ShopFormData) => {
    try {
      setIsSubmitting(true);

      // Additional client-side validation for address
      const addressErrors: string[] = [];

      if (!isValidPostalCode(data.postalCode, currentCountry)) {
        addressErrors.push(`Invalid ${addressConfig.postalCodeLabel.toLowerCase()} format`);
      }

      if (addressConfig.stateRequired && !data.state.trim()) {
        addressErrors.push(`${addressConfig.stateLabel} is required`);
      }

      if (addressErrors.length > 0) {
        error('Validation Error', addressErrors.join('. '), { duration: 6000 });
        return;
      }

      const updateData = {
        ...data,
        businessTypes: selectedBusinessTypes,
        latitude: currentLatitude,
        longitude: currentLongitude,
        country: currentCountry // Ensure country is set correctly
      };

      // Show loading toast for better UX
      const loadingToastId = loading('Saving Settings', 'Updating your shop information...');

      await updateShopMutation.mutateAsync({ shopId: shop.id, shopData: updateData });

      // Dismiss loading and show success
      dismiss(loadingToastId);
      success('Settings Saved', 'Your shop settings have been updated successfully', {
        duration: 5000,
        action: {
          label: 'View Shop',
          onClick: () => window.open(`/shops/${shop.id}`, '_blank')
        }
      });

      reset(updateData);
      setCurrentCountry(updateData.country);
    } catch (err: any) {
      console.error('Error updating shop:', err);

      // Provide more specific error messages
      let errorMessage = 'Failed to update shop settings. Please try again.';
      if (err.response?.status === 400) {
        errorMessage = 'Invalid shop information. Please check your inputs and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to update this shop.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }

      error('Update Failed', errorMessage, {
        duration: 8000,
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(onSubmit)()
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Shop Name"
          {...register('name', { required: 'Shop name is required' })}
          error={errors.name?.message}
        />

        <Input
          label="Email"
          type="email"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email?.message}
        />

        <Input
          label="Phone"
          type="tel"
          {...register('phone', { required: 'Phone number is required' })}
          error={errors.phone?.message}
        />

        <Input
          label="Website"
          type="url"
          placeholder="https://example.com"
          {...register('website')}
          error={errors.website?.message}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={4}
          className="input resize-none"
          placeholder="Describe your shop and services..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Business Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Business Types
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {businessTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleBusinessTypeToggle(option.value as BusinessType)}
              className={`
                p-3 text-sm font-medium rounded-lg border transition-all duration-200
                ${(selectedBusinessTypes || []).includes(option.value as BusinessType)
                  ? 'bg-accent-50 border-accent-200 text-accent-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
        {(!selectedBusinessTypes || selectedBusinessTypes.length === 0) && (
          <p className="mt-1 text-sm text-red-600">Please select at least one business type</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Address</h3>

        <Input
          label="Street Address"
          value={watch('address')}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="Enter your business address"
          error={errors.address?.message}
          required
        />

        {/* Country, State, City Dropdowns */}
        <LocationDropdowns
          country={currentCountry}
          state={watch('state')}
          city={watch('city')}
          onCountryChange={handleCountryChange}
          onStateChange={handleStateChange}
          onCityChange={handleCityChange}
          errors={{
            country: errors.country?.message,
            state: errors.state?.message,
            city: errors.city?.message
          }}
          required={{
            country: true,
            state: addressConfig.stateRequired,
            city: true
          }}
          allowCustomInput={true}
        />

        {/* Postal Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {addressConfig.postalCodeLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={watch('postalCode')}
              onChange={(e) => handlePostalCodeChange(e.target.value)}
              placeholder={addressConfig.postalCodePlaceholder}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
                errors.postalCode || (watch('postalCode') && !isValidPostalCode(watch('postalCode'), currentCountry))
                  ? 'border-red-500'
                  : 'border-gray-300'
              }`}
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
            )}
            {watch('postalCode') && !isValidPostalCode(watch('postalCode'), currentCountry) && !errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">
                Please enter a valid {addressConfig.postalCodeLabel.toLowerCase()} (e.g., {addressConfig.postalCodePlaceholder})
              </p>
            )}
          </div>
        </div>

        {/* Address validation info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Address Requirements:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-1 space-y-1">
            <li>• Street address must be at least 5 characters</li>
            <li>• City name must be at least 2 characters</li>
            {addressConfig.stateRequired && (
              <li>• {addressConfig.stateLabel} is required for {currentCountry}</li>
            )}
            <li>• {addressConfig.postalCodeLabel} must match the format for {currentCountry}</li>
          </ul>
        </div>
      </div>

      {/* Location Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Location</h3>
        <p className="text-sm text-gray-600">
          Set your shop's precise location to help customers find you easily. This will be displayed on maps and used for location-based searches.
        </p>

        <LocationPicker
          initialLatitude={currentLatitude}
          initialLongitude={currentLongitude}
          address={fullAddress}
          onLocationChange={handleLocationChange}
          height="350px"
        />

        {currentLatitude && currentLongitude && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>Current coordinates:</strong> {currentLatitude.toFixed(6)}, {currentLongitude.toFixed(6)}
          </div>
        )}
      </div>

      {/* Gallery Management */}
      <ShopGalleryManager shop={shop} />

      {/* Submit Button */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={!isDirty || isSubmitting || updateShopMutation.isPending}
        >
          Reset Changes
        </Button>

        <Button
          type="submit"
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          disabled={
            !isDirty ||
            !selectedBusinessTypes ||
            selectedBusinessTypes.length === 0 ||
            isSubmitting ||
            updateShopMutation.isPending ||
            Object.keys(errors).length > 0 ||
            (watch('postalCode') && !isValidPostalCode(watch('postalCode'), currentCountry))
          }
          isLoading={isSubmitting || updateShopMutation.isPending}
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default ShopSettingsForm;
