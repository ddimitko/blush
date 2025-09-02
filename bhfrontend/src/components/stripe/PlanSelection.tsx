import React from 'react';
import { 
  Star,
  Users,
  Calendar,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

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

interface PlanSelectionProps {
  plans: Plan[];
  onPlanSelect: (plan: Plan) => void;
  isLoading: boolean;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({
  plans,
  onPlanSelect,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('appointment')) return <Calendar className="w-4 h-4" />;
    if (feature.toLowerCase().includes('customer')) return <Users className="w-4 h-4" />;
    if (feature.toLowerCase().includes('premium') || feature.toLowerCase().includes('priority')) return <Star className="w-4 h-4" />;
    return <Zap className="w-4 h-4" />;
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Subscription Plan
        </h2>
        <p className="text-gray-600">
          Select the plan that best fits your business needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white border-2 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
              plan.isYearly ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
            }`}
          >
            {plan.isYearly && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {plan.savings && (
              <div className="absolute -top-3 right-4">
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {plan.savings}
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {plan.displayName}
              </h3>
              <div className="mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.formattedPrice}
                </span>
                <span className="text-gray-600 ml-1">
                  /{plan.interval}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {plan.description}
              </p>
            </div>

            {plan.features && plan.features.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  What's included:
                </h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 mr-3 mt-0.5">
                        <div className="text-indigo-600">
                          {getFeatureIcon(feature)}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant={plan.isYearly ? 'primary' : 'outline'}
              onClick={() => onPlanSelect(plan)}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Select {plan.displayName}
            </Button>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Plans Available
          </h3>
          <p className="text-gray-600">
            Please contact support to set up subscription plans.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlanSelection;
