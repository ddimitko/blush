import React from 'react';

interface EnhancedSearchInputProps {
  searchValue: string;
  isSearching: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const EnhancedSearchInput: React.FC<EnhancedSearchInputProps> = ({
  searchValue,
  isSearching,
  onSearchChange,
  onSearchSubmit,
  placeholder = "Search...",
  className = "",
  disabled = false,
  autoFocus = false
}) => {

  return (
    <form onSubmit={onSearchSubmit} className="w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
          <div className={`transition-all duration-200 ${isSearching ? 'animate-pulse' : ''}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={onSearchChange}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          className={`
            w-full pl-10 pr-4 h-9 text-sm
            bg-gray-50 border-gray-200
            focus:bg-white focus:ring-2 focus:ring-accent-500 focus:border-accent-500
            transition-all duration-200 ease-out will-change-transform
            rounded-lg border
            ${isSearching ? 'ring-2 ring-accent-200' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin opacity-70"></div>
          </div>
        )}
      </div>
    </form>
  );
};

export default EnhancedSearchInput;
