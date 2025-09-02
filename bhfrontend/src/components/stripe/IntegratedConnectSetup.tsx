import { useState, useEffect, FC, FormEvent } from 'react';
import {
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Shield,
  Globe,
  User,
  FileText,
  Loader2
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';

interface IntegratedConnectSetupProps {
  shopId: string;
  onSetupComplete: () => void;
}

interface BusinessInfo {
  businessType: 'individual' | 'company';
  businessCountry: string;
  businessName: string;
  businessUrl: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  individual?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: {
      day: number;
      month: number;
      year: number;
    };
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  company?: {
    name: string;
    taxId: string;
    structure: string;
  };
  externalAccount: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
  tosAcceptance: {
    date: number;
    ip: string;
    userAgent: string;
  };
}

const IntegratedConnectSetup: FC<IntegratedConnectSetupProps> = ({
  shopId,
  onSetupComplete
}) => {
  const [step, setStep] = useState<'business-type' | 'business-info' | 'individual-info' | 'bank-info' | 'review'>('business-type');
  const [isLoading, setIsLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<Partial<BusinessInfo>>({
    businessType: 'individual',
    businessCountry: 'US',
    businessAddress: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    },
    individual: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: {
        day: 1,
        month: 1,
        year: 1990
      },
      address: {
        line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }
    },
    externalAccount: {
      accountNumber: '',
      routingNumber: '',
      accountHolderName: ''
    }
  });
  const { success, error } = useToast();

  const handleBusinessTypeSelect = (type: 'individual' | 'company') => {
    setBusinessInfo(prev => ({
      ...prev,
      businessType: type
    }));
    setStep('business-info');
  };

  const handleBusinessInfoSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (businessInfo.businessType === 'individual') {
      setStep('individual-info');
    } else {
      setStep('bank-info');
    }
  };

  const handleIndividualInfoSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStep('bank-info');
  };

  const handleBankInfoSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    try {
      setIsLoading(true);

      // Get user's IP and user agent for ToS acceptance
      const tosAcceptance = {
        date: Math.floor(Date.now() / 1000),
        ip: await getUserIP(),
        userAgent: navigator.userAgent
      };

      const completeBusinessInfo = {
        ...businessInfo,
        tosAcceptance
      } as BusinessInfo;

      // Create Connect account
      await apiClient.createStripeConnectAccount(shopId, completeBusinessInfo);

      success('Setup Complete', 'Your payment processing setup is complete!');
      onSetupComplete();
    } catch (err: any) {
      console.error('Error creating Connect account:', err);
      error('Setup Failed', err.response?.data?.message || 'Failed to complete payment setup');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1'; // Fallback IP
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Business Type', 'Business Info', 'Personal Info', 'Bank Details', 'Review'].map((stepName, index) => {
            const stepKeys = ['business-type', 'business-info', 'individual-info', 'bank-info', 'review'];
            const currentStepIndex = stepKeys.indexOf(step);
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={stepName} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted ? 'bg-green-500 text-white' : 
                    isActive ? 'bg-accent-500 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {step === 'business-type' && (
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Business Type</h3>
          <p className="text-gray-600 mb-8">This helps us collect the right information for your payment setup</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleBusinessTypeSelect('individual')}
              className="p-6 border border-gray-200 rounded-lg hover:border-accent-500 hover:shadow-md transition-all duration-200 text-left"
            >
              <User className="w-8 h-8 text-accent-500 mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">Individual</h4>
              <p className="text-sm text-gray-600">You're a sole proprietor or freelancer</p>
            </button>
            
            <button
              onClick={() => handleBusinessTypeSelect('company')}
              className="p-6 border border-gray-200 rounded-lg hover:border-accent-500 hover:shadow-md transition-all duration-200 text-left"
            >
              <Building2 className="w-8 h-8 text-accent-500 mb-3" />
              <h4 className="font-medium text-gray-900 mb-2">Company</h4>
              <p className="text-sm text-gray-600">You have a registered business entity</p>
            </button>
          </div>
        </div>
      )}

      {step === 'business-info' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Information</h3>
          <p className="text-gray-600 mb-6">Tell us about your business</p>
          
          <form onSubmit={handleBusinessInfoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={businessInfo.businessName || ''}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Website
              </label>
              <input
                type="url"
                value={businessInfo.businessUrl || ''}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="https://your-website.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email *
                </label>
                <input
                  type="email"
                  required
                  value={businessInfo.businessEmail || ''}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="business@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={businessInfo.businessPhone || ''}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address *
              </label>
              <input
                type="text"
                required
                value={businessInfo.businessAddress?.line1 || ''}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  businessAddress: { ...prev.businessAddress!, line1: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  required
                  value={businessInfo.businessAddress?.city || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    businessAddress: { ...prev.businessAddress!, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="City"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={businessInfo.businessAddress?.state || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    businessAddress: { ...prev.businessAddress!, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="State"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={businessInfo.businessAddress?.postal_code || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    businessAddress: { ...prev.businessAddress!, postal_code: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="ZIP"
                />
              </div>
              <div>
                <select
                  value={businessInfo.businessAddress?.country || 'US'}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    businessAddress: { ...prev.businessAddress!, country: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('business-type')}
              >
                Back
              </Button>
              <Button type="submit">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 'individual-info' && businessInfo.businessType === 'individual' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h3>
          <p className="text-gray-600 mb-6">We need some personal details to verify your identity</p>

          <form onSubmit={handleIndividualInfoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessInfo.individual?.firstName || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: { ...prev.individual!, firstName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessInfo.individual?.lastName || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: { ...prev.individual!, lastName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={businessInfo.individual?.email || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: { ...prev.individual!, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="personal@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={businessInfo.individual?.phone || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: { ...prev.individual!, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
                  value={businessInfo.individual?.dateOfBirth?.month || 1}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: {
                      ...prev.individual!,
                      dateOfBirth: { ...prev.individual!.dateOfBirth, month: parseInt(e.target.value) }
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={businessInfo.individual?.dateOfBirth?.day || 1}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: {
                      ...prev.individual!,
                      dateOfBirth: { ...prev.individual!.dateOfBirth, day: parseInt(e.target.value) }
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <select
                  required
                  value={businessInfo.individual?.dateOfBirth?.year || 1990}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: {
                      ...prev.individual!,
                      dateOfBirth: { ...prev.individual!.dateOfBirth, year: parseInt(e.target.value) }
                    }
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {Array.from({ length: 80 }, (_, i) => {
                    const year = new Date().getFullYear() - 18 - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('business-info')}
              >
                Back
              </Button>
              <Button type="submit">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 'bank-info' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank Account Information</h3>
          <p className="text-gray-600 mb-6">Add your bank account to receive payments</p>

          <form onSubmit={handleBankInfoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                required
                value={businessInfo.externalAccount?.accountHolderName || ''}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  externalAccount: { ...prev.externalAccount!, accountHolderName: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Name on bank account"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number *
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{9}"
                  value={businessInfo.externalAccount?.routingNumber || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    externalAccount: { ...prev.externalAccount!, routingNumber: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="9-digit routing number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={businessInfo.externalAccount?.accountNumber || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    externalAccount: { ...prev.externalAccount!, accountNumber: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="Account number"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Your bank information is secure</p>
                  <p>We use bank-level encryption to protect your financial data and never store your full account details.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(businessInfo.businessType === 'individual' ? 'individual-info' : 'business-info')}
              >
                Back
              </Button>
              <Button type="submit">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 'review' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Submit</h3>
          <p className="text-gray-600 mb-6">Please review your information before submitting</p>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Business Type:</span>
                  <span className="ml-2 font-medium">{businessInfo.businessType}</span>
                </div>
                <div>
                  <span className="text-gray-600">Business Name:</span>
                  <span className="ml-2 font-medium">{businessInfo.businessName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{businessInfo.businessEmail}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{businessInfo.businessPhone}</span>
                </div>
              </div>
            </div>

            {businessInfo.businessType === 'individual' && businessInfo.individual && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {businessInfo.individual.firstName} {businessInfo.individual.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{businessInfo.individual.email}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Bank Account</h4>
              <div className="text-sm">
                <div>
                  <span className="text-gray-600">Account Holder:</span>
                  <span className="ml-2 font-medium">{businessInfo.externalAccount?.accountHolderName}</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-600">Account:</span>
                  <span className="ml-2 font-medium">
                    ****{businessInfo.externalAccount?.accountNumber?.slice(-4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Terms of Service</p>
                  <p>By submitting this form, you agree to Stripe's Terms of Service and authorize us to process payments on your behalf.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('bank-info')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegratedConnectSetup;
