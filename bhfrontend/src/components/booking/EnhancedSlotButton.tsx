import React, { memo } from 'react';
import { Clock, Lock, CheckCircle, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { AvailableSlot } from '../../types';
import { SlotState, SlotStateInfo } from '../../store/uiStore';
import { formatTime } from '../../lib/utils';
import LoadingSpinner from '../ui/LoadingSpinner';

interface EnhancedSlotButtonProps {
  slot: AvailableSlot;
  isSelected: boolean;
  slotState: SlotStateInfo;
  onSlotSelect: (slot: AvailableSlot) => void;
  onRetry?: (slot: AvailableSlot) => void;
  disabled?: boolean;
}

const EnhancedSlotButton: React.FC<EnhancedSlotButtonProps> = memo(({
  slot,
  isSelected,
  slotState,
  onSlotSelect,
  onRetry,
  disabled = false,
}) => {
  const slotTime = slot.startTime || slot.time;
  const { state, error, retryCount } = slotState;

  // Determine button state and styling
  const getButtonConfig = () => {
    switch (state) {
      case 'locking':
        return {
          className: 'border-blue-400 bg-blue-100 text-blue-700 cursor-wait',
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: 'Reserving...',
          clickable: false,
        };
      
      case 'locked':
        return {
          className: isSelected 
            ? 'border-blue-500 bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-300'
            : 'border-green-400 bg-green-100 text-green-700',
          icon: <CheckCircle className="h-3 w-3" />,
          label: isSelected ? 'Selected' : 'Reserved',
          clickable: true,
        };
      
      case 'unlocking':
        return {
          className: 'border-orange-400 bg-orange-100 text-orange-700 cursor-wait',
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: 'Releasing...',
          clickable: false,
        };
      
      case 'retrying':
        return {
          className: 'border-yellow-400 bg-yellow-100 text-yellow-700 cursor-wait',
          icon: <RotateCcw className="h-3 w-3 animate-spin" />,
          label: `Retry ${retryCount || 1}`,
          clickable: false,
        };
      
      case 'error':
        // Check if this is a booked slot, locked slot, or other error
        const isBooked = error?.includes('booked') || error?.includes('Booked');
        const isLocked = error?.includes('reserved') || error?.includes('Reserved');
        const isUnavailable = error?.includes('unavailable') || error?.includes('available');

        if (isBooked) {
          return {
            className: 'border-red-500 bg-red-200 text-red-800 cursor-not-allowed opacity-75',
            icon: <Lock className="h-3 w-3" />,
            label: 'Booked',
            clickable: false,
          };
        } else if (isLocked) {
          return {
            className: 'border-red-400 bg-red-100 text-red-700 cursor-not-allowed opacity-75',
            icon: <Lock className="h-3 w-3" />,
            label: 'Locked',
            clickable: false,
          };
        } else if (isUnavailable) {
          return {
            className: 'border-gray-400 bg-gray-200 text-gray-600 cursor-not-allowed opacity-75',
            icon: <AlertTriangle className="h-3 w-3" />,
            label: 'Unavailable',
            clickable: false,
          };
        } else {
          // Other errors (network, etc.) - allow retry
          return {
            className: 'border-red-400 bg-red-100 text-red-700 cursor-pointer hover:bg-red-200',
            icon: <AlertTriangle className="h-3 w-3" />,
            label: 'Error',
            clickable: true,
          };
        }
      
      default: // available
        if (slot.locked) {
          return {
            className: 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed',
            icon: <Lock className="h-3 w-3" />,
            label: 'Locked',
            clickable: false,
          };
        }
        
        if (!slot.available) {
          return {
            className: 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed',
            icon: <Clock className="h-3 w-3" />,
            label: 'Unavailable',
            clickable: false,
          };
        }
        
        return {
          className: 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-900 hover:shadow-md cursor-pointer',
          icon: <Clock className="h-3 w-3" />,
          label: 'Available',
          clickable: true,
        };
    }
  };

  const config = getButtonConfig();
  const isClickable = config.clickable && !disabled;

  const handleClick = () => {
    if (!isClickable) return;
    
    if (state === 'error' && onRetry) {
      onRetry(slot);
    } else {
      onSlotSelect(slot);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={`
        relative p-3 text-sm rounded-xl border transition-all duration-300 min-h-[56px] 
        flex flex-col items-center justify-center transform hover:scale-105
        ${config.className}
        ${!isClickable ? 'transform-none hover:scale-100' : ''}
      `}
      title={error || config.label}
      data-cy={`time-slot-${slotTime}`}
    >
      {/* Main time display */}
      <span className="font-medium text-base mb-1">
        {formatTime(slotTime)}
      </span>

      {/* Status indicator */}
      <div className="flex items-center space-x-1">
        {config.icon}
        <span className="text-xs font-medium">
          {config.label}
        </span>
      </div>

      {/* Progress indicator for locking/unlocking */}
      {(state === 'locking' || state === 'unlocking' || state === 'retrying') && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-xl">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && state === 'locked' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <CheckCircle className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      {/* Error indicator */}
      {state === 'error' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      {/* Retry count indicator */}
      {state === 'retrying' && retryCount && retryCount > 1 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">{retryCount}</span>
        </div>
      )}

      {/* Click hint for selected slots */}
      {isSelected && state === 'locked' && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-600 whitespace-nowrap">
          Click to continue
        </div>
      )}

      {/* Error message tooltip */}
      {state === 'error' && error && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {error}
        </div>
      )}
    </button>
  );
});

EnhancedSlotButton.displayName = 'EnhancedSlotButton';

export default EnhancedSlotButton;
