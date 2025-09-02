import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Star,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { apiClient } from '../../lib/api';
import PlanSelection from './PlanSelection';
import CustomerDetailsForm from './CustomerDetailsForm';
import SubscriptionPaymentForm from './SubscriptionPaymentForm';
import SubscriptionConfirmation from './SubscriptionConfirmation';

interface ComprehensiveSubscriptionSetupProps {
  shopId: string;
  onSubscriptionComplete: () => void;
  existingStripeDetails?: any; // Optional existing Stripe details for shops that already have some setup
}

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

type SetupStep = 'plans' | 'customer' | 'confirmation' | 'payment' | 'success';

const ComprehensiveSubscriptionSetup: React.FC<ComprehensiveSubscriptionSetupProps> = ({
  shopId,
  onSubscriptionComplete,
  existingStripeDetails
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>('plans');
  const [isProcessing, setIsProcessing] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    loadPlans();
    loadShopOwnerInfo();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getSubscriptionPlans();
      setPlans(response);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      error('Error', 'Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShopOwnerInfo = async () => {
    try {
      // Get shop details to pre-fill customer information
      const shopResponse = await apiClient.getShopDetails(shopId);
      console.log('Shop response for pre-filling:', shopResponse);

      if (shopResponse.owner) {
        const ownerName = `${shopResponse.owner.firstName || ''} ${shopResponse.owner.lastName || ''}`.trim();
        console.log('Pre-filling customer info with:', {
          name: ownerName,
          email: shopResponse.owner.email,
          address: shopResponse.address
        });

        setCustomerInfo(prev => ({
          ...prev,
          name: ownerName,
          email: shopResponse.owner.email || '',
          billingAddress: {
            ...prev.billingAddress,
            line1: shopResponse.address || '',
            city: shopResponse.city || '',
            state: shopResponse.state || '',
            postal_code: shopResponse.postalCode || '',
            country: shopResponse.country || 'US'
          }
        }));
      }
    } catch (err: any) {
      console.error('Error loading shop owner info:', err);
      // Don't show error to user, just continue with empty form
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('customer');
  };

  const handleCustomerDetailsComplete = (details: CustomerInfo) => {
    if (!selectedPlan) {
      error('Error', 'No plan selected');
      return;
    }

    setCustomerInfo(details);
    // Go directly to confirmation step to review details before payment
    setStep('confirmation');
  };

  const handlePaymentSuccess = () => {
    // Payment completed successfully and subscription is already activated
    success('Success', 'Subscription activated successfully!');
    setStep('success');
    setTimeout(() => {
      onSubscriptionComplete();
    }, 2000);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan || !customerInfo) {
      error('Error', 'Missing plan or customer information');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent for subscription setup (new workflow)
      console.log('Creating subscription setup payment intent with data:', {
        stripePriceId: selectedPlan.id,
        customerName: customerInfo.name.trim(),
        customerEmail: customerInfo.email.trim(),
        billingAddress: customerInfo.billingAddress
      });

      const response = await apiClient.createSubscriptionSetupPaymentIntent(shopId, {
        stripePriceId: selectedPlan.id,
        customerName: customerInfo.name.trim(),
        customerEmail: customerInfo.email.trim(),
        billingAddress: customerInfo.billingAddress
      });

      console.log('Payment intent response:', response);

      if (response.clientSecret && response.setupIntentId) {
        // Setup intent created - proceed to payment step
        console.log('Client secret received, proceeding to payment step');
        setClientSecret(response.clientSecret);
        setPaymentIntentId(response.setupIntentId); // Using setupIntentId for the new workflow
        setStep('payment');
      } else {
        console.error('Unexpected response format:', response);
        error('Error', 'Failed to create setup intent for subscription setup');
      }
    } catch (err: any) {
      console.error('Error creating subscription setup payment intent:', err);
      error('Error', err.response?.data?.message || 'Failed to create payment intent for subscription setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'customer':
        setStep('plans');
        break;
      case 'confirmation':
        setStep('customer');
        break;
      case 'payment':
        setStep('confirmation');
        break;
      default:
        break;
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
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step === 'plans' ? 'text-indigo-600' : (step === 'customer' || step === 'payment' || step === 'confirmation' || step === 'success') ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'plans' ? 'bg-indigo-600 text-white' : (step === 'customer' || step === 'payment' || step === 'confirmation' || step === 'success') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {(step === 'customer' || step === 'payment' || step === 'confirmation' || step === 'success') ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Select Plan</span>
          </div>

          <div className={`flex items-center ${step === 'customer' ? 'text-indigo-600' : (step === 'payment' || step === 'confirmation' || step === 'success') ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'customer' ? 'bg-indigo-600 text-white' : (step === 'payment' || step === 'confirmation' || step === 'success') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {(step === 'payment' || step === 'confirmation' || step === 'success') ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span className="ml-2 text-sm font-medium">Customer Details</span>
          </div>

          <div className={`flex items-center ${step === 'confirmation' ? 'text-indigo-600' : (step === 'payment' || step === 'success') ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirmation' ? 'bg-indigo-600 text-white' : (step === 'payment' || step === 'success') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {(step === 'payment' || step === 'success') ? <CheckCircle className="w-5 h-5" /> : '3'}
            </div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>

          <div className={`flex items-center ${step === 'payment' ? 'text-indigo-600' : step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-indigo-600 text-white' : step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {step === 'success' ? <CheckCircle className="w-5 h-5" /> : '4'}
            </div>
            <span className="ml-2 text-sm font-medium">Payment</span>
          </div>
        </div>
      </div>

      {/* Setup Required Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Subscription Required
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Your shop is currently inactive. Complete your subscription setup to activate your shop and make it visible to customers.
            </p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {step === 'plans' && (
        <PlanSelection
          plans={plans}
          onPlanSelect={handlePlanSelect}
          isLoading={isLoading}
        />
      )}

      {step === 'customer' && selectedPlan && (
        <CustomerDetailsForm
          initialCustomerInfo={customerInfo}
          selectedPlan={selectedPlan}
          onComplete={handleCustomerDetailsComplete}
          onBack={handleBack}
          isProcessing={isProcessing}
        />
      )}

      {step === 'payment' && selectedPlan && (
        <>
          {clientSecret && paymentIntentId ? (
            <SubscriptionPaymentForm
              selectedPlan={selectedPlan}
              customerInfo={customerInfo}
              clientSecret={clientSecret}
              paymentIntentId={paymentIntentId}
              shopId={shopId}
              onSuccess={handlePaymentSuccess}
              onBack={handleBack}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Setting up payment...
              </h3>
              <p className="text-gray-600">
                Please wait while we prepare your payment form.
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Details
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'confirmation' && selectedPlan && (
        <SubscriptionConfirmation
          selectedPlan={selectedPlan}
          customerInfo={customerInfo}
          onConfirm={handleConfirmSubscription}
          onBack={handleBack}
          isProcessing={isProcessing}
        />
      )}

      {step === 'success' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Subscription Created Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            Your shop is now active and visible to customers.
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-500">Redirecting to dashboard...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveSubscriptionSetup;
