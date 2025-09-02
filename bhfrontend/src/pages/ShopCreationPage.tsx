import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  Store,
  AlertCircle,
  Clock,
  Loader2,
  Lock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCreateShopMutation } from '../hooks/queries';
import { useToast } from '../components/ui/Toast';
import { apiClient } from '../lib/api';
import { BusinessType, User } from '../types';
import { validatePhone } from '../lib/utils';

// Validation helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const isValidWebsite = (website: string): boolean => {
  try {
    const url = new URL(website.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
import { smoothScrollToTop, smoothScrollToForm } from '../lib/smoothNavigation';
import { geocodeAddressWithFallback } from '../lib/locationData';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PhoneInput from '../components/ui/PhoneInput';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ShopCreationPaymentForm from '../components/stripe/ShopCreationPaymentForm';
import { ShopCreationSuccessScreen } from '../components/shop-creation/ShopCreationSuccessScreen';
import { ShopLocationPicker } from '../components/shop/ShopLocationPicker';
import { LocationDropdowns } from '../components/ui/LocationDropdowns';

interface ShopCreationData {
  // Business Details
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  businessTypes: BusinessType[];

  // Geocoding data for proximity search
  latitude?: number;
  longitude?: number;
  useGoogleMapsGeolocation: boolean;

  // Subscription
  selectedPlan?: any;
  customerName: string;
  customerEmail: string;

  // Additional Stripe Customer fields
  customerPhone: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;

  // Terms - changed from checkbox to scroll-based validation
  hasScrolledToEnd: boolean;
}

const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string; description: string }[] = [
  { value: 'HAIRDRESSER', label: 'Hairdresser', description: 'Hair cutting, styling, and treatments' },
  { value: 'NAIL_STYLIST', label: 'Nail Stylist', description: 'Manicures, pedicures, and nail art' },
  { value: 'SPA', label: 'Spa', description: 'Full-service spa and wellness treatments' },
  { value: 'BARBER', label: 'Barber', description: 'Traditional barbering services' },
  { value: 'BEAUTY_SALON', label: 'Beauty Salon', description: 'Comprehensive beauty services' },
  { value: 'MASSAGE', label: 'Massage', description: 'Therapeutic and relaxation massage' },
  { value: 'SKINCARE_CLINIC', label: 'Skincare Clinic', description: 'Facial treatments and skincare services' },
  { value: 'MAKEUP_ARTIST', label: 'Makeup Artist', description: 'Professional makeup services' },
  { value: 'EYEBROW_THREADING', label: 'Eyebrow Threading', description: 'Eyebrow shaping and threading' },
  { value: 'TATTOO_PARLOR', label: 'Tattoo Parlor', description: 'Tattoo and body art services' },
  { value: 'WELLNESS_CENTER', label: 'Wellness Center', description: 'Holistic wellness and health services' },
  { value: 'LASH_EXTENSIONS', label: 'Lash Extensions', description: 'Eyelash extension services' },
  { value: 'MICROBLADING', label: 'Microblading', description: 'Eyebrow microblading services' },
  { value: 'PERMANENT_MAKEUP', label: 'Permanent Makeup', description: 'Permanent makeup services' },
  { value: 'WAXING_SALON', label: 'Waxing Salon', description: 'Hair removal and waxing services' }
];

interface CountryConfig {
  code: string;
  name: string;
  hasStates: boolean;
  stateLabel: string;
  postalCodeLabel: string;
  postalCodePattern?: string;
  postalCodePlaceholder: string;
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'ZIP Code',
    postalCodePattern: '^[0-9]{5}(-[0-9]{4})?$',
    postalCodePlaceholder: '12345 or 12345-6789'
  },
  {
    code: 'CA',
    name: 'Canada',
    hasStates: true,
    stateLabel: 'Province',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]$',
    postalCodePlaceholder: 'A1A 1A1'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    hasStates: false,
    stateLabel: 'County',
    postalCodeLabel: 'Postcode',
    postalCodePattern: '^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]? [0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$',
    postalCodePlaceholder: 'SW1A 1AA'
  },
  {
    code: 'AU',
    name: 'Australia',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'Postcode',
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '2000'
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[0-9]{4}$',
    postalCodePlaceholder: '1000'
  },
  {
    code: 'DE',
    name: 'Germany',
    hasStates: true,
    stateLabel: 'State',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '10115'
  },
  {
    code: 'FR',
    name: 'France',
    hasStates: false,
    stateLabel: 'Region',
    postalCodeLabel: 'Postal Code',
    postalCodePattern: '^[0-9]{5}$',
    postalCodePlaceholder: '75001'
  }
];

const ShopCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshToken } = useAuth();
  const { success, error } = useToast();

  // Debug component mounting and smooth scroll to top
  useEffect(() => {
    console.log('🔄 ShopCreationPage component mounted/re-rendered', {
      currentStep,
      showSuccessScreen,
      userId: user?.id
    });

    // Smooth scroll to top when component mounts
    smoothScrollToTop();

    return () => {
      console.log('🔄 ShopCreationPage component unmounting');
    };
  }, []);

  // React Query mutation for shop creation
  const createShopMutation = useCreateShopMutation();

  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Debug showSuccessScreen state changes
  useEffect(() => {
    console.log('🎯 showSuccessScreen state changed to:', showSuccessScreen);
  }, [showSuccessScreen]);

  // Use mutation loading state
  const isLoading = createShopMutation.isPending;

  const [formData, setFormData] = useState<ShopCreationData>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: user?.email || '',
    website: '',
    businessTypes: [],
    useGoogleMapsGeolocation: false,
    customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'US',
    hasScrolledToEnd: false
  });

  // Get current country configuration
  const currentCountryConfig = COUNTRY_CONFIGS.find(c => c.code === formData.country) || COUNTRY_CONFIGS[0];

  // Get billing country configuration
  const currentBillingCountryConfig = COUNTRY_CONFIGS.find(c => c.code === formData.billingCountry) || COUNTRY_CONFIGS[0];

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if all required fields for step 2 are populated
  const isStep2Complete = (): boolean => {
    const requiredFields = [
      formData.name.trim(),
      formData.description.trim(),
      formData.address.trim(),
      formData.city.trim(),
      formData.postalCode.trim(),
      formData.phone.trim(),
      formData.email.trim()
    ];

    // Check if state is required for the current country
    if (currentCountryConfig.hasStates) {
      requiredFields.push(formData.state.trim());
    }

    // Check if all required fields are filled and business types are selected
    return requiredFields.every(field => field.length > 0) &&
           formData.businessTypes.length > 0 &&
           isValidEmail(formData.email) &&
           validatePhone(formData.phone) &&
           (formData.website.trim() === '' || isValidWebsite(formData.website));
  };

  // Check if all required fields for step 3 (subscription) are populated
  const isStep3Complete = (): boolean => {
    // Check if plan is selected
    if (!formData.selectedPlan) {
      return false;
    }

    // Check basic required billing fields
    const basicRequiredFields = [
      formData.customerName.trim(),
      formData.customerEmail.trim(),
      formData.billingAddressLine1.trim(),
      formData.billingCity.trim(),
      formData.billingPostalCode.trim(),
      formData.billingCountry.trim()
    ];

    // Check if basic required fields are filled
    const basicFieldsFilled = basicRequiredFields.every(field => field.length > 0);

    // Check country-specific state requirement
    const stateRequired = currentBillingCountryConfig.hasStates && formData.billingState.trim().length > 0;
    const stateValid = !currentBillingCountryConfig.hasStates || stateRequired;

    // Check email format validation
    const emailValid = isValidEmail(formData.customerEmail);

    // Check phone validation (if provided)
    const phoneValid = formData.customerPhone.trim() === '' || validatePhone(formData.customerPhone);

    return basicFieldsFilled && stateValid && emailValid && phoneValid;
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const steps = [
    { number: 1, title: 'Terms & Conditions', icon: <FileText className="w-5 h-5" /> },
    { number: 2, title: 'Business Details', icon: <Building2 className="w-5 h-5" /> },
    { number: 3, title: 'Subscription Plan', icon: <CreditCard className="w-5 h-5" /> },
    { number: 4, title: 'Summary & Payment', icon: <CreditCard className="w-5 h-5" /> }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.hasScrolledToEnd) {
          newErrors.terms = 'You must read the terms and conditions to the end to continue';
        }
        break;

      case 2:
        // Business name validation
        if (!formData.name.trim()) {
          newErrors.name = 'Business name is required';
        } else if (formData.name.trim().length < 2) {
          newErrors.name = 'Business name must be at least 2 characters long';
        }

        // Description validation
        if (!formData.description.trim()) {
          newErrors.description = 'Business description is required';
        } else if (formData.description.trim().length < 10) {
          newErrors.description = 'Description must be at least 10 characters long';
        }

        // Address validation
        if (!formData.address.trim()) newErrors.address = 'Business address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';

        // State validation (country-specific)
        if (currentCountryConfig.hasStates && !formData.state.trim()) {
          newErrors.state = `${currentCountryConfig.stateLabel} is required`;
        }

        // Postal code validation
        if (!formData.postalCode.trim()) {
          newErrors.postalCode = `${currentCountryConfig.postalCodeLabel} is required`;
        } else if (currentCountryConfig.postalCodePattern) {
          const pattern = new RegExp(currentCountryConfig.postalCodePattern);
          if (!pattern.test(formData.postalCode)) {
            newErrors.postalCode = `Please enter a valid ${currentCountryConfig.postalCodeLabel.toLowerCase()}`;
          }
        }

        // Phone validation
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(formData.phone)) {
          newErrors.phone = 'Please enter a valid phone number (e.g., +1234567890)';
        }

        // Email validation
        if (!formData.email.trim()) {
          newErrors.email = 'Email address is required';
        } else if (!isValidEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        // Website validation (optional but if provided, must be valid)
        if (formData.website.trim() && !isValidWebsite(formData.website)) {
          newErrors.website = 'Please enter a valid website URL (e.g., https://example.com)';
        }

        // Business types validation
        if (formData.businessTypes.length === 0) {
          newErrors.businessTypes = 'Select at least one business type';
        }
        break;

      case 3:
        // Subscription plan validation (now mandatory)
        if (!formData.selectedPlan) {
          newErrors.plan = 'Please select a subscription plan';
        }

        // Customer name validation
        if (!formData.customerName.trim()) {
          newErrors.customerName = 'Customer name is required';
        } else if (formData.customerName.trim().length < 2) {
          newErrors.customerName = 'Customer name must be at least 2 characters long';
        }

        // Customer email validation
        if (!formData.customerEmail.trim()) {
          newErrors.customerEmail = 'Customer email is required';
        } else if (!isValidEmail(formData.customerEmail)) {
          newErrors.customerEmail = 'Please enter a valid email address';
        }

        // Phone validation (optional but if provided, must be valid)
        if (formData.customerPhone.trim() && !validatePhone(formData.customerPhone)) {
          newErrors.customerPhone = 'Please enter a valid phone number';
        }

        // Billing address validation
        if (!formData.billingAddressLine1.trim()) {
          newErrors.billingAddressLine1 = 'Billing address is required';
        } else if (formData.billingAddressLine1.trim().length < 5) {
          newErrors.billingAddressLine1 = 'Please enter a complete address';
        }

        // Billing city validation
        if (!formData.billingCity.trim()) {
          newErrors.billingCity = 'Billing city is required';
        } else if (formData.billingCity.trim().length < 2) {
          newErrors.billingCity = 'City name must be at least 2 characters long';
        }

        // Billing state validation (country-specific)
        if (currentBillingCountryConfig.hasStates && !formData.billingState.trim()) {
          newErrors.billingState = `${currentBillingCountryConfig.stateLabel} is required`;
        }

        // Billing postal code validation
        if (!formData.billingPostalCode.trim()) {
          newErrors.billingPostalCode = `${currentBillingCountryConfig.postalCodeLabel} is required`;
        } else if (currentBillingCountryConfig.postalCodePattern) {
          const pattern = new RegExp(currentBillingCountryConfig.postalCodePattern);
          if (!pattern.test(formData.billingPostalCode.trim())) {
            newErrors.billingPostalCode = `Please enter a valid ${currentBillingCountryConfig.postalCodeLabel.toLowerCase()} (e.g., ${currentBillingCountryConfig.postalCodePlaceholder})`;
          }
        }

        // Billing country validation
        if (!formData.billingCountry.trim()) {
          newErrors.billingCountry = 'Billing country is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        // Load subscription plans when moving from business details to subscription step
        loadSubscriptionPlans();
        smoothScrollToForm('.shop-creation-form');
        setCurrentStep(3);
      } else if (currentStep === 3) {
        // Move to payment step
        smoothScrollToForm('.shop-creation-form');
        setCurrentStep(4);
      } else if (currentStep < steps.length) {
        smoothScrollToForm('.shop-creation-form');
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      smoothScrollToForm('.shop-creation-form');
      setCurrentStep(currentStep - 1);
    }
  };

  const loadSubscriptionPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const plans = await apiClient.getSubscriptionPlans();
      setSubscriptionPlans(plans);
    } catch (err: any) {
      error('Failed to load subscription plans', 'Please try again later.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Geocode address for proximity search using enhanced geocoding with fallbacks
  const geocodeAddress = async (): Promise<{ latitude?: number; longitude?: number }> => {
    try {
      // Use the enhanced geocoding function with city fallbacks
      const coordinates = await geocodeAddressWithFallback(
        formData.address,
        formData.city,
        formData.state,
        formData.country
      );

      if (coordinates) {
        return {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        };
      }
    } catch (err) {
      console.warn('Enhanced geocoding failed:', err);
      // Don't fail shop creation if geocoding fails
    }

    return {};
  };

  // Refresh user token to get updated role after shop creation
  const refreshUserToken = async () => {
    try {
      // Use the auth hook's refresh token method which properly updates everything
      const refreshSuccess = await refreshToken();

      console.log('✅ Token refreshed successfully after shop creation:', refreshSuccess);
      return refreshSuccess;
    } catch (err) {
      console.warn('Failed to refresh token after shop creation:', err);
      // Don't fail the shop creation process if token refresh fails
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      // Use existing coordinates if available, otherwise geocode address
      let finalLatitude = formData.latitude;
      let finalLongitude = formData.longitude;

      if (!finalLatitude || !finalLongitude) {
        const geocodeResult = await geocodeAddress();
        finalLatitude = geocodeResult.latitude;
        finalLongitude = geocodeResult.longitude;
      }

      const shopData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        businessTypes: formData.businessTypes,
        acceptsCardPayments: false, // Default to false, can be enabled later
        termsAccepted: formData.hasScrolledToEnd,
        latitude: finalLatitude,
        longitude: finalLongitude,
      };

      // Since subscription is now mandatory, shop creation should only happen through payment step
      throw new Error('Shop creation should go through payment step with subscription');

      // Refresh token to get updated OWNER role
      await refreshUserToken();

      navigate('/owner/dashboard');
    } catch (err: any) {
      error('Failed to create shop', err.message || 'Please try again later.');
    }
  };

  const handlePaymentComplete = async () => {
    console.log('🎉 handlePaymentComplete called - showing success screen');

    // Show success screen immediately - NO token refresh to avoid component unmounting
    console.log('✅ Setting showSuccessScreen to true');
    setShowSuccessScreen(true);

    // Token refresh will be handled in handleSuccessComplete when navigating
  };

  const handleSuccessComplete = async () => {
    console.log('🚀 Success screen complete, refreshing token and navigating to owner dashboard');

    try {
      // Refresh token to get updated OWNER role
      console.log('🔄 Refreshing user token to get updated role...');

      // Try multiple times with exponential backoff
      let refreshSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!refreshSuccess && attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Token refresh attempt ${attempts}/${maxAttempts}`);

        try {
          refreshSuccess = await refreshUserToken();
          if (refreshSuccess) {
            console.log('✅ Token refreshed successfully, user should now have OWNER role');
            break;
          }
        } catch (refreshError) {
          console.warn(`⚠️ Token refresh attempt ${attempts} failed:`, refreshError);
        }

        // Wait before retrying (exponential backoff)
        if (attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 500; // 500ms, 1s, 2s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!refreshSuccess) {
        console.warn('⚠️ All token refresh attempts failed, but continuing to dashboard');
      }

      // Small delay to ensure everything is processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to owner dashboard
      navigate('/owner/dashboard');
    } catch (error) {
      console.error('❌ Error during success completion:', error);
      // Still navigate even if refresh fails
      navigate('/owner/dashboard');
    }
  };

  const updateFormData = (field: keyof ShopCreationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleBusinessType = (type: BusinessType) => {
    const currentTypes = formData.businessTypes;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];

    updateFormData('businessTypes', newTypes);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show success screen after payment completion
  if (showSuccessScreen) {
    console.log('🎉 Rendering success screen for shop:', formData.name);
    return (
      <ShopCreationSuccessScreen
        shopName={formData.name}
        onComplete={handleSuccessComplete}
        redirectDelay={3000}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Shop</h1>
            <p className="text-gray-600">
              Set up your beauty business on BeautyHub and start accepting bookings
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep >= step.number
                    ? 'bg-accent-600 border-accent-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-accent-600' : 'text-gray-500'
                  }`}>
                    Step {step.number}
                  </p>
                  <p className={`text-xs ${
                    currentStep >= step.number ? 'text-accent-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-accent-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="shop-creation-form bg-white rounded-lg border border-gray-200 p-8 mb-8">
          {currentStep === 1 && (
            <TermsStep
              hasScrolledToEnd={formData.hasScrolledToEnd}
              onScrollComplete={(completed) => updateFormData('hasScrolledToEnd', completed)}
              error={errors.terms}
            />
          )}

          {currentStep === 2 && (
            <BusinessDetailsStep
              formData={formData}
              errors={errors}
              onUpdate={updateFormData}
              onToggleBusinessType={toggleBusinessType}
            />
          )}

          {currentStep === 3 && (
            <SubscriptionStep
              plans={subscriptionPlans}
              selectedPlan={formData.selectedPlan}
              formData={formData}
              isLoading={isLoadingPlans}
              errors={errors}
              onPlanSelect={(plan) => updateFormData('selectedPlan', plan)}
              onUpdate={updateFormData}
              billingCountryConfig={currentBillingCountryConfig}
            />
          )}

          {currentStep === 4 && (
            <SummaryAndPaymentStep
              selectedPlan={formData.selectedPlan}
              formData={formData}
              onPaymentComplete={handlePaymentComplete}
              billingCountryConfig={currentBillingCountryConfig}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          {currentStep === 4 ? (
            <CompleteSetupButton
              formData={formData}
              selectedPlan={formData.selectedPlan}
              onComplete={handlePaymentComplete}
              disabled={isLoading}
            />
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              isLoading={isLoading}
              loadingText="Next"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              disabled={
                isLoading ||
                (currentStep === 1 && !formData.hasScrolledToEnd) ||
                (currentStep === 2 && !isStep2Complete()) ||
                (currentStep === 3 && (!isStep3Complete() || isLoadingPlans))
              }
            >
              Next
            </Button>
          )}
        </div>

        {/* Terms Modal */}
        <Modal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          title="Terms and Conditions"
          size="xl"
        >
          <div className="prose prose-sm max-w-none">
            <div className="max-h-96 overflow-y-auto">
              <h3>BeautyHub Terms of Service</h3>
              <p>
                Welcome to BeautyHub. By creating a shop on our platform, you agree to the following terms and conditions:
              </p>

              <h4>1. Shop Registration</h4>
              <p>
                You must provide accurate and complete information when registering your shop. You are responsible for maintaining the confidentiality of your account credentials.
              </p>

              <h4>2. Service Standards</h4>
              <p>
                You agree to provide professional beauty services and maintain high standards of hygiene and customer service. All services must comply with local health and safety regulations.
              </p>

              <h4>3. Booking Management</h4>
              <p>
                You are responsible for managing your bookings, maintaining accurate availability, and honoring confirmed appointments. Cancellations should be made with reasonable notice.
              </p>

              <h4>4. Payment Processing</h4>
              <p>
                BeautyHub processes payments on your behalf. You agree to our fee structure and payment terms. Refunds must be processed according to our refund policy.
              </p>

              <h4>5. Content and Reviews</h4>
              <p>
                You grant BeautyHub the right to display your shop information and customer reviews. You are responsible for the accuracy of your shop content.
              </p>

              <h4>6. Termination</h4>
              <p>
                Either party may terminate this agreement with 30 days notice. BeautyHub reserves the right to suspend accounts that violate these terms.
              </p>

              <p className="text-sm text-gray-600 mt-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              variant="primary"
              onClick={() => setShowTermsModal(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// Step Components
interface TermsStepProps {
  hasScrolledToEnd: boolean;
  onScrollComplete: (completed: boolean) => void;
  error?: string;
}

const TermsStep: React.FC<TermsStepProps> = ({ hasScrolledToEnd, onScrollComplete, error }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Consider scrolled to end if user is within 10px of the bottom
    const isAtEnd = scrollTop + clientHeight >= scrollHeight - 10;
    if (isAtEnd && !hasScrolledToEnd) {
      onScrollComplete(true);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasScrolledToEnd]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="w-16 h-16 text-accent-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms and Conditions</h2>
        <p className="text-gray-600">
          Please read our complete terms and conditions and privacy policy by scrolling to the end of the document below.
        </p>
      </div>



      {/* Scrollable Terms Document */}
      <div className="border border-gray-300 rounded-lg">
        <div
          ref={scrollContainerRef}
          className="h-96 overflow-y-auto p-6 prose prose-sm max-w-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">BeautyHub Terms of Service</h3>
              <p className="text-gray-700 mb-4">
                Welcome to BeautyHub. By creating a shop on our platform, you agree to the following terms and conditions:
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">1. Shop Registration</h4>
              <p className="text-gray-700 mb-4">
                You must provide accurate and complete information when registering your shop. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">2. Service Standards</h4>
              <p className="text-gray-700 mb-4">
                You agree to provide professional beauty services and maintain high standards of hygiene and customer service. All services must comply with local health and safety regulations. You must ensure that all staff members are properly trained and qualified to provide the services offered.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">3. Booking Management</h4>
              <p className="text-gray-700 mb-4">
                You are responsible for managing your bookings, maintaining accurate availability, and honoring confirmed appointments. Cancellations should be made with reasonable notice to customers. You must respond to customer inquiries promptly and professionally.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">4. Payment Processing</h4>
              <p className="text-gray-700 mb-4">
                BeautyHub processes payments on your behalf through our secure payment system. You agree to our fee structure and payment terms as outlined in your subscription plan. Refunds must be processed according to our refund policy and applicable consumer protection laws.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">5. Content and Reviews</h4>
              <p className="text-gray-700 mb-4">
                You grant BeautyHub the right to display your shop information, services, and customer reviews on our platform. You are responsible for the accuracy of your shop content and must ensure all information is up-to-date and truthful.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">6. Liability and Insurance</h4>
              <p className="text-gray-700 mb-4">
                You are responsible for maintaining appropriate professional liability insurance and ensuring compliance with all applicable laws and regulations. BeautyHub is not liable for any damages or injuries that may occur during the provision of your services.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">7. Termination</h4>
              <p className="text-gray-700 mb-4">
                Either party may terminate this agreement with 30 days written notice. BeautyHub reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent or harmful activities.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy Policy</h3>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">1. Information We Collect</h4>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, register your shop, or contact us for support. This includes your name, email address, phone number, business information, and payment details.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">2. How We Use Your Information</h4>
              <p className="text-gray-700 mb-4">
                We use your information to provide and improve our services, process payments, communicate with you, and ensure the security of our platform. We may also use your information for marketing purposes with your consent.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">3. Information Sharing</h4>
              <p className="text-gray-700 mb-4">
                We do not sell or rent your personal information to third parties. We may share your information with service providers who help us operate our platform, comply with legal obligations, or protect our rights and the rights of our users.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">4. Data Security</h4>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">5. Your Rights</h4>
              <p className="text-gray-700 mb-4">
                You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us. Contact us if you wish to exercise these rights.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">
                  {hasScrolledToEnd
                    ? "✓ You have successfully read the complete Terms and Conditions and Privacy Policy"
                    : "Please scroll to read the complete document"
                  }
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-6 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

interface BusinessDetailsStepProps {
  formData: ShopCreationData;
  errors: Record<string, string>;
  onUpdate: (field: keyof ShopCreationData, value: any) => void;
  onToggleBusinessType: (type: BusinessType) => void;
}

const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({
  formData,
  errors,
  onUpdate,
  onToggleBusinessType
}) => (
  <div className="space-y-8">
    <div className="text-center">
      <Building2 className="w-16 h-16 text-accent-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Details</h2>
      <p className="text-gray-600">
        Tell us about your beauty business so customers can find and book with you.
      </p>
    </div>

    {/* Basic Business Information */}
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <Input
            label="Business Name"
            value={formData.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            placeholder="Enter your business name"
            error={errors.name}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            placeholder="Describe your business and services..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.description}
            </p>
          )}
        </div>

        <PhoneInput
          label="Phone Number"
          value={formData.phone}
          onChange={(value) => onUpdate('phone', value)}
          placeholder="Business phone number"
          defaultCountry="US"
          error={errors.phone}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => onUpdate('email', e.target.value)}
          placeholder="Business email address"
          icon={<Mail className="w-4 h-4" />}
          error={errors.email}
          required
        />

        <div className="md:col-span-2">
          <Input
            label="Website (Optional)"
            value={formData.website}
            onChange={(e) => onUpdate('website', e.target.value)}
            placeholder="https://your-website.com"
            icon={<Globe className="w-4 h-4" />}
            error={errors.website}
          />
        </div>
      </div>
    </div>

    {/* Enhanced Location Picker */}
    <ShopLocationPicker
      address={formData.address}
      city={formData.city}
      state={formData.state}
      postalCode={formData.postalCode}
      country={formData.country}
      latitude={formData.latitude}
      longitude={formData.longitude}
      onAddressChange={(address) => onUpdate('address', address)}
      onCityChange={(city) => onUpdate('city', city)}
      onStateChange={(state) => onUpdate('state', state)}
      onPostalCodeChange={(postalCode) => onUpdate('postalCode', postalCode)}
      onCountryChange={(country) => {
        onUpdate('country', country);
        // Clear state and postal code when country changes
        onUpdate('state', '');
        onUpdate('postalCode', '');
        // Clear coordinates when country changes
        onUpdate('latitude', undefined);
        onUpdate('longitude', undefined);
      }}
      onCoordinatesChange={(latitude, longitude) => {
        onUpdate('latitude', latitude);
        onUpdate('longitude', longitude);
      }}
      errors={{
        address: errors.address,
        city: errors.city,
        state: errors.state,
        postalCode: errors.postalCode,
        country: errors.country,
        coordinates: errors.coordinates
      }}
      required={{
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true
      }}
    />

    {/* Business Categories */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Business Categories</h3>
      <p className="text-sm text-gray-600">
        Select the types of services your business offers. This helps customers find you more easily.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BUSINESS_TYPE_OPTIONS.map((option) => (
          <div
            key={option.value}
            onClick={() => onToggleBusinessType(option.value)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.businessTypes.includes(option.value)
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{option.label}</h4>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
              {formData.businessTypes.includes(option.value) && (
                <Check className="w-5 h-5 text-accent-600" />
              )}
            </div>
          </div>
        ))}
      </div>
      {errors.businessTypes && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors.businessTypes}
        </p>
      )}
    </div>
  </div>
);



interface SubscriptionStepProps {
  plans: any[];
  selectedPlan?: any;
  formData: ShopCreationData;
  isLoading: boolean;
  errors: Record<string, string>;
  onPlanSelect: (plan: any) => void;
  onUpdate: (field: keyof ShopCreationData, value: any) => void;
  billingCountryConfig: CountryConfig;
}

const SubscriptionStep: React.FC<SubscriptionStepProps> = ({
  plans,
  selectedPlan,
  formData,
  isLoading,
  errors,
  onPlanSelect,
  onUpdate,
  billingCountryConfig
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <CreditCard className="w-16 h-16 text-accent-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
      <p className="text-gray-600 mb-2">
        Select a subscription plan to activate your shop and start accepting bookings.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-flex items-center space-x-2">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">30-day free trial included with all plans</span>
      </div>
    </div>

    {isLoading ? (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    ) : (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => onPlanSelect(plan)}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                selectedPlan?.id === plan.id
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900">{plan.displayName}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">{plan.formattedPrice}</span>
                  <span className="text-gray-600">/{plan.interval}</span>
                </div>
                {plan.isYearly && plan.savings && (
                  <div className="mt-2">
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {plan.savings}
                    </span>
                  </div>
                )}
                <p className="text-gray-600 mt-3">{plan.description}</p>

                {plan.features && plan.features.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedPlan?.id === plan.id && (
                  <div className="mt-4">
                    <Check className="w-6 h-6 text-accent-600 mx-auto" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {errors.plan && (
          <p className="text-sm text-red-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.plan}
          </p>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                value={formData.customerName}
                onChange={(e) => onUpdate('customerName', e.target.value)}
                placeholder="Full name for billing"
                error={errors.customerName}
                required
              />
              <Input
                label="Customer Email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => onUpdate('customerEmail', e.target.value)}
                placeholder="Email for billing and receipts"
                error={errors.customerEmail}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhoneInput
                label="Phone Number"
                value={formData.customerPhone}
                onChange={(value) => onUpdate('customerPhone', value)}
                placeholder="Phone number"
                defaultCountry="US"
                error={errors.customerPhone}
              />
              <div></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Billing Address"
                value={formData.billingAddressLine1}
                onChange={(e) => onUpdate('billingAddressLine1', e.target.value)}
                placeholder="Street address"
                error={errors.billingAddressLine1}
                required
              />
              <Input
                label="Address Line 2 (Optional)"
                value={formData.billingAddressLine2}
                onChange={(e) => onUpdate('billingAddressLine2', e.target.value)}
                placeholder="Apartment, suite, etc."
                error={errors.billingAddressLine2}
              />
            </div>

            {/* Billing Location Dropdowns */}
            <LocationDropdowns
              country={formData.billingCountry}
              state={formData.billingState}
              city={formData.billingCity}
              onCountryChange={(country) => {
                onUpdate('billingCountry', country);
                // Clear state and city when country changes
                onUpdate('billingState', '');
                onUpdate('billingCity', '');
              }}
              onStateChange={(state) => {
                onUpdate('billingState', state);
                // Clear city when state changes
                onUpdate('billingCity', '');
              }}
              onCityChange={(city) => onUpdate('billingCity', city)}
              errors={{
                country: errors.billingCountry,
                state: errors.billingState,
                city: errors.billingCity
              }}
              required={{
                country: true,
                state: billingCountryConfig.hasStates,
                city: true
              }}
              allowCustomInput={true}
            />

            {/* Postal Code Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={`${billingCountryConfig.postalCodeLabel} *`}
                value={formData.billingPostalCode}
                onChange={(e) => onUpdate('billingPostalCode', e.target.value)}
                placeholder={billingCountryConfig.postalCodePlaceholder}
                error={errors.billingPostalCode}
                required
              />
              <div></div>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);

// Complete Setup Button Component
interface CompleteSetupButtonProps {
  formData: ShopCreationData;
  selectedPlan: any;
  onComplete: () => void;
  disabled: boolean;
}

const CompleteSetupButton: React.FC<CompleteSetupButtonProps> = ({
  formData,
  selectedPlan,
  onComplete,
  disabled
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCompleteSetup = async () => {
    // This will trigger the payment form submission
    // The actual payment processing is handled by the payment form
    const paymentForm = document.querySelector('form[data-payment-form]') as HTMLFormElement;
    if (paymentForm) {
      setIsProcessing(true);
      paymentForm.requestSubmit();
    }
  };

  // Listen for payment completion
  useEffect(() => {
    const handlePaymentComplete = () => {
      setIsProcessing(false);
      onComplete();
    };

    // This would be triggered by the payment form
    window.addEventListener('payment-complete', handlePaymentComplete);
    return () => window.removeEventListener('payment-complete', handlePaymentComplete);
  }, [onComplete]);

  return (
    <Button
      variant="primary"
      onClick={handleCompleteSetup}
      disabled={disabled || isProcessing}
      isLoading={isProcessing}
      loadingText="Creating Shop..."
      icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
    >
      {isProcessing ? 'Creating Shop...' : 'Complete Setup'}
    </Button>
  );
};

// Summary and Payment Step Component
interface SummaryAndPaymentStepProps {
  selectedPlan: any;
  formData: ShopCreationData;
  onPaymentComplete: () => void;
  billingCountryConfig: CountryConfig;
}

const SummaryAndPaymentStep: React.FC<SummaryAndPaymentStepProps> = ({
  selectedPlan,
  formData,
  onPaymentComplete,
  billingCountryConfig
}) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <CreditCard className="w-16 h-16 text-accent-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Summary & Payment</h2>
        <p className="text-gray-600">
          Review your information and complete payment to create your shop.
        </p>
      </div>

      {/* Summary Section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

        {/* Shop Information */}
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Shop Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Business Name:</span>
                <span className="ml-2 font-medium">{formData.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{formData.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{formData.phone}</span>
              </div>
              <div>
                <span className="text-gray-600">Business Types:</span>
                <span className="ml-2 font-medium">
                  {formData.businessTypes.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-600">Address:</span>
                <span className="ml-2 font-medium">
                  {formData.address}, {formData.city}
                  {formData.state && `, ${formData.state}`} {formData.postalCode}, {formData.country}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Subscription Plan</h4>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-semibold text-gray-900">{selectedPlan?.displayName}</h5>
                  <p className="text-sm text-gray-600 mt-1">{selectedPlan?.description}</p>
                  {selectedPlan?.features && selectedPlan.features.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {selectedPlan.features.slice(0, 3).map((feature: string, index: number) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center">
                          <Check className="w-3 h-3 text-green-500 mr-1" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{selectedPlan?.formattedPrice}</div>
                  <div className="text-sm text-gray-600">/{selectedPlan?.interval}</div>
                  {selectedPlan?.isYearly && selectedPlan?.savings && (
                    <div className="text-xs text-green-600 font-medium">{selectedPlan.savings}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Billing Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{formData.customerName}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{formData.customerEmail}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-gray-600">Billing Address:</span>
                <span className="ml-2 font-medium">
                  {formData.billingAddressLine1}
                  {formData.billingAddressLine2 && `, ${formData.billingAddressLine2}`}, {formData.billingCity}
                  {billingCountryConfig.hasStates && formData.billingState && `, ${formData.billingState}`} {formData.billingPostalCode}, {formData.billingCountry}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <ShopCreationPaymentForm
          selectedPlan={selectedPlan}
          formData={formData}
          onPaymentComplete={onPaymentComplete}
          hideBackButton={true}
          hideCompleteButton={true}
        />
      </div>
    </div>
  );
};

export default ShopCreationPage;
