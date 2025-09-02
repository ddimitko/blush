import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Shield,
  Loader2,
  Building2,
  User
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import { useShopQuery } from '../../hooks/queries/useShopQueries';
import {
  getCountryConfig,
  isCountrySupported,
  validatePostalCode,
  formatIBAN,
  validateIBAN,
  getIBANPlaceholder,
  formatBankAccountField,
  CountryConfig,
  BankAccountField
} from '../../lib/stripeConnectCountries';

interface CountrySpecificConnectSetupProps {
  shopId: string;
  onSetupComplete: () => void;
}

interface BusinessInfo {
  businessType: 'individual' | 'company';
  businessCountry: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessAddress: {
    line1: string;
    line2?: string;
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
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    ssn?: string; // For countries that require it
  };
  company?: {
    name: string;
    taxId: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  externalAccount: Record<string, string>;
  compliance?: {
    legalComplianceDeclaration: boolean;
    vatRegistrationStatus: 'not_required' | 'registered' | 'will_register';
    vatNumber?: string;
    vatCountry?: string;
    invoicingCustomers: boolean;
    incomeReporting: boolean;
    dac7Compliance: boolean;
    refundsDisputes: boolean;
  };
  tosAcceptance?: {
    date: number;
    ip: string;
    userAgent: string;
  };
}

const CountrySpecificConnectSetup: React.FC<CountrySpecificConnectSetupProps> = ({
  shopId,
  onSetupComplete
}) => {
  const [step, setStep] = useState<'business-type' | 'business-info' | 'individual-info' | 'company-info' | 'bank-info' | 'compliance' | 'review'>('business-type');
  const [isLoading, setIsLoading] = useState(false);
  const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);
  const { success, error } = useToast();
  
  // Get shop data to determine country
  const { data: shop, isLoading: isLoadingShop } = useShopQuery(shopId);

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
        year: 1901
      },
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }
    },
    company: {
      name: '',
      taxId: '',
      phone: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }
    },
    externalAccount: {},
    compliance: {
      legalComplianceDeclaration: false,
      vatRegistrationStatus: 'not_required',
      vatNumber: '',
      vatCountry: '',
      invoicingCustomers: false,
      incomeReporting: false,
      dac7Compliance: false,
      refundsDisputes: false
    }
  });

  // Initialize country config and pre-fill data when shop loads
  useEffect(() => {
    if (shop) {
      const shopCountry = shop.country || 'US';
      
      // Check if shop's country is supported by Stripe Connect
      if (!isCountrySupported(shopCountry)) {
        error(
          'Country Not Supported', 
          `Stripe Connect is not available in ${shop.country}. Please contact support for alternative payment solutions.`
        );
        return;
      }

      const config = getCountryConfig(shopCountry);
      setCountryConfig(config);

      // Initialize external account fields based on country
      const initialExternalAccount: Record<string, string> = {};
      config.bankAccountFields.forEach(field => {
        initialExternalAccount[field.name] = '';
      });

      // Pre-fill business info with shop data and initialize external account in one call
      setBusinessInfo(prev => ({
        ...prev,
        businessCountry: shopCountry,
        businessName: shop.name,
        businessEmail: shop.email,
        businessPhone: shop.phone,
        businessWebsite: shop.website || '',
        businessAddress: {
          line1: shop.address || '',
          city: shop.city || '',
          state: shop.state || '',
          postal_code: shop.postalCode || '',
          country: shopCountry
        },
        individual: {
          ...prev.individual!,
          email: shop.owner?.email || shop.email || '',
          firstName: shop.owner?.firstName || '',
          lastName: shop.owner?.lastName || '',
          phone: shop.owner?.phone || shop.phone || '',
          address: {
            line1: shop.address || '',
            city: shop.city || '',
            state: shop.state || '',
            postal_code: shop.postalCode || '',
            country: shopCountry
          }
        },
        company: {
          ...prev.company!,
          name: shop.name,
          phone: shop.phone || '',
          address: {
            line1: shop.address || '',
            city: shop.city || '',
            state: shop.state || '',
            postal_code: shop.postalCode || '',
            country: shopCountry
          }
        },
        externalAccount: initialExternalAccount
      }));
    }
  }, [shop]);

  const handleBusinessTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('business-info');
  };

  const handleBusinessInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countryConfig) return;

    // Validate required fields
    if (!businessInfo.businessName?.trim() ||
        !businessInfo.businessEmail?.trim() ||
        !businessInfo.businessWebsite?.trim()) {
      error('Error', 'Please fill in all required business information');
      return;
    }

    // Validate postal code
    if (countryConfig.postalCodeRequired && 
        !validatePostalCode(businessInfo.businessAddress?.postal_code || '', countryConfig.code)) {
      error('Error', `Please enter a valid ${countryConfig.postalCodeLabel.toLowerCase()}`);
      return;
    }

    // Validate state if required
    if (countryConfig.stateRequired && !businessInfo.businessAddress?.state?.trim()) {
      error('Error', `${countryConfig.stateLabel} is required for ${countryConfig.name}`);
      return;
    }

    if (businessInfo.businessType === 'individual') {
      setStep('individual-info');
    } else {
      setStep('company-info');
    }
  };

  const handleIndividualInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countryConfig) return;

    // Validate required individual fields
    if (!businessInfo.individual?.firstName?.trim() || 
        !businessInfo.individual?.lastName?.trim() ||
        !businessInfo.individual?.email?.trim()) {
      error('Error', 'Please fill in all required personal information');
      return;
    }

    setStep('bank-info');
  };

  const handleCompanyInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countryConfig) return;

    // Validate required company fields
    if (!businessInfo.company?.name?.trim()) {
      error('Error', 'Please fill in all required company information');
      return;
    }

    if (countryConfig.requiresTaxId && !businessInfo.company?.taxId?.trim()) {
      error('Error', `${countryConfig.taxIdLabel} is required`);
      return;
    }

    setStep('bank-info');
  };

  const handleBankInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!countryConfig) return;

    // Validate bank account fields
    for (const field of countryConfig.bankAccountFields) {
      if (field.required && !businessInfo.externalAccount[field.name]?.trim()) {
        error('Error', `${field.label} is required`);
        return;
      }

      // Special validation for IBAN
      if (field.name === 'iban' && businessInfo.externalAccount[field.name]) {
        const cleanIban = businessInfo.externalAccount[field.name].replace(/\s/g, '');
        if (!validateIBAN(cleanIban, countryConfig.code)) {
          error('Error', `Please enter a valid ${field.label} for ${countryConfig.name}`);
          return;
        }
      }
      // Validate other field patterns
      else if (field.pattern && businessInfo.externalAccount[field.name]) {
        const valueToValidate = field.name === 'iban'
          ? businessInfo.externalAccount[field.name].replace(/\s/g, '')
          : businessInfo.externalAccount[field.name];
        const regex = new RegExp(field.pattern);
        if (!regex.test(valueToValidate)) {
          error('Error', `Please enter a valid ${field.label.toLowerCase()}`);
          return;
        }
      }
    }

    setStep('compliance');
  };

  const handleComplianceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate compliance requirements
    if (!businessInfo.compliance?.legalComplianceDeclaration) {
      error('Error', 'You must declare that your business complies with local laws');
      return;
    }

    if (!businessInfo.compliance?.dac7Compliance) {
      error('Error', 'You must agree to provide truthful information for DAC7 reporting');
      return;
    }

    if (!businessInfo.compliance?.refundsDisputes) {
      error('Error', 'You must acknowledge responsibility for customer disputes');
      return;
    }

    // Validate VAT registration if required
    if (businessInfo.compliance?.vatRegistrationStatus === 'registered' &&
        !businessInfo.compliance?.vatNumber?.trim()) {
      error('Error', 'Please provide your VAT number');
      return;
    }

    setStep('review');
  };

  const handleFinalSubmit = async () => {
    try {
      setIsLoading(true);

      // Transform the complex business info into the format expected by the backend
      const connectAccountRequest = {
        businessName: businessInfo.businessName,
        businessEmail: businessInfo.businessEmail,
        businessPhone: businessInfo.businessPhone,
        businessWebsite: businessInfo.businessWebsite || '',
        businessAddress: businessInfo.businessAddress?.line1 || '',
        businessCity: businessInfo.businessAddress?.city || '',
        businessState: countryConfig?.hasStates
          ? (businessInfo.businessAddress?.state || '')
          : 'N/A', // For countries without states, send 'N/A'
        businessPostalCode: businessInfo.businessAddress?.postal_code || '',
        businessCountry: businessInfo.businessCountry || countryConfig?.code || 'US',
        businessType: businessInfo.businessType || 'individual',
        onboardingType: 'incremental',
        requestedCapabilities: ['card_payments', 'transfers'],
        serviceAgreement: 'full',
        returnUrl: `${window.location.origin}/dashboard?connect=success`,
        refreshUrl: `${window.location.origin}/dashboard?connect=refresh`,

        // Individual information (for individual business type)
        individual: businessInfo.businessType === 'individual' && businessInfo.individual ? {
          firstName: businessInfo.individual.firstName,
          lastName: businessInfo.individual.lastName,
          email: businessInfo.individual.email,
          phone: businessInfo.individual.phone,
          dateOfBirth: {
            day: businessInfo.individual.dateOfBirth?.day,
            month: businessInfo.individual.dateOfBirth?.month,
            year: businessInfo.individual.dateOfBirth?.year
          },
          address: {
            line1: businessInfo.individual.address?.line1 || businessInfo.businessAddress?.line1 || '',
            line2: businessInfo.individual.address?.line2 || '',
            city: businessInfo.individual.address?.city || businessInfo.businessAddress?.city || '',
            state: countryConfig?.hasStates
              ? (businessInfo.individual.address?.state || businessInfo.businessAddress?.state || '')
              : 'N/A',
            postalCode: businessInfo.individual.address?.postal_code || businessInfo.businessAddress?.postal_code || '',
            country: businessInfo.individual.address?.country || businessInfo.businessCountry || countryConfig?.code || 'US'
          },
          ssn: businessInfo.individual.ssn || undefined
        } : undefined,

        // Company information (for company business type)
        company: businessInfo.businessType === 'company' && businessInfo.company ? {
          name: businessInfo.company.name,
          phone: businessInfo.company.phone,
          taxId: businessInfo.company.taxId || undefined,
          address: {
            line1: businessInfo.company.address?.line1 || businessInfo.businessAddress?.line1 || '',
            line2: businessInfo.company.address?.line2 || '',
            city: businessInfo.company.address?.city || businessInfo.businessAddress?.city || '',
            state: countryConfig?.hasStates
              ? (businessInfo.company.address?.state || businessInfo.businessAddress?.state || '')
              : 'N/A',
            postalCode: businessInfo.company.address?.postal_code || businessInfo.businessAddress?.postal_code || '',
            country: businessInfo.company.address?.country || businessInfo.businessCountry || countryConfig?.code || 'US'
          }
        } : undefined,

        // External account (bank details)
        externalAccount: businessInfo.externalAccount && Object.keys(businessInfo.externalAccount).length > 0 ? {
          accountHolderName: businessInfo.externalAccount.accountHolderName,
          country: businessInfo.businessCountry || countryConfig?.code || 'US',
          currency: countryConfig?.currency?.toLowerCase() || 'usd',
          accountHolderType: businessInfo.businessType === 'individual' ? 'individual' : 'company',

          // IBAN (for EU countries)
          iban: businessInfo.externalAccount.iban || undefined,

          // US bank account details
          routingNumber: businessInfo.externalAccount.routingNumber || undefined,
          accountNumber: businessInfo.externalAccount.accountNumber || undefined,

          // UK bank account details
          sortCode: businessInfo.externalAccount.sortCode || undefined,

          // Australian bank account details
          bsbNumber: businessInfo.externalAccount.bsbNumber || undefined,

          // Canadian bank account details
          institutionNumber: businessInfo.externalAccount.institutionNumber || undefined,
          transitNumber: businessInfo.externalAccount.transitNumber || undefined
        } : undefined,

        // Compliance information
        compliance: businessInfo.compliance ? {
          legalComplianceDeclaration: businessInfo.compliance.legalComplianceDeclaration,
          vatRegistrationStatus: businessInfo.compliance.vatRegistrationStatus,
          vatNumber: businessInfo.compliance.vatNumber || undefined,
          vatCountry: businessInfo.compliance.vatCountry || businessInfo.businessCountry,
          invoicingCustomers: businessInfo.compliance.invoicingCustomers,
          incomeReporting: businessInfo.compliance.incomeReporting,
          dac7Compliance: businessInfo.compliance.dac7Compliance,
          refundsDisputes: businessInfo.compliance.refundsDisputes
        } : undefined,

        // Terms of Service acceptance
        tosAcceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '127.0.0.1', // This should be the actual user's IP in production
          userAgent: navigator.userAgent
        }
      };

      console.log('Sending Connect account request:', connectAccountRequest);

      // Create Connect account
      await apiClient.createStripeConnectAccount(shopId, connectAccountRequest);

      success('Setup Complete', 'Your payment processing setup is complete!');
      onSetupComplete();
    } catch (err: any) {
      console.error('Error creating Connect account:', err);
      error('Setup Failed', err.response?.data?.message || 'Failed to complete payment setup');
    } finally {
      setIsLoading(false);
    }
  };



  // Handle bank account field changes with special formatting for IBAN and other fields
  const handleBankFieldChange = (fieldName: string, value: string) => {
    let formattedValue = value;

    if (countryConfig) {
      // Special handling for IBAN fields
      if (fieldName === 'iban') {
        formattedValue = formatIBAN(value, countryConfig.code);
      }
      // Special handling for other bank account fields
      else if (['sortCode', 'routingNumber', 'bsbNumber', 'institutionNumber', 'transitNumber'].includes(fieldName)) {
        formattedValue = formatBankAccountField(value, fieldName, countryConfig.code);
      }
    }

    setBusinessInfo(prev => ({
      ...prev,
      externalAccount: { ...prev.externalAccount, [fieldName]: formattedValue }
    }));
  };

  if (isLoadingShop || !countryConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set Up Stripe Connect for {countryConfig.name}
        </h2>
        <p className="text-gray-600">
          Configure payment processing for your shop. All information is encrypted and secure.
        </p>
        
        <div className="mt-4 bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Country-Specific Setup</p>
              <p>
                This form is customized for {countryConfig.name} and uses {countryConfig.currency} as the default currency.
                Bank account requirements are specific to {countryConfig.name} banking standards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Type Selection */}
      {step === 'business-type' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Type</h3>
          <p className="text-gray-600 mb-6">
            Select the type of business entity for your {countryConfig.name} operations
          </p>

          <form onSubmit={handleBusinessTypeSubmit} className="space-y-4">
            <div className="space-y-3">
              {countryConfig.supportedBusinessTypes.includes('individual') && (
                <label className="flex items-start space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="businessType"
                    value="individual"
                    checked={businessInfo.businessType === 'individual'}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessType: e.target.value as 'individual' }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Individual / Sole Proprietor</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      You're an individual running a business under your own name
                    </p>
                  </div>
                </label>
              )}

              {countryConfig.supportedBusinessTypes.includes('company') && (
                <label className="flex items-start space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="businessType"
                    value="company"
                    checked={businessInfo.businessType === 'company'}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessType: e.target.value as 'company' }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Company / Corporation</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      You're a registered business entity (LLC, Corporation, etc.)
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Business Information Step */}
      {step === 'business-info' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Information</h3>
          <p className="text-gray-600 mb-6">
            Provide your business details for {countryConfig.name}
          </p>

          <form onSubmit={handleBusinessInfoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Your business name"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder={countryConfig.phonePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website *
                </label>
                <input
                  type="url"
                  required
                  value={businessInfo.businessWebsite || ''}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessWebsite: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="https://yourwebsite.com"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
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

              {countryConfig.hasStates && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {countryConfig.stateLabel} {countryConfig.stateRequired ? '*' : ''}
                  </label>
                  {countryConfig.states ? (
                    <select
                      required={countryConfig.stateRequired}
                      value={businessInfo.businessAddress?.state || ''}
                      onChange={(e) => setBusinessInfo(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, state: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="">Select {countryConfig.stateLabel}</option>
                      {countryConfig.states.map(state => (
                        <option key={state.value} value={state.value}>{state.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required={countryConfig.stateRequired}
                      value={businessInfo.businessAddress?.state || ''}
                      onChange={(e) => setBusinessInfo(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress!, state: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder={countryConfig.stateLabel}
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {countryConfig.postalCodeLabel} {countryConfig.postalCodeRequired ? '*' : ''}
                </label>
                <input
                  type="text"
                  required={countryConfig.postalCodeRequired}
                  value={businessInfo.businessAddress?.postal_code || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    businessAddress: { ...prev.businessAddress!, postal_code: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={countryConfig.postalCodePlaceholder}
                  pattern={countryConfig.postalCodePattern}
                />
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

      {/* Individual Information Step */}
      {step === 'individual-info' && businessInfo.businessType === 'individual' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h3>
          <p className="text-gray-600 mb-6">
            We need some personal details to verify your identity in {countryConfig.name}
          </p>

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
                  placeholder={countryConfig.phonePlaceholder}
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

            {countryConfig.requiresSSN && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {countryConfig.ssnLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={businessInfo.individual?.ssn || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    individual: { ...prev.individual!, ssn: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={`Enter your ${countryConfig.ssnLabel.toLowerCase()}`}
                />
              </div>
            )}

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

      {/* Company Information Step */}
      {step === 'company-info' && businessInfo.businessType === 'company' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Information</h3>
          <p className="text-gray-600 mb-6">
            Provide your company details for {countryConfig.name}
          </p>

          <form onSubmit={handleCompanyInfoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Company Name *
              </label>
              <input
                type="text"
                required
                value={businessInfo.company?.name || ''}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  company: { ...prev.company!, name: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Legal company name"
              />
            </div>

            {countryConfig.requiresTaxId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {countryConfig.taxIdLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={businessInfo.company?.taxId || ''}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    company: { ...prev.company!, taxId: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={`Enter your ${countryConfig.taxIdLabel.toLowerCase()}`}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Phone *
              </label>
              <input
                type="tel"
                required
                value={businessInfo.company?.phone || ''}
                onChange={(e) => setBusinessInfo(prev => ({
                  ...prev,
                  company: { ...prev.company!, phone: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder={countryConfig.phonePlaceholder}
              />
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

      {/* Bank Account Information Step */}
      {step === 'bank-info' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bank Account Information ({countryConfig.currency})
          </h3>
          <p className="text-gray-600 mb-6">
            Add your {countryConfig.name} bank account to receive payments in {countryConfig.currency}
          </p>

          <form onSubmit={handleBankInfoSubmit} className="space-y-4">
            {countryConfig.bankAccountFields.map((field: BankAccountField) => {
              const isIban = field.name === 'iban';
              const placeholder = isIban ? getIBANPlaceholder(countryConfig.code) : field.placeholder;

              // Get help text based on field type
              const getHelpText = () => {
                if (isIban) {
                  return 'Enter your IBAN with or without spaces - it will be formatted automatically';
                }
                if (field.name === 'sortCode') {
                  return 'Enter 6 digits - will be formatted as XX-XX-XX';
                }
                if (field.name === 'bsbNumber') {
                  return 'Enter 6 digits - will be formatted as XXX-XXX';
                }
                if (field.name === 'routingNumber') {
                  return 'Enter 9-digit routing number';
                }
                if (field.name === 'institutionNumber') {
                  return 'Enter 3-digit institution number';
                }
                if (field.name === 'transitNumber') {
                  return 'Enter 5-digit transit number';
                }
                if (field.pattern) {
                  return `Format: ${field.placeholder}`;
                }
                return null;
              };

              const helpText = getHelpText();

              return (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required ? '*' : ''}
                  </label>
                  <input
                    type={field.type}
                    required={field.required}
                    value={businessInfo.externalAccount[field.name] || ''}
                    onChange={(e) => handleBankFieldChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder={placeholder}
                    maxLength={field.maxLength}
                    minLength={field.minLength}
                  />
                  {helpText && (
                    <p className="text-xs text-gray-500 mt-1">
                      {helpText}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Your bank information is secure</p>
                  <p>
                    We use bank-level encryption to protect your financial data and comply with
                    {countryConfig.name}'s banking regulations. Your account details are never stored in plain text.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(businessInfo.businessType === 'individual' ? 'individual-info' : 'company-info')}
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

      {/* Compliance Requirements Step */}
      {step === 'compliance' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Compliance Requirements</h3>
          <p className="text-gray-600 mb-6">
            Please confirm your compliance with {countryConfig.name} regulations and EU requirements
          </p>

          <form onSubmit={handleComplianceSubmit} className="space-y-6">
            {/* Legal Compliance Declaration */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Legal Compliance Declaration</h4>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessInfo.compliance?.legalComplianceDeclaration || false}
                      onChange={(e) => setBusinessInfo(prev => ({
                        ...prev,
                        compliance: { ...prev.compliance!, legalComplianceDeclaration: e.target.checked }
                      }))}
                      className="mt-1"
                      required
                    />
                    <span className="text-sm text-blue-800">
                      I declare that my business complies with all applicable local laws and regulations in {countryConfig.name}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* VAT Registration */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">VAT Registration Status</h4>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vatRegistrationStatus"
                    value="not_required"
                    checked={businessInfo.compliance?.vatRegistrationStatus === 'not_required'}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      compliance: { ...prev.compliance!, vatRegistrationStatus: e.target.value as any }
                    }))}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">VAT registration not required</span>
                    <p className="text-xs text-gray-600">My business is below VAT registration thresholds</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vatRegistrationStatus"
                    value="registered"
                    checked={businessInfo.compliance?.vatRegistrationStatus === 'registered'}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      compliance: { ...prev.compliance!, vatRegistrationStatus: e.target.value as any }
                    }))}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Already VAT registered</span>
                    <p className="text-xs text-gray-600">I have a valid VAT registration number</p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vatRegistrationStatus"
                    value="will_register"
                    checked={businessInfo.compliance?.vatRegistrationStatus === 'will_register'}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      compliance: { ...prev.compliance!, vatRegistrationStatus: e.target.value as any }
                    }))}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Will register for VAT</span>
                    <p className="text-xs text-gray-600">I will register for VAT when required</p>
                  </div>
                </label>
              </div>

              {businessInfo.compliance?.vatRegistrationStatus === 'registered' && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessInfo.compliance?.vatNumber || ''}
                      onChange={(e) => setBusinessInfo(prev => ({
                        ...prev,
                        compliance: { ...prev.compliance!, vatNumber: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="e.g., BG123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Country *
                    </label>
                    <input
                      type="text"
                      required
                      value={businessInfo.compliance?.vatCountry || businessInfo.businessCountry}
                      onChange={(e) => setBusinessInfo(prev => ({
                        ...prev,
                        compliance: { ...prev.compliance!, vatCountry: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="Country code"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Additional Compliance Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Additional Compliance Obligations</h4>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessInfo.compliance?.invoicingCustomers || false}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance!, invoicingCustomers: e.target.checked }
                  }))}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Customer Invoicing</span>
                  <p className="text-xs text-gray-600">I will issue proper invoices to customers when required</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessInfo.compliance?.incomeReporting || false}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance!, incomeReporting: e.target.checked }
                  }))}
                  className="mt-1"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Income Reporting</span>
                  <p className="text-xs text-gray-600">I will report income to tax authorities as required</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessInfo.compliance?.dac7Compliance || false}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance!, dac7Compliance: e.target.checked }
                  }))}
                  className="mt-1"
                  required
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">DAC7 Compliance *</span>
                  <p className="text-xs text-gray-600">I agree to provide truthful, up-to-date information for EU tax reporting</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessInfo.compliance?.refundsDisputes || false}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance!, refundsDisputes: e.target.checked }
                  }))}
                  className="mt-1"
                  required
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Customer Disputes *</span>
                  <p className="text-xs text-gray-600">I acknowledge responsibility for handling refunds and disputes with my customers</p>
                </div>
              </label>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important Notice</p>
                  <p>
                    These compliance requirements are mandatory for operating a business through our platform.
                    Failure to comply with local regulations may result in account suspension.
                  </p>
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
              <Button type="submit" disabled={isLoading}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Review & Submit</h3>
          <p className="text-gray-600 mb-6">
            Please review your information for {countryConfig.name} before submitting
          </p>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Business Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Business Type:</span>
                  <span className="ml-2 font-medium capitalize">{businessInfo.businessType}</span>
                </div>
                <div>
                  <span className="text-gray-600">Country:</span>
                  <span className="ml-2 font-medium">{countryConfig.name}</span>
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
                <div>
                  <span className="text-gray-600">Currency:</span>
                  <span className="ml-2 font-medium">{countryConfig.currency}</span>
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
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{businessInfo.individual.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="ml-2 font-medium">
                      {businessInfo.individual.dateOfBirth?.month}/{businessInfo.individual.dateOfBirth?.day}/{businessInfo.individual.dateOfBirth?.year}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {businessInfo.businessType === 'company' && businessInfo.company && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Company Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Legal Name:</span>
                    <span className="ml-2 font-medium">{businessInfo.company.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{countryConfig.taxIdLabel}:</span>
                    <span className="ml-2 font-medium">{businessInfo.company.taxId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{businessInfo.company.phone}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Bank Account ({countryConfig.currency})</h4>
              <div className="text-sm space-y-2">
                {countryConfig.bankAccountFields.map((field: BankAccountField) => (
                  <div key={field.name}>
                    <span className="text-gray-600">{field.label}:</span>
                    <span className="ml-2 font-medium">
                      {field.name.includes('account') || field.name.includes('iban')
                        ? `****${businessInfo.externalAccount[field.name]?.slice(-4) || ''}`
                        : businessInfo.externalAccount[field.name]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Compliance Status</h4>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-600">Legal Compliance:</span>
                  <span className="ml-2 font-medium">
                    {businessInfo.compliance?.legalComplianceDeclaration ? '✅ Declared' : '❌ Not declared'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">VAT Status:</span>
                  <span className="ml-2 font-medium capitalize">
                    {businessInfo.compliance?.vatRegistrationStatus?.replace('_', ' ')}
                    {businessInfo.compliance?.vatRegistrationStatus === 'registered' && businessInfo.compliance?.vatNumber &&
                      ` (${businessInfo.compliance.vatNumber})`
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">DAC7 Compliance:</span>
                  <span className="ml-2 font-medium">
                    {businessInfo.compliance?.dac7Compliance ? '✅ Agreed' : '❌ Not agreed'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Customer Disputes:</span>
                  <span className="ml-2 font-medium">
                    {businessInfo.compliance?.refundsDisputes ? '✅ Acknowledged' : '❌ Not acknowledged'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Invoicing:</span>
                  <span className="ml-2 font-medium">
                    {businessInfo.compliance?.invoicingCustomers ? '✅ Will provide' : '❌ Not confirmed'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Income Reporting:</span>
                  <span className="ml-2 font-medium">
                    {businessInfo.compliance?.incomeReporting ? '✅ Will report' : '❌ Not confirmed'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Terms of Service</p>
                  <p>
                    By submitting this form, you agree to Stripe's Terms of Service for {countryConfig.name}
                    and authorize us to process payments on your behalf in {countryConfig.currency}.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('compliance')}
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

export default CountrySpecificConnectSetup;
