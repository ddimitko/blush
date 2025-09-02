import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  AlertTriangle,
  Wifi,
  Server,
  Lock,
  RefreshCw,
  ArrowLeft,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  Construction,
  Zap
} from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  variant?: 'network' | 'server' | 'unauthorized' | 'forbidden' | 'notFound' | 'conflict' | 'general' | 'maintenance' | 'inline';
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
  showDetails?: boolean;
  retryCount?: number;
  maxRetries?: number;
  supportEmail?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  variant = 'general',
  title,
  description,
  error,
  onRetry,
  onGoBack,
  onGoHome,
  className,
  showDetails = false,
  retryCount = 0,
  maxRetries = 3,
  supportEmail = 'support@beautyhub.com'
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const getVariantConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: Wifi,
          defaultTitle: 'Connection Problem',
          defaultDescription: 'Please check your internet connection and try again.',
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50',
        };
      case 'server':
        return {
          icon: Server,
          defaultTitle: 'Server Error',
          defaultDescription: 'Our servers are experiencing issues. Please try again in a few moments.',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      case 'unauthorized':
        return {
          icon: Lock,
          defaultTitle: 'Authentication Required',
          defaultDescription: 'Please sign in to access this content.',
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
        };
      case 'forbidden':
        return {
          icon: Lock,
          defaultTitle: 'Access Denied',
          defaultDescription: 'You don\'t have permission to access this resource.',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      case 'notFound':
        return {
          icon: AlertTriangle,
          defaultTitle: 'Not Found',
          defaultDescription: 'The requested resource was not found.',
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
        };
      case 'conflict':
        return {
          icon: AlertTriangle,
          defaultTitle: 'Conflict Error',
          defaultDescription: 'The request conflicts with existing data. Please check your input and try again.',
          iconColor: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
        };
      case 'maintenance':
        return {
          icon: Construction,
          defaultTitle: 'Under Maintenance',
          defaultDescription: 'We\'re currently performing maintenance. Please check back in a few minutes.',
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
        };
      case 'inline':
        return {
          icon: Zap,
          defaultTitle: 'Oops!',
          defaultDescription: 'Something went wrong with this request.',
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50',
        };
      default:
        return {
          icon: AlertTriangle,
          defaultTitle: 'Something went wrong',
          defaultDescription: 'An unexpected error occurred. Please try again.',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  const errorMessage = typeof error === 'string' ? error : error?.message;
  const errorStack = typeof error === 'object' && error && 'stack' in error ? error.stack : undefined;

  const copyErrorDetails = async () => {
    const details = `Error: ${errorMessage}\nStack: ${errorStack}\nTimestamp: ${new Date().toISOString()}`;
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  const isInlineVariant = variant === 'inline';
  const containerClasses = isInlineVariant
    ? 'flex items-center justify-center py-8 px-4 text-center'
    : 'flex flex-col items-center justify-center py-12 px-4 text-center';

  return (
    <div className={cn(containerClasses, className)}>
      <div className={cn(
        'rounded-full flex items-center justify-center mb-4',
        isInlineVariant ? 'w-12 h-12' : 'w-16 h-16',
        config.bgColor
      )}>
        <Icon className={cn(isInlineVariant ? 'w-6 h-6' : 'w-8 h-8', config.iconColor)} />
      </div>

      <div className={isInlineVariant ? 'text-left ml-4' : 'text-center'}>
        <h3 className={cn(
          'font-medium text-gray-900 mb-2',
          isInlineVariant ? 'text-base' : 'text-lg'
        )}>
          {title || config.defaultTitle}
        </h3>

        <p className={cn(
          'text-gray-600 leading-relaxed',
          isInlineVariant ? 'text-sm mb-3' : 'mb-6 max-w-sm'
        )}>
          {description || config.defaultDescription}
        </p>

        {/* Enhanced error details with copy functionality */}
        {errorMessage && (showDetails || process.env.NODE_ENV === 'development') && (
          <div className="mb-6 max-w-md">
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              {showErrorDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showErrorDetails ? 'Hide' : 'Show'} Error Details
            </button>

            {showErrorDetails && (
              <div className="p-3 bg-gray-100 rounded-lg text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Error Details</span>
                  <button
                    onClick={copyErrorDetails}
                    className="flex items-center text-xs text-gray-600 hover:text-gray-800"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-700 font-mono bg-white p-2 rounded border">
                  {errorMessage}
                </div>
                {retryCount > 0 && (
                  <div className="text-xs text-gray-600 mt-2">
                    Retry attempts: {retryCount}/{maxRetries}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced action buttons */}
        <div className={cn(
          'flex gap-3',
          isInlineVariant ? 'flex-row' : 'flex-col sm:flex-row'
        )}>
          {onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
              disabled={retryCount >= maxRetries}
              className="inline-flex items-center"
              size={isInlineVariant ? 'sm' : 'md'}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again'}
            </Button>
          )}

          {onGoBack && (
            <Button
              variant="outline"
              onClick={onGoBack}
              className="inline-flex items-center"
              size={isInlineVariant ? 'sm' : 'md'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}

          {onGoHome && (
            <Button
              variant="outline"
              onClick={onGoHome}
              className="inline-flex items-center"
              size={isInlineVariant ? 'sm' : 'md'}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          )}
        </div>

        {/* Support contact for persistent errors */}
        {retryCount >= maxRetries && supportEmail && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Still having trouble?</p>
            <p>
              Contact our support team at{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="underline hover:no-underline"
              >
                {supportEmail}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized error state components
export const NetworkErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorState
    variant="network"
    onRetry={onRetry}
  />
);

export const ServerErrorState: React.FC<{ onRetry?: () => void; error?: Error | string }> = ({ onRetry, error }) => (
  <ErrorState
    variant="server"
    error={error}
    onRetry={onRetry}
    showDetails={process.env.NODE_ENV === 'development'}
  />
);

export const UnauthorizedErrorState: React.FC<{ onSignIn?: () => void }> = ({ onSignIn }) => (
  <ErrorState
    variant="unauthorized"
    onRetry={onSignIn}
  />
);

export const NotFoundErrorState: React.FC<{ onGoHome?: () => void; onGoBack?: () => void }> = ({
  onGoHome,
  onGoBack
}) => (
  <ErrorState
    variant="notFound"
    onGoHome={onGoHome}
    onGoBack={onGoBack}
  />
);

export const InlineErrorState: React.FC<{
  error?: Error | string;
  onRetry?: () => void;
  retryCount?: number;
}> = ({ error, onRetry, retryCount }) => (
  <ErrorState
    variant="inline"
    error={error}
    onRetry={onRetry}
    retryCount={retryCount}
    showDetails={true}
  />
);

export const MaintenanceErrorState: React.FC<{
  estimatedTime?: string;
  onGoHome?: () => void;
}> = ({ estimatedTime, onGoHome }) => (
  <ErrorState
    variant="maintenance"
    description={estimatedTime ? `We'll be back in approximately ${estimatedTime}.` : undefined}
    onGoHome={onGoHome}
  />
);

export const ConflictErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
}> = ({ message, onRetry, onGoBack }) => (
  <ErrorState
    variant="conflict"
    description={message}
    onRetry={onRetry}
    onGoBack={onGoBack}
  />
);

export const ResourceNotFoundErrorState: React.FC<{
  resource?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
}> = ({ resource, onGoHome, onGoBack }) => (
  <ErrorState
    variant="notFound"
    title={resource ? `${resource} Not Found` : undefined}
    onGoHome={onGoHome}
    onGoBack={onGoBack}
  />
);

export default ErrorState;
