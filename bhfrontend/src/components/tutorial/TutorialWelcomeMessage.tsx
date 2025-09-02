import React, { useState, useEffect } from 'react';
import { Sparkles, Play, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface TutorialWelcomeMessageProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: () => void;
  userRole: 'OWNER' | 'EMPLOYEE';
  userName?: string;
}

const TutorialWelcomeMessage: React.FC<TutorialWelcomeMessageProps> = ({
  isOpen,
  onStart,
  onSkip,
  userRole,
  userName
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setAnimationPhase('enter');
      
      // Transition to visible state
      const timer1 = setTimeout(() => {
        setAnimationPhase('visible');
      }, 100);

      return () => clearTimeout(timer1);
    } else {
      setAnimationPhase('exit');
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getWelcomeContent = () => {
    if (userRole === 'OWNER') {
      return {
        title: '🎉 Welcome to Your Owner Dashboard!',
        subtitle: `Hello ${userName || 'there'}! Ready to master your beauty business?`,
        description: 'This interactive tutorial will guide you through all the essential features to help you manage your shop, employees, and grow your business successfully.',
        features: [
          '📊 Monitor your business performance',
          '👥 Manage employees and schedules',
          '💰 Track revenue and analytics',
          '⚙️ Configure shop settings',
          '📅 View appointment calendar'
        ]
      };
    } else {
      return {
        title: '👋 Welcome to Your Employee Dashboard!',
        subtitle: `Hello ${userName || 'there'}! Let\'s get you started!`,
        description: 'This tutorial will show you how to use your employee dashboard to manage your schedule, track performance, and provide excellent service to customers.',
        features: [
          '📅 View your appointment schedule',
          '📈 Track your performance metrics',
          '👤 Manage your profile',
          '🏖️ Request time off',
          '⭐ Monitor customer feedback'
        ]
      };
    }
  };

  const content = getWelcomeContent();

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${
          animationPhase === 'visible' ? 'bg-opacity-60' : 'bg-opacity-0'
        }`} 
      />
      
      {/* Welcome Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all duration-300 ${
            animationPhase === 'visible' 
              ? 'scale-100 opacity-100 translate-y-0' 
              : animationPhase === 'enter'
              ? 'scale-95 opacity-0 translate-y-4'
              : 'scale-95 opacity-0 translate-y-4'
          }`}
        >
          {/* Header with animated sparkles */}
          <div className="relative p-8 text-center border-b border-gray-100">
            <div className="absolute top-4 left-4">
              <Sparkles className="w-6 h-6 text-accent-400 animate-pulse" />
            </div>
            <div className="absolute top-4 right-4">
              <Sparkles className="w-4 h-4 text-accent-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute bottom-4 left-8">
              <Sparkles className="w-3 h-3 text-accent-200 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {content.title}
              </h2>
              <p className="text-lg text-accent-600 font-medium">
                {content.subtitle}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-gray-600 mb-6 leading-relaxed">
              {content.description}
            </p>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                What you'll learn:
              </h4>
              <div className="space-y-2">
                {content.features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center text-sm text-gray-700 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="mr-3">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-accent-600 text-xs font-bold">💡</span>
                </div>
                <div>
                  <p className="text-sm text-accent-800 font-medium mb-1">
                    Interactive Tutorial
                  </p>
                  <p className="text-xs text-accent-700">
                    This tutorial will highlight different parts of your dashboard as we go. You can pause, restart, or skip at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-8 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <Button
              variant="outline"
              size="md"
              onClick={onSkip}
              className="text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </Button>
            
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={onStart}
              className="bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 shadow-lg"
            >
              Start Tutorial
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorialWelcomeMessage;
