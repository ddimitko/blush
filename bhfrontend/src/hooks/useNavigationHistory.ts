import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationHistory {
  current: string;
  previous: string | null;
}

const HISTORY_KEY = 'lunara_navigation_history';

const getStoredHistory = (): NavigationHistory => {
  try {
    const stored = sessionStorage.getItem(HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse navigation history from storage:', error);
  }
  return { current: '/', previous: null };
};

const setStoredHistory = (history: NavigationHistory) => {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to store navigation history:', error);
  }
};

export const useNavigationHistory = () => {
  const location = useLocation();
  const historyRef = useRef<NavigationHistory>(getStoredHistory());

  useEffect(() => {
    // Update history when location changes
    const currentPath = location.pathname;

    // Only update if the path actually changed
    if (currentPath !== historyRef.current.current) {
      const newHistory = {
        current: currentPath,
        previous: historyRef.current.current
      };

      historyRef.current = newHistory;
      setStoredHistory(newHistory);
    }
  }, [location.pathname]);

  const getPreviousPath = (): string | null => {
    return historyRef.current.previous;
  };

  const getCurrentPath = (): string => {
    return historyRef.current.current;
  };

  const hasPreviousPath = (): boolean => {
    return historyRef.current.previous !== null;
  };

  return {
    getPreviousPath,
    getCurrentPath,
    hasPreviousPath,
    history: historyRef.current
  };
};
