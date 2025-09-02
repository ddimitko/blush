import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bars' | 'minimal' | 'beauty' | 'luxury';
  className?: string;
  text?: string;
  color?: 'gray' | 'accent' | 'white' | 'pink' | 'gold';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  text,
  color = 'gray'
}) => {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colors = {
    gray: 'text-gray-600',
    accent: 'text-accent-600',
    white: 'text-white',
    pink: 'text-pink-500',
    gold: 'text-yellow-500',
  };

  const dotColors = {
    gray: 'bg-gray-600',
    accent: 'bg-accent-600',
    white: 'bg-white',
    pink: 'bg-pink-500',
    gold: 'bg-yellow-500',
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="loading-dots">
          <div className={dotColors[color]}></div>
          <div className={dotColors[color]}></div>
          <div className={dotColors[color]}></div>
        </div>
        {text && (
          <span className={cn('ml-3 text-sm font-medium', colors[color])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
        <div className={cn('rounded-full animate-pulse', sizes[size], dotColors[color])}></div>
        {text && (
          <p className={cn('text-sm font-medium animate-pulse', colors[color])}>{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-center justify-center space-x-1', className)}>
        <div className={cn('w-1 h-4 animate-bounce', dotColors[color])} style={{ animationDelay: '0ms' }}></div>
        <div className={cn('w-1 h-4 animate-bounce', dotColors[color])} style={{ animationDelay: '150ms' }}></div>
        <div className={cn('w-1 h-4 animate-bounce', dotColors[color])} style={{ animationDelay: '300ms' }}></div>
        <div className={cn('w-1 h-4 animate-bounce', dotColors[color])} style={{ animationDelay: '450ms' }}></div>
        {text && (
          <span className={cn('ml-3 text-sm font-medium', colors[color])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className={cn('border-2 border-current border-t-transparent rounded-full animate-spin', sizes[size], colors[color])}></div>
        {text && (
          <span className={cn('ml-3 text-sm font-medium', colors[color])}>{text}</span>
        )}
      </div>
    );
  }

  if (variant === 'beauty') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
        <div className="relative">
          <div className={cn('rounded-full animate-pulse bg-gradient-to-r from-pink-400 to-rose-400', sizes[size])}></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-300 to-rose-300 animate-ping opacity-75"></div>
          <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-bounce"></div>
        </div>
        {text && (
          <p className="text-sm font-medium text-pink-600 animate-pulse">{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'luxury') {
    return (
      <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
        <div className="relative">
          <div className={cn('rounded-full border-2 border-yellow-400 animate-spin', sizes[size])} style={{
            background: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #d97706, #fbbf24)',
          }}></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-300 animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-yellow-600 rounded-full animate-ping"></div>
          </div>
        </div>
        {text && (
          <p className="text-sm font-medium text-yellow-700 animate-pulse">{text}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <svg
        className={cn('animate-spin', sizes[size], colors[color])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <p className={cn('text-sm font-medium', colors[color])}>{text}</p>
      )}
    </div>
  );
};

// Specialized loading components for different contexts
export const BeautyLoadingSpinner: React.FC<{
  text?: string;
  size?: LoadingSpinnerProps['size'];
  className?: string;
}> = ({
  text = "Loading beauty...",
  size = 'md',
  className
}) => (
  <LoadingSpinner
    variant="beauty"
    color="pink"
    text={text}
    size={size}
    className={className}
  />
);

export const LuxuryLoadingSpinner: React.FC<{
  text?: string;
  size?: LoadingSpinnerProps['size'];
  className?: string;
}> = ({
  text = "Preparing your experience...",
  size = 'lg',
  className
}) => (
  <LoadingSpinner
    variant="luxury"
    color="gold"
    text={text}
    size={size}
    className={className}
  />
);

export const QuickLoadingSpinner: React.FC<{
  size?: LoadingSpinnerProps['size'];
  className?: string;
}> = ({
  size = 'sm',
  className
}) => (
  <LoadingSpinner
    variant="dots"
    color="accent"
    size={size}
    className={className}
  />
);

export const InlineLoadingSpinner: React.FC<{
  text?: string;
  className?: string;
}> = ({
  text,
  className
}) => (
  <LoadingSpinner
    variant="minimal"
    color="gray"
    size="sm"
    text={text}
    className={className}
  />
);

export default LoadingSpinner;
