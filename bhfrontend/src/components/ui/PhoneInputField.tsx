import React from 'react';
import { Controller, Control, FieldPath, FieldValues } from 'react-hook-form';
import PhoneInput from './PhoneInput';

interface PhoneInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  defaultCountry?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

function PhoneInputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  placeholder,
  defaultCountry = 'BG',
  required = false,
  error,
  helperText,
  className,
}: PhoneInputFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value, name: fieldName } }) => (
        <PhoneInput
          name={fieldName}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
          label={label}
          placeholder={placeholder}
          defaultCountry={defaultCountry}
          required={required}
          error={error}
          helperText={helperText}
          className={className}
        />
      )}
    />
  );
}

export default PhoneInputField;
