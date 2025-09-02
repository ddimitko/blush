import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';

interface TutorialCongratulationsMessageProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  userRole: 'OWNER' | 'EMPLOYEE';
  userName?: string;
}

const TutorialCongratulationsMessage: React.FC<TutorialCongratulationsMessageProps> = ({
  isOpen,
  onClose,
  onRestart,
  userRole,
  userName
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [confettiVisible, setConfettiVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setAnimationPhase('enter');
      
      // Transition to visible state
      const timer1 = setTimeout(() => {
        setAnimationPhase('visible');
        setConfettiVisible(true);
      }, 100);

      // Hide confetti after animation
      const timer2 = setTimeout(() => {
        setConfettiVisible(false);
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setAnimationPhase('exit');
      setConfettiVisible(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getCongratulationsContent = () => {
    if (userRole === 'OWNER') {
      return {
        title: '🎉 Congratulations!',
        subtitle: `Well done, ${userName || 'there'}! You've mastered your owner dashboard!`,
        description: 'You now know how to manage your beauty business effectively using all the key features of your dashboard.',
        achievements: [
          '✅ Learned to navigate your business overview',
          '✅ Discovered how to manage employees',
          '✅ Explored service management features',
          '✅ Understood appointment calendar',
          '✅ Found quick action shortcuts'
        ],
        nextSteps: [
          '🚀 Complete your shop setup to go live',
          '👥 Add your first employees',
          '💄 Create your service offerings',
          '💳 Set up payment processing',
          '📈 Start tracking your growth'
        ]
      };
    } else {
      return {
        title: '🌟 Excellent Work!',
        subtitle: `Fantastic, ${userName || 'there'}! You're ready to excel as an employee!`,
        description: 'You now have all the knowledge needed to manage your schedule, track performance, and provide outstanding service.',
        achievements: [
          '✅ Learned to view your schedule',
          '✅ Discovered performance tracking',
          '✅ Explored profile management',
          '✅ Found quick action features',
          '✅ Understood appointment details'
        ],
        nextSteps: [
          '👤 Complete your profile setup',
          '📅 Check your upcoming appointments',
          '⭐ Focus on excellent customer service',
          '📈 Monitor your performance metrics',
          '🏖️ Use leave requests when needed'
        ]
      };
    }
  };

  const content = getCongratulationsContent();

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${
          animationPhase === 'visible' ? 'bg-opacity-60' : 'bg-opacity-0'
        }`} 
      />

      {/* Confetti Effect */}
      {confettiVisible && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent-400 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Congratulations Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all duration-500 ${
            animationPhase === 'visible' 
              ? 'scale-100 opacity-100 translate-y-0' 
              : animationPhase === 'enter'
              ? 'scale-95 opacity-0 translate-y-8'
              : 'scale-95 opacity-0 translate-y-8'
          }`}
        >
          {/* Header with animated elements */}
          <div className="relative p-8 text-center border-b border-gray-100 bg-gradient-to-br from-accent-50 to-accent-100">
            {/* Floating sparkles */}
            <div className="absolute top-4 left-4">
              <Sparkles className="w-6 h-6 text-accent-400 animate-pulse" />
            </div>
            <div className="absolute top-6 right-6">
              <Sparkles className="w-4 h-4 text-accent-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute bottom-4 left-8">
              <Sparkles className="w-3 h-3 text-accent-200 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="absolute bottom-6 right-4">
              <Sparkles className="w-5 h-5 text-accent-300 animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>
            
            <div className="mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-lg">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {content.title}
              </h2>
              <p className="text-lg text-accent-700 font-medium">
                {content.subtitle}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-gray-600 mb-6 leading-relaxed text-center">
              {content.description}
            </p>

            {/* Achievements */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                What you've accomplished:
              </h4>
              <div className="space-y-2">
                {content.achievements.map((achievement, index) => (
                  <div 
                    key={index}
                    className="flex items-center text-sm text-gray-700 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <span className="mr-3">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide flex items-center">
                <ArrowRight className="w-4 h-4 text-accent-500 mr-2" />
                Recommended next steps:
              </h4>
              <div className="space-y-2">
                {content.nextSteps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex items-center text-sm text-gray-700 animate-slide-up"
                    style={{ animationDelay: `${(index + content.achievements.length) * 0.1}s` }}
                  >
                    <span className="mr-3">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-800 font-medium mb-1">
                    Tutorial Completed Successfully!
                  </p>
                  <p className="text-xs text-green-700">
                    You can restart this tutorial anytime from the Tutorial button in your dashboard header.
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
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={onRestart}
              className="text-gray-600 hover:text-gray-800"
            >
              Restart Tutorial
            </Button>
            
            <Button
              variant="primary"
              size="md"
              icon={<CheckCircle className="w-4 h-4" />}
              onClick={onClose}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
            >
              Get Started!
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorialCongratulationsMessage;
