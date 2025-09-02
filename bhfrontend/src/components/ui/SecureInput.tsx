import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { sanitizeText, getValidationError } from '../../lib/validation';

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  validationType?: 'email' | 'password' | 'firstName' | 'lastName' | 'phone' | 'text';
  sanitize?: boolean;
  maxLength?: number;
  onChange?: (value: string, isValid: boolean) => void;
  onValidationChange?: (error: string | null) => void;
}

/**
 * Secure input component with built-in validation and sanitization
 */
const SecureInput: React.FC<SecureInputProps> = ({
  label,
  error,
  helperText,
  validationType = 'text',
  sanitize = true,
  maxLength = 255,
  onChange,
  onValidationChange,
  type = 'text',
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  const displayError = error || (isTouched ? internalError : null);
  const isPassword = type === 'password' || validationType === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const validateAndSanitize = useCallback((value: string) => {
    // Sanitize input if enabled
    const sanitizedValue = sanitize ? sanitizeText(value) : value;
    
    // Enforce max length
    const truncatedValue = sanitizedValue.substring(0, maxLength);
    
    // Validate based on type
    const validationError = validationType !== 'text' 
      ? getValidationError(validationType, truncatedValue)
      : null;
    
    setInternalError(validationError);
    onValidationChange?.(validationError);
    
    return {
      value: truncatedValue,
      isValid: !validationError,
      error: validationError
    };
  }, [sanitize, maxLength, validationType, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, isValid } = validateAndSanitize(e.target.value);
    onChange?.(value, isValid);
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          {...props}
          type={inputType}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={maxLength}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
            displayError
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-accent-500 focus:ring-accent-200',
            isPassword && 'pr-10',
            className
          )}
          aria-invalid={!!displayError}
          aria-describedby={
            displayError ? `${props.id}-error` : 
            helperText ? `${props.id}-helper` : undefined
          }
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      {displayError && (
        <div 
          id={`${props.id}-error`}
          className="flex items-center space-x-1 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
      
      {helperText && !displayError && (
        <p 
          id={`${props.id}-helper`}
          className="text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
      
      {maxLength && props.value && (
        <div className="text-xs text-gray-400 text-right">
          {String(props.value).length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default SecureInput;
