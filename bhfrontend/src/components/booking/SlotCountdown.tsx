import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useBookingUIStore } from '../../store/uiStore';

interface SlotCountdownProps {
  onExpired: () => void;
}

const SlotCountdown: React.FC<SlotCountdownProps> = ({ onExpired }) => {
  const { currentLockSessionId } = useBookingUIStore();
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const hasCalledExpiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);

  // Update the ref when onExpired changes, but don't trigger re-renders
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  // Memoized callback to prevent unnecessary re-renders
  const handleExpired = useCallback(() => {
    if (!hasCalledExpiredRef.current) {
      hasCalledExpiredRef.current = true;
      setIsExpired(true);
      onExpiredRef.current();
    }
  }, []);

  useEffect(() => {
    if (!currentLockSessionId) {
      handleExpired();
      return;
    }

    // Reset timer when a new lock is acquired
    setTimeLeft(300);
    setIsExpired(false);
    hasCalledExpiredRef.current = false;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLockSessionId, handleExpired]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return (timeLeft / 300) * 100;
  };

  const getStatusColor = (): string => {
    if (isExpired) return 'text-red-600';
    if (timeLeft <= 60) return 'text-red-600';
    if (timeLeft <= 120) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (): string => {
    if (isExpired) return 'bg-red-500';
    if (timeLeft <= 60) return 'bg-red-500';
    if (timeLeft <= 120) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!currentLockSessionId && !isExpired) {
    return null;
  }

  return (
    <div className={`
      p-6 rounded-2xl border-2 transition-all duration-500
      ${isExpired
        ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 shadow-lg'
        : timeLeft <= 60
        ? 'bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-400 shadow-lg animate-pulse'
        : 'bg-gradient-to-br from-accent-50 to-accent-100 border-accent-300 shadow-md'
      }
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            isExpired
              ? 'bg-red-200'
              : timeLeft <= 60
              ? 'bg-yellow-200'
              : 'bg-accent-200'
          }`}>
            {isExpired ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Clock className={`h-5 w-5 ${getStatusColor()}`} />
            )}
          </div>
          <div>
            <span className={`font-semibold text-lg ${getStatusColor()}`}>
              {isExpired ? 'Slot Reservation Expired' : 'Slot Reserved'}
            </span>
            {!isExpired && (
              <p className="text-sm text-neutral-600">
                Your appointment slot is temporarily held
              </p>
            )}
          </div>
        </div>

        {!isExpired && (
          <div className="text-right">
            <span className={`text-2xl font-mono font-bold ${getStatusColor()}`}>
              {formatTime(timeLeft)}
            </span>
            <p className="text-xs text-neutral-500 mt-1">
              remaining
            </p>
          </div>
        )}
      </div>

      {!isExpired && (
        <div className="space-y-3">
          <div className="relative">
            <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor()}`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
              {timeLeft <= 60 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {timeLeft <= 60
                ? '⚡ Complete quickly - time is running out!'
                : '✨ Complete your booking to secure your slot'
              }
            </span>
            <span className="text-neutral-500">
              {Math.round(getProgressPercentage())}% remaining
            </span>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-red-700 font-medium">
            Your slot reservation has expired. Please go back and select a new time slot to continue.
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(SlotCountdown);
