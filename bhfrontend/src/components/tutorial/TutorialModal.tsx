import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ArrowLeft, RotateCcw, CheckCircle, Play } from 'lucide-react';
import Button from '../ui/Button';

interface TutorialModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  targetSelector?: string;
  action?: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onRestart: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  title,
  description,
  currentStep,
  totalSteps,
  targetSelector,
  action,
  isFirstStep,
  isLastStep,
  onNext,
  onPrevious,
  onSkip,
  onRestart,
  onClose,
  isLoading = false
}) => {
  const [modalPosition, setModalPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('center');

  useEffect(() => {
    if (!isOpen || !targetSelector) {
      setModalPosition('center');
      return;
    }

    // Find target element
    const selectors = targetSelector.split(',').map(s => s.trim());
    let element: HTMLElement | null = null;

    for (const selector of selectors) {
      try {
        element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetParent !== null) break;
      } catch (e) {
        console.warn('Invalid selector:', selector);
      }
    }

    if (!element) {
      setModalPosition('center');
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Simple corner positioning to avoid blocking the highlighted element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';

    if (centerX < viewportWidth / 2 && centerY < viewportHeight / 2) {
      position = 'bottom-right'; // Element in top-left, modal in bottom-right
    } else if (centerX >= viewportWidth / 2 && centerY < viewportHeight / 2) {
      position = 'bottom-left'; // Element in top-right, modal in bottom-left
    } else if (centerX < viewportWidth / 2 && centerY >= viewportHeight / 2) {
      position = 'top-right'; // Element in bottom-left, modal in top-right
    } else {
      position = 'top-left'; // Element in bottom-right, modal in top-left
    }

    setModalPosition(position);
  }, [isOpen, targetSelector]);

  if (!isOpen) return null;

  const getPositionClasses = () => {
    switch (modalPosition) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'center':
      default:
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div
      className={`fixed bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 z-[10002] ${getPositionClasses()}`}
    >
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-accent-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tutorial</h3>
            <p className="text-sm text-gray-500">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-accent-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h4 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h4>
        <p className="text-gray-600 mb-4 leading-relaxed">
          {description}
        </p>
        
        {action && (
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-accent-800 font-medium">
              💡 {action}
            </p>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onRestart}
            disabled={isFirstStep}
          >
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
          >
            Skip Tutorial
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onPrevious}
            disabled={isFirstStep}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={isLastStep ? <CheckCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            onClick={onNext}
            isLoading={isLoading}
          >
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
