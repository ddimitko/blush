import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ShopCreationSuccessScreenProps {
  shopName: string;
  onComplete: () => void;
  redirectDelay?: number; // in milliseconds, default 3000
}

export const ShopCreationSuccessScreen: React.FC<ShopCreationSuccessScreenProps> = ({
  shopName,
  onComplete,
  redirectDelay = 3000,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(redirectDelay / 1000));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Use setTimeout to avoid calling onComplete during render
          setTimeout(() => onComplete(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "max-w-md w-full text-center transition-all duration-1000 ease-out",
          isVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        {/* Success Icon with Animation */}
        <div className="relative mb-8">
          <div
            className={cn(
              "mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center transition-all duration-1000 delay-300",
              isVisible ? "scale-100 rotate-0" : "scale-0 rotate-180"
            )}
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          {/* Sparkle animations */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <Sparkles
                key={i}
                className={cn(
                  "absolute w-4 h-4 text-yellow-400 transition-all duration-1000",
                  isVisible ? "opacity-100" : "opacity-0",
                  i === 0 && "top-2 left-8 animate-pulse delay-500",
                  i === 1 && "top-8 right-4 animate-pulse delay-700",
                  i === 2 && "bottom-8 left-4 animate-pulse delay-900",
                  i === 3 && "bottom-2 right-8 animate-pulse delay-1100",
                  i === 4 && "top-1/2 left-2 animate-pulse delay-600",
                  i === 5 && "top-1/2 right-2 animate-pulse delay-800"
                )}
              />
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div
          className={cn(
            "transition-all duration-1000 delay-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Congratulations!
          </h1>
          <p className="text-lg text-gray-700 mb-2">
            Your shop <span className="font-semibold text-green-600">{shopName}</span> has been created successfully!
          </p>
          <p className="text-gray-600 mb-8">
            Your subscription is now active and you're ready to start managing your beauty business.
          </p>
        </div>

        {/* Redirect Message */}
        <div
          className={cn(
            "bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-green-200 transition-all duration-1000 delay-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <div className="flex items-center justify-center gap-2 text-green-700 mb-3">
            <ArrowRight className="w-5 h-5" />
            <span className="font-medium">Redirecting to your dashboard</span>
          </div>
          
          <div className="text-2xl font-bold text-green-600 mb-2">
            {countdown}
          </div>
          
          <div className="text-sm text-gray-600">
            seconds remaining
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${((redirectDelay / 1000 - countdown) / (redirectDelay / 1000)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={() => setTimeout(() => onComplete(), 0)}
          className={cn(
            "mt-6 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 delay-1000",
            isVisible ? "opacity-100" : "opacity-0"
          )}
        >
          Skip and go to dashboard →
        </button>
      </div>
    </div>
  );
};
