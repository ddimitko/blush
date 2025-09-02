import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Play, RotateCcw, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { useCompleteOnboardingMutation } from '../../hooks/queries/useAuthQueries';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import TutorialWelcomeMessage from './TutorialWelcomeMessage';
import TutorialCongratulationsMessage from './TutorialCongratulationsMessage';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action text
}

const ownerTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Owner Dashboard! 🎉',
    description: 'Congratulations on creating your shop! This tutorial will guide you through the key features of your owner dashboard to help you manage your beauty business effectively.',
    position: 'bottom'
  },
  {
    id: 'shop-selector',
    title: 'Shop Selection',
    description: 'If you own multiple shops, use this dropdown to switch between them. All dashboard data will update to show information for the selected shop.',
    target: '.shop-selector',
    position: 'bottom'
  },
  {
    id: 'setup-banners',
    title: 'Setup Progress',
    description: 'These banners guide you through essential setup steps like subscription activation and payment setup. Complete these to make your shop visible to customers.',
    target: '.setup-banners',
    position: 'bottom'
  },
  {
    id: 'stats-overview',
    title: 'Business Overview',
    description: 'Get a quick snapshot of your business performance including appointments, revenue, and employee count for the current month.',
    target: '.stats-overview',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Appointment Calendar',
    description: 'View all your shop\'s appointments in a calendar format. Click on any date to see detailed appointments for that day.',
    target: '.appointment-calendar',
    position: 'right'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Access the most important management features quickly: manage employees, services, and view detailed analytics.',
    target: '.quick-actions',
    position: 'left'
  },
  {
    id: 'employees',
    title: 'Manage Employees',
    description: 'Add, edit, and manage your team members. Employees can have their own schedules and be assigned to specific services.',
    action: 'Click "Manage Employees" to explore this feature'
  },
  {
    id: 'services',
    title: 'Manage Services',
    description: 'Create and manage the services your shop offers. Set prices, durations, and assign employees to each service.',
    action: 'Click "Manage Services" to explore this feature'
  },
  {
    id: 'settings',
    title: 'Shop Settings',
    description: 'Configure your shop details, business hours, subscription, and payment settings from the settings page.',
    action: 'Access settings through the navigation menu'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ✨',
    description: 'You now know the basics of your owner dashboard. Remember, you can restart this tutorial anytime from your profile menu. Start by completing your shop setup to go live!',
    position: 'bottom'
  }
];

interface OwnerDashboardTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OwnerDashboardTutorial: React.FC<OwnerDashboardTutorialProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const { success } = useToast();
  const { user } = useAuth();
  const completeOnboardingMutation = useCompleteOnboardingMutation();

  const currentStepData = ownerTutorialSteps[currentStep];
  const isLastStep = currentStep === ownerTutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  // Highlight target element
  useEffect(() => {
    if (!isOpen || !currentStepData.target) {
      // Remove any existing highlights
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
        setHighlightedElement(null);
      }
      return;
    }

    const element = document.querySelector(currentStepData.target) as HTMLElement;
    if (element) {
      // Remove previous highlight
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
      }
      
      // Add new highlight
      element.classList.add('tutorial-highlight');
      setHighlightedElement(element);
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isOpen, currentStepData.target, highlightedElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
      }
    };
  }, [highlightedElement]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setShowCongratulations(true);
  };

  const handleFinalComplete = async () => {
    try {
      await completeOnboardingMutation.mutateAsync();
      success('Tutorial completed!', 'You can restart the tutorial anytime from your profile menu.');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still close the tutorial even if API call fails
      onComplete();
      onClose();
    }
  };

  const handleSkip = async () => {
    try {
      // Mark tutorial as completed when skipped
      await completeOnboardingMutation.mutateAsync();
      success('Tutorial skipped and marked as completed!', 'You can restart the tutorial anytime from your profile menu.');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to complete onboarding on skip:', error);
      // Still close the tutorial even if API call fails
      onComplete();
      onClose();
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setShowWelcome(true);
    setShowCongratulations(false);
  };

  const handleStartTutorial = () => {
    setShowWelcome(false);
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Welcome Message */}
      <TutorialWelcomeMessage
        isOpen={showWelcome}
        onStart={handleStartTutorial}
        onSkip={handleSkip}
        userRole="OWNER"
        userName={user?.firstName}
      />

      {/* Congratulations Message */}
      <TutorialCongratulationsMessage
        isOpen={showCongratulations}
        onClose={handleFinalComplete}
        onRestart={handleRestart}
        userRole="OWNER"
        userName={user?.firstName}
      />

      {/* Main Tutorial Modal - only show when not showing welcome or congratulations */}
      {!showWelcome && !showCongratulations && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Tutorial Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-accent-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Owner Tutorial</h3>
                <p className="text-sm text-gray-500">
                  Step {currentStep + 1} of {ownerTutorialSteps.length}
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
                style={{ width: `${((currentStep + 1) / ownerTutorialSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              {currentStepData.title}
            </h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {currentStepData.description}
            </p>
            
            {currentStepData.action && (
              <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-accent-800 font-medium">
                  💡 {currentStepData.action}
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
                onClick={handleRestart}
                disabled={isFirstStep}
              >
                Restart
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
              >
                Skip Tutorial
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                Previous
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={isLastStep ? <CheckCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
                isLoading={completeOnboardingMutation.isPending}
              >
                {isLastStep ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
};

export default OwnerDashboardTutorial;
