import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TutorialSpotlight from './TutorialSpotlight';
import TutorialModal from './TutorialModal';
import TutorialWelcomeMessage from './TutorialWelcomeMessage';
import TutorialCongratulationsMessage from './TutorialCongratulationsMessage';
import { useCompleteOnboardingMutation } from '../../hooks/queries/useAuthQueries';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { usePerformanceOptimization } from '../../hooks/usePerformanceOptimization';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;
  interactive?: boolean;
  navigationPath?: string;
  waitForNavigation?: boolean;
  subTutorial?: TutorialStep[];
}

interface InteractiveTutorialSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userRole: 'OWNER' | 'EMPLOYEE';
  tutorialSteps: TutorialStep[];
}

const InteractiveTutorialSystem: React.FC<InteractiveTutorialSystemProps> = ({
  isOpen,
  onClose,
  onComplete,
  userRole,
  tutorialSteps
}) => {
  // Early return if tutorial is not open to avoid expensive computations
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [isInSubTutorial, setIsInSubTutorial] = useState(false);
  const [subTutorialSteps, setSubTutorialSteps] = useState<TutorialStep[]>([]);
  const [subCurrentStep, setSubCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [waitingForNavigation, setWaitingForNavigation] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { success } = useToast();
  const { user } = useAuth();
  const completeOnboardingMutation = useCompleteOnboardingMutation();

  // Performance optimization - only when tutorial is active
  const { measureRender } = usePerformanceOptimization();

  // Measure tutorial performance - only when tutorial is active
  useEffect(() => {
    const endMeasure = measureRender('InteractiveTutorialSystem');
    return endMeasure;
  }, [measureRender]);

  // Memoized calculations for better performance - only when tutorial is active
  const currentStepData = useMemo(() => {
    return isInSubTutorial ? subTutorialSteps[subCurrentStep] : tutorialSteps[currentStep];
  }, [isInSubTutorial, subTutorialSteps, subCurrentStep, tutorialSteps, currentStep]);

  const { currentStepIndex, totalSteps, isFirstStep, isLastStep } = useMemo(() => {
    if (isInSubTutorial) {
      return {
        currentStepIndex: subCurrentStep,
        totalSteps: subTutorialSteps.length,
        isFirstStep: subCurrentStep === 0,
        isLastStep: subCurrentStep === subTutorialSteps.length - 1
      };
    }
    return {
      currentStepIndex: currentStep,
      totalSteps: tutorialSteps.length,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === tutorialSteps.length - 1
    };
  }, [isInSubTutorial, subCurrentStep, subTutorialSteps.length, currentStep, tutorialSteps.length]);



  // Handle navigation completion
  useEffect(() => {
    if (waitingForNavigation && currentStepData?.navigationPath) {
      const targetPath = currentStepData.navigationPath;
      const currentPath = location.pathname;

      console.log('🧭 Tutorial: Navigation check', {
        targetPath,
        currentPath,
        waitingForNavigation,
        hasSubTutorial: !!currentStepData.subTutorial
      });

      // Check if we've navigated to the target path or a sub-path
      if (currentPath === targetPath || currentPath.startsWith(targetPath + '/')) {
        console.log('🧭 Tutorial: Navigation completed, starting sub-tutorial');
        setWaitingForNavigation(false);

        // Start sub-tutorial if available
        if (currentStepData.subTutorial && currentStepData.subTutorial.length > 0) {
          setTimeout(() => {
            console.log('🧭 Tutorial: Starting sub-tutorial with steps:', currentStepData.subTutorial);
            setSubTutorialSteps(currentStepData.subTutorial!);
            setSubCurrentStep(0);
            setIsInSubTutorial(true);
          }, 1500); // Give page more time to load
        } else {
          // No sub-tutorial, just proceed to next step
          setTimeout(() => {
            if (currentStep < tutorialSteps.length - 1) {
              setCurrentStep(prev => prev + 1);
            } else {
              handleComplete();
            }
          }, 500);
        }
      }
    }
  }, [location.pathname, waitingForNavigation, currentStepData, currentStep, tutorialSteps.length]);

  // Cleanup highlighted elements
  useEffect(() => {
    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('tutorial-highlight');
      }
    };
  }, [highlightedElement]);



  const handleNext = useCallback(() => {
    if (isInSubTutorial) {
      if (subCurrentStep < subTutorialSteps.length - 1) {
        setSubCurrentStep(prev => prev + 1);
      } else {
        // Exit sub-tutorial
        setIsInSubTutorial(false);
        setSubTutorialSteps([]);
        setSubCurrentStep(0);
        // Continue with main tutorial
        if (currentStep < tutorialSteps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          handleComplete();
        }
      }
    } else {
      if (isLastStep) {
        handleComplete();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [isInSubTutorial, subCurrentStep, subTutorialSteps.length, currentStep, tutorialSteps.length, isLastStep]);

  const handlePrevious = useCallback(() => {
    if (isInSubTutorial) {
      if (subCurrentStep > 0) {
        setSubCurrentStep(prev => prev - 1);
      } else {
        // Exit sub-tutorial and go back to main tutorial
        setIsInSubTutorial(false);
        setSubTutorialSteps([]);
        setSubCurrentStep(0);
      }
    } else {
      if (!isFirstStep) {
        setCurrentStep(prev => prev - 1);
      }
    }
  }, [isInSubTutorial, subCurrentStep, isFirstStep]);

  const handleComplete = async () => {
    setShowCongratulations(true);
  };

  const handleFinalComplete = async () => {
    try {
      await completeOnboardingMutation.mutateAsync();
      success('Tutorial completed!', 'You can restart the tutorial anytime from the Tutorial button.');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      onComplete();
      onClose();
    }
  };

  const handleSkip = async () => {
    try {
      // Mark tutorial as completed when skipped
      await completeOnboardingMutation.mutateAsync();
      success('Tutorial skipped and marked as completed!', 'You can restart the tutorial anytime from the Tutorial button.');
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
    setSubCurrentStep(0);
    setIsInSubTutorial(false);
    setSubTutorialSteps([]);
    setShowWelcome(true);
    setShowCongratulations(false);
    setWaitingForNavigation(false);
  };

  const handleStartTutorial = () => {
    setShowWelcome(false);
    setCurrentStep(0);
  };

  const handleElementClick = useCallback(() => {
    if (!currentStepData?.interactive) return;

    console.log('Tutorial: Element clicked', {
      stepId: currentStepData.id,
      hasSubTutorial: !!currentStepData.subTutorial,
      navigationPath: currentStepData.navigationPath
    });

    // Handle interactive elements
    if (currentStepData.navigationPath) {
      // Navigate to specified path and wait for navigation
      setWaitingForNavigation(true);
      navigate(currentStepData.navigationPath);
    } else if (currentStepData.subTutorial && currentStepData.subTutorial.length > 0) {
      // Start sub-tutorial immediately
      setSubTutorialSteps(currentStepData.subTutorial);
      setSubCurrentStep(0);
      setIsInSubTutorial(true);
    } else {
      // Just proceed to next step
      handleNext();
    }
  }, [currentStepData, navigate, handleNext]);

  const shouldShowModal = !showWelcome && !showCongratulations && !waitingForNavigation;

  return (
    <>
      {/* Welcome Message */}
      <TutorialWelcomeMessage
        isOpen={showWelcome}
        onStart={handleStartTutorial}
        onSkip={handleSkip}
        userRole={userRole}
        userName={user?.firstName}
      />

      {/* Congratulations Message */}
      <TutorialCongratulationsMessage
        isOpen={showCongratulations}
        onClose={handleFinalComplete}
        onRestart={handleRestart}
        userRole={userRole}
        userName={user?.firstName}
      />

      {/* Spotlight Effect */}
      <TutorialSpotlight
        isActive={shouldShowModal && !!currentStepData?.target}
        targetSelector={currentStepData?.target}
        onElementClick={currentStepData?.interactive ? handleElementClick : undefined}
      />

      {/* Tutorial Modal */}
      {shouldShowModal && (
        <TutorialModal
          isOpen={true}
          title={currentStepData?.title || ''}
          description={currentStepData?.description || ''}
          currentStep={currentStepIndex}
          totalSteps={totalSteps}
          targetSelector={currentStepData?.target}
          action={currentStepData?.action}
          isFirstStep={isFirstStep && !isInSubTutorial}
          isLastStep={isLastStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onRestart={handleRestart}
          onClose={onClose}
          isLoading={completeOnboardingMutation.isPending}
        />
      )}

      {/* Navigation waiting overlay */}
      {waitingForNavigation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-600"></div>
              <p className="text-gray-700">Navigating to the next section...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InteractiveTutorialSystem;
