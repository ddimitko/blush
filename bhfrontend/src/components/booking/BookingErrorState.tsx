import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Wifi, Clock } from 'lucide-react';
import Button from '../ui/Button';

interface BookingErrorStateProps {
  type?: 'network' | 'timeout' | 'validation' | 'payment' | 'general';
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
}

const BookingErrorState: React.FC<BookingErrorStateProps> = ({
  type = 'general',
  title,
  message,
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = true
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <Wifi className="h-12 w-12 text-red-500" />,
          defaultTitle: 'Connection Problem',
          defaultMessage: 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100'
        };
      case 'timeout':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          defaultTitle: 'Request Timeout',
          defaultMessage: 'The request is taking longer than expected. This might be due to high traffic. Please try again.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconBg: 'bg-yellow-100'
        };
      case 'validation':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-orange-500" />,
          defaultTitle: 'Validation Error',
          defaultMessage: 'Please check your information and make sure all required fields are filled correctly.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconBg: 'bg-orange-100'
        };
      case 'payment':
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
          defaultTitle: 'Payment Error',
          defaultMessage: 'There was an issue processing your payment. Please check your payment details and try again.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100'
        };
      default:
        return {
          icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
          defaultTitle: 'Something went wrong',
          defaultMessage: 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100'
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Error Icon */}
      <div className={`p-6 rounded-full ${config.iconBg} mb-6 animate-pulse`}>
        {config.icon}
      </div>

      {/* Error Content */}
      <div className="text-center max-w-md mx-auto mb-8">
        <h3 className="text-xl font-bold text-neutral-800 mb-3">
          {title || config.defaultTitle}
        </h3>
        <p className="text-neutral-600 leading-relaxed">
          {message || config.defaultMessage}
        </p>
      </div>

      {/* Error Details Card */}
      <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-6 mb-8 max-w-md w-full`}>
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-neutral-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-neutral-700">
            <p className="font-medium mb-1">What you can do:</p>
            <ul className="space-y-1 text-neutral-600">
              {type === 'network' && (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Wait a moment and try again</li>
                </>
              )}
              {type === 'timeout' && (
                <>
                  <li>• Wait a few seconds and retry</li>
                  <li>• Check if your connection is stable</li>
                  <li>• Try again during off-peak hours</li>
                </>
              )}
              {type === 'validation' && (
                <>
                  <li>• Review all form fields</li>
                  <li>• Ensure required information is complete</li>
                  <li>• Check for any error messages</li>
                </>
              )}
              {type === 'payment' && (
                <>
                  <li>• Verify your payment information</li>
                  <li>• Check your card details</li>
                  <li>• Try a different payment method</li>
                </>
              )}
              {type === 'general' && (
                <>
                  <li>• Refresh the page and try again</li>
                  <li>• Clear your browser cache</li>
                  <li>• Contact support if issue persists</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            size="lg"
            className="min-w-[140px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {showGoBack && onGoBack && (
          <Button
            onClick={onGoBack}
            variant="secondary"
            size="lg"
            className="min-w-[140px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-sm text-neutral-500 mt-6 text-center">
        Need help? Contact our support team at{' '}
        <a href="mailto:support@lunara.com" className="text-accent-600 hover:text-accent-700 font-medium">
          support@lunara.com
        </a>
      </p>
    </div>
  );
};

export default BookingErrorState;
