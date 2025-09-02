import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Shield,
  RefreshCw
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

interface CustomConnectOnboardingProps {
  shopId: string;
  onOnboardingComplete?: () => void;
}

interface ConnectAccount {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  business_profile?: {
    name?: string;
    url?: string;
  };
  country: string;
  default_currency: string;
}

const CustomConnectOnboarding: React.FC<CustomConnectOnboardingProps> = ({
  shopId,
  onOnboardingComplete
}) => {
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<'setup' | 'onboarding' | 'complete'>('setup');
  const [accountData, setAccountData] = useState({
    businessType: 'individual',
    businessCountry: 'US',
    businessName: '',
    businessUrl: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const { success, error } = useToast();

  useEffect(() => {
    checkExistingAccount();
  }, [shopId]);

  const checkExistingAccount = async () => {
    try {
      setIsLoading(true);
      const account = await apiClient.getStripeConnectAccount(shopId);
      
      if (account && account.id) {
        setConnectAccount(account);
        if (account.chargesEnabled && account.payoutsEnabled) {
          setOnboardingStep('complete');
        } else {
          // Account exists but onboarding not complete
          setOnboardingStep('onboarding');
        }
      } else {
        setOnboardingStep('setup');
      }
    } catch (err: any) {
      console.error('Error checking existing account:', err);
      if (err.response?.status === 404) {
        // No account exists, start setup
        setOnboardingStep('setup');
      } else {
        error('Error', 'Failed to check Connect account status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async (onboardingData: any) => {
    try {
      setIsLoading(true);

      // Submit onboarding information directly to backend
      await apiClient.updateStripeConnectAccount(shopId, onboardingData);

      // Refresh account status
      await checkExistingAccount();

      success('Onboarding Updated', 'Your information has been submitted successfully');
    } catch (err: any) {
      console.error('Error updating onboarding:', err);
      error('Error', err.response?.data?.message || 'Failed to update onboarding information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setIsLoading(true);
      
      // Create Connect account
      const response = await apiClient.createStripeConnectAccount(shopId, {
        businessType: accountData.businessType,
        businessCountry: accountData.businessCountry,
        businessName: accountData.businessName || undefined,
        businessUrl: accountData.businessUrl || undefined,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        email: accountData.email,
        phone: accountData.phone || undefined
      });

      setConnectAccount(response);
      setOnboardingStep('onboarding');

      success('Account Created', 'Connect account created successfully. Complete the onboarding process.');
    } catch (err: any) {
      console.error('Error creating Connect account:', err);
      error('Error', err.response?.data?.message || 'Failed to create Connect account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingExit = () => {
    // Refresh account status when user exits onboarding
    checkExistingAccount();
  };

  const getRequirementLabel = (requirement: string): string => {
    const labels: Record<string, string> = {
      'business_profile.name': 'Business name',
      'business_profile.url': 'Business website',
      'individual.first_name': 'First name',
      'individual.last_name': 'Last name',
      'individual.email': 'Email address',
      'individual.phone': 'Phone number',
      'individual.dob.day': 'Date of birth',
      'individual.address.line1': 'Address',
      'individual.address.city': 'City',
      'individual.address.postal_code': 'Postal code',
      'individual.address.state': 'State',
      'individual.id_number': 'ID number',
      'individual.verification.document': 'Identity document',
      'company.name': 'Company name',
      'company.tax_id': 'Tax ID',
      'company.address.line1': 'Company address',
      'external_account': 'Bank account',
      'tos_acceptance.date': 'Terms of service acceptance'
    };
    return labels[requirement] || requirement.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Building2 className="w-16 h-16 text-accent-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {onboardingStep === 'complete' ? 'Payment Setup Complete' : 'Enable Card Payments'}
        </h2>
        <p className="text-gray-600">
          {onboardingStep === 'complete' 
            ? 'Your shop is ready to accept card payments from customers.'
            : 'Set up Stripe Connect to accept card payments and receive payouts.'
          }
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center space-x-2 ${onboardingStep !== 'setup' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            onboardingStep !== 'setup' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {onboardingStep !== 'setup' ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">1</span>}
          </div>
          <span className="text-sm font-medium">Account Setup</span>
        </div>
        
        <div className={`w-8 h-0.5 ${onboardingStep === 'complete' ? 'bg-green-300' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center space-x-2 ${onboardingStep === 'onboarding' ? 'text-accent-600' : onboardingStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            onboardingStep === 'complete' ? 'bg-green-100' : onboardingStep === 'onboarding' ? 'bg-accent-100' : 'bg-gray-100'
          }`}>
            {onboardingStep === 'complete' ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">2</span>}
          </div>
          <span className="text-sm font-medium">Verification</span>
        </div>
        
        <div className={`w-8 h-0.5 ${onboardingStep === 'complete' ? 'bg-green-300' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center space-x-2 ${onboardingStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            onboardingStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {onboardingStep === 'complete' ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">3</span>}
          </div>
          <span className="text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Step Content */}
      {onboardingStep === 'setup' && (
        <AccountSetupStep
          accountData={accountData}
          onAccountDataChange={setAccountData}
          onCreateAccount={handleCreateAccount}
          isLoading={isLoading}
        />
      )}

      {onboardingStep === 'onboarding' && (
        <OnboardingFormStep
          connectAccount={connectAccount}
          accountData={accountData}
          onComplete={handleCompleteOnboarding}
          onRefresh={checkExistingAccount}
          getRequirementLabel={getRequirementLabel}
          isLoading={isLoading}
        />
      )}

      {onboardingStep === 'complete' && connectAccount && (
        <CompleteStep
          connectAccount={connectAccount}
          onOnboardingComplete={onOnboardingComplete}
        />
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Secure Payment Processing
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Stripe Connect provides secure payment processing with industry-leading fraud protection. 
              Your customers' payment information is never stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AccountSetupStepProps {
  accountData: any;
  onAccountDataChange: (data: any) => void;
  onCreateAccount: () => void;
  isLoading: boolean;
}

const AccountSetupStep: React.FC<AccountSetupStepProps> = ({
  accountData,
  onAccountDataChange,
  onCreateAccount,
  isLoading
}) => {
  const updateField = (field: string, value: string) => {
    onAccountDataChange({ ...accountData, [field]: value });
  };

  const isFormValid = () => {
    return accountData.firstName.trim() && 
           accountData.lastName.trim() && 
           accountData.email.trim() &&
           accountData.businessCountry;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Account Information</h3>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="businessType"
              value="individual"
              checked={accountData.businessType === 'individual'}
              onChange={(e) => updateField('businessType', e.target.value)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">Individual</p>
              <p className="text-sm text-gray-600">Personal account</p>
            </div>
          </label>
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="businessType"
              value="company"
              checked={accountData.businessType === 'company'}
              onChange={(e) => updateField('businessType', e.target.value)}
              className="mr-3"
            />
            <div>
              <p className="font-medium text-gray-900">Company</p>
              <p className="text-sm text-gray-600">Business account</p>
            </div>
          </label>
        </div>
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          value={accountData.businessCountry}
          onChange={(e) => updateField('businessCountry', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          <option value="BG">Bulgaria</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
        </select>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={accountData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={accountData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={accountData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
      </div>

      {/* Business Information (if company) */}
      {accountData.businessType === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={accountData.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Website
            </label>
            <input
              type="url"
              value={accountData.businessUrl}
              onChange={(e) => updateField('businessUrl', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
        </div>
      )}

      <div className="pt-4">
        <Button
          variant="primary"
          onClick={onCreateAccount}
          disabled={!isFormValid() || isLoading}
          isLoading={isLoading}
          loadingText="Creating Account..."
          icon={<CreditCard className="w-4 h-4" />}
          className="w-full"
        >
          Create Connect Account
        </Button>
      </div>
    </div>
  );
};

interface OnboardingFormStepProps {
  connectAccount: ConnectAccount | null;
  accountData: any;
  onComplete: (data: any) => void;
  onRefresh: () => void;
  getRequirementLabel: (requirement: string) => string;
  isLoading: boolean;
}

const OnboardingFormStep: React.FC<OnboardingFormStepProps> = ({
  connectAccount,
  accountData,
  onComplete,
  onRefresh,
  getRequirementLabel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: accountData.firstName || '',
    lastName: accountData.lastName || '',
    email: accountData.email || '',
    phone: accountData.phone || '',
    dateOfBirth: {
      day: '',
      month: '',
      year: ''
    },

    // Address Information
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: accountData.businessCountry || 'US'
    },

    // Business Information (if company)
    businessName: accountData.businessName || '',
    businessUrl: accountData.businessUrl || '',
    businessTaxId: '',

    // Bank Account Information
    bankAccount: {
      accountHolderName: '',
      routingNumber: '',
      accountNumber: '',
      accountType: 'checking'
    },

    // Terms acceptance
    tosAcceptance: false
  });

  const updateField = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev } as any;
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'address.line1',
      'address.city',
      'address.postalCode',
      'bankAccount.accountHolderName',
      'bankAccount.routingNumber',
      'bankAccount.accountNumber'
    ];

    const missingFields = requiredFields.filter(field => {
      const keys = field.split('.');
      let value: any = formData;
      for (const key of keys) {
        value = value?.[key];
      }
      return !value || (typeof value === 'string' && !value.trim());
    });

    if (missingFields.length > 0 || !formData.tosAcceptance) {
      return;
    }

    onComplete(formData);
  };

  const isFormValid = () => {
    return formData.firstName.trim() &&
           formData.lastName.trim() &&
           formData.email.trim() &&
           formData.address.line1.trim() &&
           formData.address.city.trim() &&
           formData.address.postalCode.trim() &&
           formData.bankAccount.accountHolderName.trim() &&
           formData.bankAccount.routingNumber.trim() &&
           formData.bankAccount.accountNumber.trim() &&
           formData.tosAcceptance;
  };

  return (
    <div className="space-y-6">
      {/* Requirements Summary */}
      {connectAccount?.requirements && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-amber-800 mb-2">
            Information Required
          </h3>
          <div className="text-sm text-amber-700">
            {connectAccount.requirements.currently_due.length > 0 && (
              <div className="mb-2">
                <p className="font-medium">Required now:</p>
                <ul className="list-disc list-inside ml-2">
                  {connectAccount.requirements.currently_due.map((req) => (
                    <li key={req}>{getRequirementLabel(req)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Complete Your Information</h3>

        {/* Personal Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Date of Birth</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
              <select
                value={formData.dateOfBirth.day}
                onChange={(e) => updateField('dateOfBirth.day', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={formData.dateOfBirth.month}
                onChange={(e) => updateField('dateOfBirth.month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={formData.dateOfBirth.year}
                onChange={(e) => updateField('dateOfBirth.year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="">Year</option>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Address Information</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address.line1}
                onChange={(e) => updateField('address.line1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apartment, suite, etc. (optional)
              </label>
              <input
                type="text"
                value={formData.address.line2}
                onChange={(e) => updateField('address.line2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => updateField('address.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) => updateField('address.state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => updateField('address.postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Information (if company) */}
        {accountData.businessType === 'company' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Business Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Tax ID
                </label>
                <input
                  type="text"
                  value={formData.businessTaxId}
                  onChange={(e) => updateField('businessTaxId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bank Account Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Bank Account Information</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bankAccount.accountHolderName}
                onChange={(e) => updateField('bankAccount.accountHolderName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.routingNumber}
                  onChange={(e) => updateField('bankAccount.routingNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bankAccount.accountNumber}
                  onChange={(e) => updateField('bankAccount.accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <select
                value={formData.bankAccount.accountType}
                onChange={(e) => updateField('bankAccount.accountType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Terms of Service */}
        <div>
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={formData.tosAcceptance}
              onChange={(e) => updateField('tosAcceptance', e.target.checked)}
              className="mt-1"
              required
            />
            <span className="text-sm text-gray-700">
              I agree to the <a href="#" className="text-accent-600 hover:text-accent-700">Stripe Connected Account Agreement</a> and
              authorize BeautyHub to collect and submit this information to Stripe for payment processing.
              <span className="text-red-500 ml-1">*</span>
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Check Status
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isFormValid() || isLoading}
            isLoading={isLoading}
            loadingText="Submitting..."
            icon={<CheckCircle className="w-4 h-4" />}
            className="flex-1"
          >
            Submit Information
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CompleteStepProps {
  connectAccount: ConnectAccount;
  onOnboardingComplete?: () => void;
}

const CompleteStep: React.FC<CompleteStepProps> = ({
  connectAccount,
  onOnboardingComplete
}) => {
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-green-900 mb-2">
          Payment Setup Complete!
        </h3>
        <p className="text-green-700">
          Your shop is now ready to accept card payments from customers.
        </p>
      </div>

      {/* Account Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Charges Enabled</p>
              <p className="text-sm text-gray-600">Can accept payments</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Payouts Enabled</p>
              <p className="text-sm text-gray-600">Can receive payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          What's Next?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your shop can now accept card payments from customers</li>
          <li>• Payments will be automatically transferred to your bank account</li>
          <li>• You can view payment activity in your shop dashboard</li>
          <li>• Manage your Connect account settings anytime</li>
        </ul>
      </div>

      {onOnboardingComplete && (
        <div className="text-center">
          <Button
            variant="primary"
            onClick={onOnboardingComplete}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Continue to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomConnectOnboarding;
