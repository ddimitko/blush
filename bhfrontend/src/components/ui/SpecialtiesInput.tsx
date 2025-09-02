import React, { useState, useEffect, useCallback } from 'react';
import { X, Users } from 'lucide-react';

interface SpecialtiesInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
}

const SpecialtiesInput: React.FC<SpecialtiesInputProps> = ({
  label,
  placeholder = "e.g., Hair Coloring, Manicure, Massage Therapy",
  value,
  onChange,
  error,
  maxLength = 200,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Parse specialties from the input value
  useEffect(() => {
    const parsed = inputValue
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    setSpecialties(parsed);
  }, [inputValue]);

  // Update parent component when input changes
  useEffect(() => {
    if (inputValue !== value) {
      onChange(inputValue);
    }
  }, [inputValue]);

  // Initialize input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
    }
  };

  const removeSpecialty = (indexToRemove: number) => {
    const newSpecialties = specialties.filter((_, index) => index !== indexToRemove);
    const newValue = newSpecialties.join(', ');
    setInputValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow adding comma with Enter key
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!inputValue.endsWith(',') && !inputValue.endsWith(', ')) {
        setInputValue(prev => prev + ', ');
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Input field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Users className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300'
              : 'border-gray-300 placeholder-gray-400'
          }`}
          maxLength={maxLength}
        />
      </div>

      {/* Character count */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Separate specialties with commas</span>
        <span>{inputValue.length}/{maxLength}</span>
      </div>

      {/* Visual tags preview */}
      {specialties.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Specialties ({specialties.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {specialties.map((specialty, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
              >
                {specialty}
                <button
                  type="button"
                  onClick={() => removeSpecialty(index)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-800 focus:outline-none focus:bg-blue-200 focus:text-blue-800 transition-colors"
                  title={`Remove ${specialty}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>Type specialties separated by commas</li>
          <li>Press Enter to add a comma</li>
          <li>Click the × to remove a specialty</li>
        </ul>
      </div>
    </div>
  );
};

export default SpecialtiesInput;
