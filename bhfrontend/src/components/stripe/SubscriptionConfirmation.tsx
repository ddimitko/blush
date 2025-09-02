import React from 'react';
import { 
  CreditCard,
  User,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';

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

interface SubscriptionConfirmationProps {
  selectedPlan: Plan;
  customerInfo: CustomerInfo;
  onConfirm: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

const SubscriptionConfirmation: React.FC<SubscriptionConfirmationProps> = ({
  selectedPlan,
  customerInfo,
  onConfirm,
  onBack,
  isProcessing
}) => {
  const formatAddress = (address: CustomerInfo['billingAddress']) => {
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Confirm Your Subscription
        </h2>
        <p className="text-gray-600">
          Please review your subscription details before confirming
        </p>
      </div>

      <div className="space-y-6">
        {/* Plan Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Subscription Plan
          </h3>
          
          <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
            <div>
              <h4 className="text-lg font-semibold text-indigo-900">
                {selectedPlan.displayName}
              </h4>
              <p className="text-sm text-indigo-700">
                {selectedPlan.description}
              </p>
              {selectedPlan.features && selectedPlan.features.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-indigo-600 font-medium mb-1">Includes:</p>
                  <ul className="text-xs text-indigo-600 space-y-1">
                    {selectedPlan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {feature}
                      </li>
                    ))}
                    {selectedPlan.features.length > 3 && (
                      <li className="text-indigo-500">
                        +{selectedPlan.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-900">
                {selectedPlan.formattedPrice}
              </div>
              <div className="text-sm text-indigo-700">
                per {selectedPlan.interval}
              </div>
              {selectedPlan.savings && (
                <div className="mt-1">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {selectedPlan.savings}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Customer Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Full Name
              </label>
              <p className="text-gray-900">{customerInfo.name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email Address
              </label>
              <p className="text-gray-900">{customerInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Billing Address
          </h3>
          
          <div className="text-gray-900">
            <p>{customerInfo.billingAddress.line1}</p>
            {customerInfo.billingAddress.line2 && (
              <p>{customerInfo.billingAddress.line2}</p>
            )}
            <p>
              {customerInfo.billingAddress.city}, {customerInfo.billingAddress.state} {customerInfo.billingAddress.postal_code}
            </p>
            <p>{customerInfo.billingAddress.country}</p>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Secure Payment Processing
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Your subscription will be created and activated immediately. You will receive a confirmation email with your subscription details.
              </p>
            </div>
          </div>
        </div>

        {/* Terms Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                By confirming this subscription, you agree to our{' '}
                <a href="/terms" className="text-indigo-600 hover:text-indigo-500 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-indigo-600 hover:text-indigo-500 underline">
                  Privacy Policy
                </a>
                . Your subscription will automatically renew each {selectedPlan.interval} unless cancelled.
              </p>
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
            Back to Details
          </Button>
          
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={isProcessing}
            isLoading={isProcessing}
            icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          >
            {isProcessing ? 'Creating Subscription...' : 'Confirm Subscription'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionConfirmation;
