import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useBookingUIStore } from '../../store/uiStore';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

interface LockExtensionManagerProps {
  onExtend?: () => void;
  onExpired?: () => void;
}

const LockExtensionManager: React.FC<LockExtensionManagerProps> = ({
  onExtend,
  onExpired,
}) => {
  const {
    currentLockSessionId,
    lockExpiresAt,
    lockExtensionCount,
    canExtendLock,
    extendLock,
  } = useBookingUIStore();

  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Calculate time left
  useEffect(() => {
    if (!lockExpiresAt || !currentLockSessionId) {
      setTimeLeft(0);
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, lockExpiresAt - now);
      setTimeLeft(Math.floor(remaining / 1000));

      // Show extension prompt when 1 minute left
      if (remaining <= 60000 && remaining > 0 && canExtendLock() && !showExtensionPrompt) {
        setShowExtensionPrompt(true);
      }

      // Handle expiration
      if (remaining <= 0 && currentLockSessionId) {
        onExpired?.();
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt, currentLockSessionId, canExtendLock, showExtensionPrompt, onExpired]);

  const handleExtendLock = useCallback(async () => {
    if (!canExtendLock()) return;

    setIsExtending(true);
    try {
      const success = extendLock();
      if (success) {
        setShowExtensionPrompt(false);
        showSuccessToast('Lock Extended', 'Time slot extended by 5 minutes');
        onExtend?.();
      } else {
        showErrorToast('Extension Failed', 'Unable to extend time slot');
      }
    } catch (error) {
      console.error('Failed to extend lock:', error);
      showErrorToast('Extension Error', 'Failed to extend time slot');
    } finally {
      setIsExtending(false);
    }
  }, [canExtendLock, extendLock, onExtend, showSuccessToast, showErrorToast]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (timeLeft <= 0) return 'text-red-600';
    if (timeLeft <= 60) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getProgressColor = () => {
    if (timeLeft <= 0) return 'bg-red-500';
    if (timeLeft <= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getProgressPercentage = (): number => {
    const totalTime = 5 * 60; // 5 minutes in seconds
    return Math.max(0, (timeLeft / totalTime) * 100);
  };

  if (!currentLockSessionId || timeLeft <= 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Time remaining display */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className={`h-5 w-5 ${getStatusColor()}`} />
            <span className={`font-semibold ${getStatusColor()}`}>
              Time Remaining: {formatTime(timeLeft)}
            </span>
          </div>
          
          {lockExtensionCount > 0 && (
            <div className="text-xs text-gray-500">
              Extended {lockExtensionCount} time{lockExtensionCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
            {timeLeft <= 60 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
            )}
          </div>
        </div>

        {/* Status message */}
        <div className="mt-2 text-sm text-gray-600">
          {timeLeft <= 60
            ? '⚡ Time is running out! Complete your booking quickly.'
            : '✨ Your time slot is reserved. Complete your booking to secure it.'
          }
        </div>
      </div>

      {/* Extension prompt */}
      {showExtensionPrompt && canExtendLock() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 mb-1">
                Time Running Out
              </h4>
              <p className="text-yellow-700 text-sm mb-3">
                Your time slot reservation will expire in less than a minute. 
                Would you like to extend it by 5 more minutes?
              </p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleExtendLock}
                  disabled={isExtending}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isExtending ? (
                    <>
                      <Clock className="h-4 w-4 mr-1 animate-spin" />
                      Extending...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Extend (+5 min)
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExtensionPrompt(false)}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  Continue Without Extending
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extension limit reached */}
      {!canExtendLock() && lockExtensionCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 text-sm">
              Maximum extensions reached. Please complete your booking soon.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockExtensionManager;
