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

const employeeTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Employee Dashboard! 👋',
    description: 'Welcome to your employee dashboard! This is your central hub for managing your schedule, viewing appointments, and tracking your performance.',
    position: 'bottom'
  },
  {
    id: 'performance-stats',
    title: 'Your Performance Overview',
    description: 'See your key performance metrics including total appointments, revenue generated, average rating, and upcoming appointments.',
    target: '.performance-stats',
    position: 'bottom'
  },
  {
    id: 'calendar',
    title: 'Your Appointment Calendar',
    description: 'View all your scheduled appointments in a calendar format. Click on any date to see detailed appointments for that day.',
    target: '.appointment-calendar',
    position: 'right'
  },
  {
    id: 'daily-schedule',
    title: 'Today\'s Schedule',
    description: 'When you select a date, you\'ll see detailed appointment information here including customer details and service information.',
    target: '.daily-appointments',
    position: 'left'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Access important features quickly: view your performance metrics, edit your profile, and request time off.',
    target: '.quick-actions',
    position: 'left'
  },
  {
    id: 'performance',
    title: 'Performance Tracking',
    description: 'Monitor your detailed performance metrics, customer feedback, and earnings over time.',
    action: 'Click "View Performance" to explore your detailed metrics'
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Update your bio, specialties, experience, and other profile information that customers can see when booking.',
    action: 'Click "Edit Profile" to update your information'
  },
  {
    id: 'leave-request',
    title: 'Request Time Off',
    description: 'Submit leave requests for vacation, sick days, or personal time. Your manager will review and approve requests.',
    action: 'Click "Request Leave" to submit a time-off request'
  },
  {
    id: 'appointments',
    title: 'Managing Appointments',
    description: 'You can view appointment details, add notes, and see customer information. Remember, customers book appointments with you through the shop\'s public page.',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re Ready to Go! 🌟',
    description: 'You now know how to use your employee dashboard effectively. Focus on providing excellent service and building great customer relationships. You can restart this tutorial anytime from your profile menu.',
    position: 'bottom'
  }
];

interface EmployeeDashboardTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const EmployeeDashboardTutorial: React.FC<EmployeeDashboardTutorialProps> = ({
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

  const currentStepData = employeeTutorialSteps[currentStep];
  const isLastStep = currentStep === employeeTutorialSteps.length - 1;
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
        userRole="EMPLOYEE"
        userName={user?.firstName}
      />

      {/* Congratulations Message */}
      <TutorialCongratulationsMessage
        isOpen={showCongratulations}
        onClose={handleFinalComplete}
        onRestart={handleRestart}
        userRole="EMPLOYEE"
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
                <h3 className="text-lg font-semibold text-gray-900">Employee Tutorial</h3>
                <p className="text-sm text-gray-500">
                  Step {currentStep + 1} of {employeeTutorialSteps.length}
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
                style={{ width: `${((currentStep + 1) / employeeTutorialSteps.length) * 100}%` }}
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

export default EmployeeDashboardTutorial;
