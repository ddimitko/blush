import React from 'react';
import { Sparkles, Clock, Calendar, User } from 'lucide-react';

interface BookingLoadingSpinnerProps {
  step?: 'service' | 'employee' | 'datetime' | 'details' | 'payment';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BookingLoadingSpinner: React.FC<BookingLoadingSpinnerProps> = ({
  step = 'service',
  message,
  size = 'md'
}) => {
  const getStepIcon = () => {
    switch (step) {
      case 'service':
        return <Sparkles className="h-8 w-8 text-accent-600" />;
      case 'employee':
        return <User className="h-8 w-8 text-accent-600" />;
      case 'datetime':
        return <Calendar className="h-8 w-8 text-accent-600" />;
      case 'details':
        return <User className="h-8 w-8 text-accent-600" />;
      case 'payment':
        return <Clock className="h-8 w-8 text-accent-600" />;
      default:
        return <Sparkles className="h-8 w-8 text-accent-600" />;
    }
  };

  const getStepMessage = () => {
    if (message) return message;
    
    switch (step) {
      case 'service':
        return 'Loading available services...';
      case 'employee':
        return 'Finding your specialists...';
      case 'datetime':
        return 'Checking availability...';
      case 'details':
        return 'Preparing your information...';
      case 'payment':
        return 'Processing your booking...';
      default:
        return 'Loading...';
    }
  };

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Main Spinner */}
      <div className="relative mb-6">
        {/* Outer Ring */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-accent-200 animate-spin`}>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-600 animate-spin" 
               style={{ animationDuration: '1s' }} />
        </div>
        
        {/* Inner Ring */}
        <div className={`absolute inset-2 rounded-full border-2 border-accent-100 animate-spin`}
             style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-r-accent-500 animate-spin"
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 bg-white rounded-full shadow-lg animate-pulse">
            {getStepIcon()}
          </div>
        </div>
        
        {/* Floating Particles */}
        <div className="absolute -inset-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent-400 rounded-full animate-ping opacity-60"
              style={{
                top: `${20 + Math.sin(i * 60 * Math.PI / 180) * 40}%`,
                left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 40}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          {getStepMessage()}
        </h3>
        <p className="text-sm text-neutral-600 animate-pulse">
          Please wait while we prepare everything for you
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex space-x-2 mt-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-accent-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default BookingLoadingSpinner;
