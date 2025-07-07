import { useState, useCallback, useMemo } from 'react';

// 🎨 FORM DATA TYPES
export interface UseFormDataOptions<T> {
  initialData: T;
  onSubmit?: (data: T) => Promise<void> | void;
  validate?: (data: T) => Record<string, string> | undefined;
  resetOnSubmit?: boolean;
}

export interface FormDataState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  
  // Field operations
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  updateFields: (updates: Partial<T>) => void;
  setData: (data: T) => void;
  setFieldError: (field: string, error: string) => void;
  clearFieldError: (field: string) => void;
  clearErrors: () => void;
  
  // Form operations
  reset: () => void;
  submit: () => Promise<void>;
  validate: () => boolean;
}

export function useFormData<T extends Record<string, any>>(
  options: UseFormDataOptions<T>
): FormDataState<T> {
  const { initialData, onSubmit, validate, resetOnSubmit = false } = options;
  
  const [data, setDataState] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate derived state
  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData]);

  const isValid = useMemo(() => {
    if (validate) {
      const validationErrors = validate(data);
      return !validationErrors || Object.keys(validationErrors).length === 0;
    }
    return Object.keys(errors).length === 0;
  }, [data, errors, validate]);

  // Field operations
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setDataState(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when it's updated
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  const updateFields = useCallback((updates: Partial<T>) => {
    setDataState(prev => ({
      ...prev,
      ...updates
    }));
    
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates);
    if (updatedFields.some(field => errors[field])) {
      setErrors(prev => {
        const newErrors = { ...prev };
        updatedFields.forEach(field => {
          if (newErrors[field]) {
            delete newErrors[field];
          }
        });
        return newErrors;
      });
    }
  }, [errors]);

  const setData = useCallback((newData: T) => {
    setDataState(newData);
    setErrors({}); // Clear all errors when setting new data
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Form operations
  const reset = useCallback(() => {
    setDataState(initialData);
    setErrors({});
    setIsSubmitting(false);
  }, [initialData]);

  const validateForm = useCallback(() => {
    if (!validate) return true;
    
    const validationErrors = validate(data);
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    
    setErrors({});
    return true;
  }, [data, validate]);

  const submit = useCallback(async () => {
    if (isSubmitting || !onSubmit) return;
    
    // Validate before submitting
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(data);
      
      if (resetOnSubmit) {
        reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      // If the error has field-specific errors, set them
      if (error && typeof error === 'object' && 'fieldErrors' in error) {
        setErrors((error as any).fieldErrors);
      } else {
        // Generic form error
        setFieldError('form', error instanceof Error ? error.message : 'Submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, onSubmit, validateForm, reset, resetOnSubmit, setFieldError]);

  return {
    data,
    errors,
    isSubmitting,
    isDirty,
    isValid,
    
    // Field operations
    updateField,
    updateFields,
    setData,
    setFieldError,
    clearFieldError,
    clearErrors,
    
    // Form operations
    reset,
    submit,
    validate: validateForm
  };
}

// 🎪 SIMPLIFIED FORM HOOK for basic use cases
export function useSimpleForm<T extends Record<string, any>>(initialData: T) {
  return useFormData({
    initialData,
    resetOnSubmit: false
  });
}

// 🎯 FORM FIELD HELPER for individual field binding
export interface FieldBinding<T> {
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

export function createFieldBinding<T extends Record<string, any>, K extends keyof T>(
  formState: FormDataState<T>,
  fieldName: K
): FieldBinding<T[K]> {
  return {
    value: formState.data[fieldName],
    onChange: (value: T[K]) => formState.updateField(fieldName, value),
    error: formState.errors[fieldName as string]
  };
}

// 🎨 VALIDATION HELPERS
export const validators = {
  required: (value: any, message = 'This field is required') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return message;
    }
    return undefined;
  },
  
  email: (value: string, message = 'Please enter a valid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return message;
    }
    return undefined;
  },
  
  minLength: (min: number, message?: string) => (value: string) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return undefined;
  },
  
  maxLength: (max: number, message?: string) => (value: string) => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`;
    }
    return undefined;
  }
};

// 🎯 COMBINE VALIDATORS
export function combineValidators<T>(...validators: Array<(value: T) => string | undefined>) {
  return (value: T): string | undefined => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  };
} 