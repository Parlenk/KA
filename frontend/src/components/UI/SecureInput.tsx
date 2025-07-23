import React, { useState, useCallback, useMemo } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle, X } from 'lucide-react';
import DOMPurify from 'dompurify';

interface SecureInputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  validation?: {
    required?: boolean;
    email?: boolean;
    url?: boolean;
    noHtml?: boolean;
    noScript?: boolean;
    custom?: (value: string) => { valid: boolean; message?: string };
  };
  sanitization?: {
    stripHtml?: boolean;
    allowedTags?: string[];
    maxLength?: number;
  };
  className?: string;
  autoComplete?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const SecureInput: React.FC<SecureInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  maxLength,
  minLength,
  pattern,
  validation = {},
  sanitization = {},
  className = '',
  autoComplete,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Validation rules
  const validateInput = useCallback((inputValue: string) => {
    const errors: string[] = [];

    // Required validation
    if (validation.required && !inputValue.trim()) {
      errors.push('This field is required');
    }

    // Length validation
    if (minLength && inputValue.length < minLength) {
      errors.push(`Minimum length is ${minLength} characters`);
    }

    if (maxLength && inputValue.length > maxLength) {
      errors.push(`Maximum length is ${maxLength} characters`);
    }

    // Email validation
    if (validation.email && inputValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inputValue)) {
        errors.push('Please enter a valid email address');
      }
    }

    // URL validation
    if (validation.url && inputValue) {
      try {
        new URL(inputValue);
      } catch {
        errors.push('Please enter a valid URL');
      }
    }

    // HTML/Script injection protection
    if (validation.noHtml && inputValue) {
      const htmlRegex = /<[^>]*>/g;
      if (htmlRegex.test(inputValue)) {
        errors.push('HTML tags are not allowed');
      }
    }

    if (validation.noScript && inputValue) {
      const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      const onEventRegex = /on\w+\s*=/gi;
      const jsProtocolRegex = /javascript:/gi;
      
      if (scriptRegex.test(inputValue) || onEventRegex.test(inputValue) || jsProtocolRegex.test(inputValue)) {
        errors.push('Script content is not allowed');
      }
    }

    // Pattern validation
    if (pattern && inputValue) {
      const regex = new RegExp(pattern);
      if (!regex.test(inputValue)) {
        errors.push('Please enter a valid format');
      }
    }

    // Custom validation
    if (validation.custom && inputValue) {
      const customResult = validation.custom(inputValue);
      if (!customResult.valid && customResult.message) {
        errors.push(customResult.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [validation, minLength, maxLength, pattern]);

  // Sanitization function
  const sanitizeInput = useCallback((inputValue: string) => {
    let sanitized = inputValue;

    // Strip HTML if requested
    if (sanitization.stripHtml) {
      if (sanitization.allowedTags && sanitization.allowedTags.length > 0) {
        sanitized = DOMPurify.sanitize(sanitized, {
          ALLOWED_TAGS: sanitization.allowedTags,
          ALLOWED_ATTR: []
        });
      } else {
        sanitized = DOMPurify.sanitize(sanitized, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      }
    }

    // Enforce max length
    if (sanitization.maxLength && sanitized.length > sanitization.maxLength) {
      sanitized = sanitized.substring(0, sanitization.maxLength);
    }

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }, [sanitization]);

  // Memoized validation result
  const validationResult = useMemo(() => {
    return validateInput(value);
  }, [value, validateInput]);

  // Handle input change with sanitization and validation
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const sanitizedValue = sanitizeInput(rawValue);
    const { isValid } = validateInput(sanitizedValue);
    
    onChange(sanitizedValue, isValid);
  }, [sanitizeInput, validateInput, onChange]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setHasBeenTouched(true);
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Password toggle
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Security attributes
  const securityProps = useMemo(() => {
    const props: React.InputHTMLAttributes<HTMLInputElement> = {
      autoComplete: autoComplete || 'off',
      spellCheck: false,
      'data-lpignore': 'true', // LastPass ignore
      'data-form-type': 'other' // Prevent autofill
    };

    // Additional security for password fields
    if (type === 'password') {
      props.autoComplete = 'current-password';
      props['data-lpignore'] = 'true';
    }

    return props;
  }, [type, autoComplete]);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasErrors = hasBeenTouched && !validationResult.isValid;
  const hasValue = value.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label 
          className={`block text-sm font-medium mb-1 transition-colors ${
            hasErrors ? 'text-red-600' : 
            isFocused ? 'text-blue-600' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          minLength={minLength}
          required={required}
          aria-label={ariaLabel || label}
          aria-describedby={ariaDescribedBy}
          aria-invalid={hasErrors}
          className={`
            w-full px-3 py-2 border rounded-lg transition-all duration-200
            ${hasErrors 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
              : isFocused 
                ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-200'
                : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${type === 'password' ? 'pr-10' : ''}
            placeholder:text-gray-400
          `}
          {...securityProps}
        />

        {/* Password Toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {/* Validation Icon */}
        {hasBeenTouched && hasValue && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {validationResult.isValid ? (
              <CheckCircle size={18} className="text-green-500" />
            ) : (
              <AlertTriangle size={18} className="text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Character Count */}
      {maxLength && (
        <div className="flex justify-end mt-1">
          <span className={`text-xs ${
            value.length > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-400'
          }`}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}

      {/* Validation Messages */}
      {hasBeenTouched && validationResult.errors.length > 0 && (
        <div className="mt-1 space-y-1">
          {validationResult.errors.map((error, index) => (
            <div key={index} className="flex items-center gap-1 text-red-600 text-xs">
              <X size={12} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Security Indicator */}
      {type === 'password' && hasValue && (
        <div className="mt-2">
          <PasswordStrengthIndicator password={value} />
        </div>
      )}
    </div>
  );
};

// Password strength indicator component
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      numbers: /\d/.test(pwd),
      symbols: /[^A-Za-z0-9]/.test(pwd),
      noCommon: !['password', '123456', 'qwerty', 'abc123'].includes(pwd.toLowerCase())
    };

    score = Object.values(checks).filter(Boolean).length;

    let strength = 'Very Weak';
    let color = 'bg-red-500';
    let width = '20%';

    if (score >= 5) {
      strength = 'Strong';
      color = 'bg-green-500';
      width = '100%';
    } else if (score >= 4) {
      strength = 'Good';
      color = 'bg-yellow-500';
      width = '80%';
    } else if (score >= 3) {
      strength = 'Fair';
      color = 'bg-orange-500';
      width = '60%';
    } else if (score >= 2) {
      strength = 'Weak';
      color = 'bg-red-400';
      width = '40%';
    }

    return { strength, color, width, checks };
  };

  const { strength, color, width } = getPasswordStrength(password);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">Password Strength</span>
        <span className={`text-xs font-medium ${
          strength === 'Strong' ? 'text-green-600' :
          strength === 'Good' ? 'text-yellow-600' :
          strength === 'Fair' ? 'text-orange-600' : 'text-red-600'
        }`}>
          {strength}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className={`${color} h-1 rounded-full transition-all duration-300`}
          style={{ width }}
        />
      </div>
    </div>
  );
};

export default SecureInput;