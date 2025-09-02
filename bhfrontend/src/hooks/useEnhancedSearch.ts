import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { smoothScrollToTop } from '../lib/smoothNavigation';

interface UseEnhancedSearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
  searchRoute?: string;
  onSearchChange?: (query: string) => void;
  onNavigate?: () => void;
}

interface UseEnhancedSearchReturn {
  searchValue: string;
  isSearching: boolean;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  clearSearch: () => void;
  setSearchValue: (value: string) => void;
}

export const useEnhancedSearch = ({
  debounceMs = 300,
  minSearchLength = 1,
  searchRoute = '/search',
  onSearchChange,
  onNavigate
}: UseEnhancedSearchOptions = {}): UseEnhancedSearchReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs for managing debounce and typing state
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isTypingRef = useRef(false);
  const lastSearchRef = useRef('');

  // Enhanced debounced search with smooth transitions
  const debouncedSearch = useCallback((query: string) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set searching state
    setIsSearching(true);

    debounceTimeoutRef.current = setTimeout(() => {
      // Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => {
        // Only trigger if query has actually changed and meets minimum length
        if (query !== lastSearchRef.current && query.trim().length >= minSearchLength) {
          lastSearchRef.current = query;

          // Call the search change handler
          if (onSearchChange) {
            onSearchChange(query);
          }

          // Auto-navigate to search page after debouncing (if not already there)
          if (location.pathname !== searchRoute && query.trim()) {
            const searchUrl = `${searchRoute}?q=${encodeURIComponent(query.trim())}`;
            smoothScrollToTop();
            navigate(searchUrl);

            if (onNavigate) {
              onNavigate();
            }
          }
        }

        // Reset searching state
        setIsSearching(false);
        isTypingRef.current = false;
      });
    }, debounceMs);
  }, [debounceMs, minSearchLength, searchRoute, location.pathname, navigate, onSearchChange, onNavigate]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Mark that user is actively typing
    isTypingRef.current = true;

    // Update local state immediately for responsive UI using transition
    React.startTransition(() => {
      setSearchValue(value);
    });

    // Debounce the actual search and navigation
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (searchValue.trim().length >= minSearchLength) {
      // Immediate search without debounce
      if (onSearchChange) {
        onSearchChange(searchValue.trim());
      }

      // Always navigate to search page with the query, regardless of current page
      const searchUrl = `${searchRoute}?q=${encodeURIComponent(searchValue.trim())}`;

      smoothScrollToTop();
      navigate(searchUrl);

      if (onNavigate) {
        onNavigate();
      }
    }
  }, [searchValue, minSearchLength, searchRoute, navigate, onSearchChange, onNavigate]);

  const clearSearch = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setSearchValue('');
    setIsSearching(false);
    isTypingRef.current = false;
    lastSearchRef.current = '';

    if (onSearchChange) {
      onSearchChange('');
    }
  }, [onSearchChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchValue,
    isSearching,
    handleSearchChange,
    handleSearchSubmit,
    clearSearch,
    setSearchValue
  };
};

export default useEnhancedSearch;
