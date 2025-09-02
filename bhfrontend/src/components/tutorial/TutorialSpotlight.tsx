import React, { useEffect, useCallback, useRef } from 'react';

interface TutorialSpotlightProps {
  isActive: boolean;
  targetSelector?: string;
  onElementClick?: () => void;
}

const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({
  isActive,
  targetSelector,
  onElementClick
}) => {
  // Early return if not active to avoid expensive DOM operations
  if (!isActive) return null;

  const targetElementRef = useRef<HTMLElement | null>(null);
  const clickHandlerRef = useRef<((e: Event) => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced element finder for better performance
  const findTargetElement = useCallback((selectors: string[]): HTMLElement | null => {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetParent !== null) {
          return element;
        }
      } catch (e) {
        console.warn('Invalid selector:', selector, e);
      }
    }
    return null;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (targetElementRef.current) {
      targetElementRef.current.classList.remove('tutorial-highlight');
    }

    if (clickHandlerRef.current && targetElementRef.current) {
      targetElementRef.current.removeEventListener('click', clickHandlerRef.current, { capture: true });
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    targetElementRef.current = null;
    clickHandlerRef.current = null;
  }, []);

  useEffect(() => {
    // Clean up previous highlights
    cleanup();
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    if (!isActive || !targetSelector) {
      return cleanup;
    }

    // Debounced element finding
    timeoutRef.current = setTimeout(() => {
      const selectors = targetSelector.split(',').map(s => s.trim());
      const targetElement = findTargetElement(selectors);

      if (!targetElement) {
        console.warn('Tutorial: No element found for selectors:', selectors);
        return;
      }

      targetElementRef.current = targetElement;

      // Add highlight class without modifying background
      targetElement.classList.add('tutorial-highlight');

      // Add click handler if interactive
      if (onElementClick) {
        clickHandlerRef.current = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onElementClick();
        };
        targetElement.addEventListener('click', clickHandlerRef.current, { capture: true });
      }

      // Smooth scroll into view
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }, 100); // Debounce for 100ms

    return cleanup;
  }, [isActive, targetSelector, onElementClick, findTargetElement, cleanup]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 pointer-events-none transition-opacity duration-300"
      style={{ zIndex: 10000 }}
    />
  );
};

export default TutorialSpotlight;
