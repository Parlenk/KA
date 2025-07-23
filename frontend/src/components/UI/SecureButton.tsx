import React, { useState, useCallback, useRef } from 'react';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface SecureButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
  // Security features
  preventDoubleClick?: boolean;
  requireConfirmation?: boolean;
  confirmationText?: string;
  rateLimitMs?: number;
  maxClicksPerMinute?: number;
  // Animation options
  rippleEffect?: boolean;
  hoverScale?: boolean;
  focusRing?: boolean;
}

interface ClickTracker {
  clicks: number[];
  lastClick: number;
}

const SecureButton: React.FC<SecureButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'data-testid': testId,
  preventDoubleClick = true,
  requireConfirmation = false,
  confirmationText = 'Are you sure?',
  rateLimitMs = 1000,
  maxClicksPerMinute = 10,
  rippleEffect = true,
  hoverScale = true,
  focusRing = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const clickTrackerRef = useRef<ClickTracker>({ clicks: [], lastClick: 0 });
  const rippleIdRef = useRef(0);

  // Rate limiting check
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const tracker = clickTrackerRef.current;
    
    // Check time-based rate limit
    if (now - tracker.lastClick < rateLimitMs) {
      setIsRateLimited(true);
      setTimeout(() => setIsRateLimited(false), rateLimitMs);
      return false;
    }

    // Check clicks per minute
    const oneMinuteAgo = now - 60000;
    tracker.clicks = tracker.clicks.filter(clickTime => clickTime > oneMinuteAgo);
    
    if (tracker.clicks.length >= maxClicksPerMinute) {
      setIsRateLimited(true);
      setTimeout(() => setIsRateLimited(false), 5000); // 5 second cooldown
      return false;
    }

    tracker.clicks.push(now);
    tracker.lastClick = now;
    return true;
  }, [rateLimitMs, maxClicksPerMinute]);

  // Handle click with security measures
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent if disabled, loading, or processing
    if (disabled || loading || isProcessing || isRateLimited) {
      event.preventDefault();
      return;
    }

    // Rate limiting check
    if (!checkRateLimit()) {
      event.preventDefault();
      return;
    }

    // Confirmation check
    if (requireConfirmation && !showConfirmation) {
      event.preventDefault();
      setShowConfirmation(true);
      return;
    }

    // Reset confirmation state
    if (showConfirmation) {
      setShowConfirmation(false);
    }

    // Prevent double click
    if (preventDoubleClick) {
      setIsProcessing(true);
    }

    try {
      // Execute onClick handler
      if (onClick) {
        const result = onClick(event);
        if (result instanceof Promise) {
          await result;
        }
      }
    } catch (error) {
      console.error('Button click error:', error);
      // Don't expose error details to user for security
    } finally {
      if (preventDoubleClick) {
        // Small delay to prevent accidental double clicks
        setTimeout(() => setIsProcessing(false), 300);
      }
    }
  }, [
    disabled, 
    loading, 
    isProcessing, 
    isRateLimited, 
    checkRateLimit, 
    requireConfirmation, 
    showConfirmation, 
    preventDoubleClick, 
    onClick
  ]);

  // Handle ripple effect
  const handleRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!rippleEffect || !buttonRef.current) return;

    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: rippleIdRef.current++,
      x,
      y
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
  }, [rippleEffect]);

  // Combined click handler
  const handleCombinedClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    handleRipple(event);
    handleClick(event);
  }, [handleRipple, handleClick]);

  // Variant styles
  const getVariantStyles = () => {
    const baseStyles = 'font-medium transition-all duration-200 focus:outline-none relative overflow-hidden';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md`;
      case 'secondary':
        return `${baseStyles} bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300`;
      case 'danger':
        return `${baseStyles} bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md`;
      case 'ghost':
        return `${baseStyles} bg-transparent hover:bg-gray-100 text-gray-700`;
      case 'outline':
        return `${baseStyles} bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50`;
      default:
        return baseStyles;
    }
  };

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-1 text-xs rounded';
      case 'sm':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'md':
        return 'px-4 py-2 text-sm rounded-md';
      case 'lg':
        return 'px-6 py-3 text-base rounded-lg';
      case 'xl':
        return 'px-8 py-4 text-lg rounded-lg';
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  // State-based styles
  const getStateStyles = () => {
    if (disabled || isRateLimited) {
      return 'opacity-50 cursor-not-allowed';
    }
    if (loading || isProcessing) {
      return 'cursor-wait';
    }
    return 'cursor-pointer';
  };

  // Animation styles
  const getAnimationStyles = () => {
    let styles = '';
    if (hoverScale && !disabled && !loading && !isProcessing) {
      styles += ' hover:scale-105 active:scale-95';
    }
    if (focusRing) {
      styles += ' focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    }
    return styles;
  };

  const isButtonDisabled = disabled || loading || isProcessing || isRateLimited;

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        onClick={handleCombinedClick}
        disabled={isButtonDisabled}
        className={`
          ${getVariantStyles()}
          ${getSizeStyles()}
          ${getStateStyles()}
          ${getAnimationStyles()}
          ${className}
        `}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        data-testid={testId}
        // Security attributes
        data-lpignore="true"
        autoComplete="off"
      >
        {/* Loading/Processing State */}
        {(loading || isProcessing) && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            {loadingText && <span>{loadingText}</span>}
          </div>
        )}

        {/* Rate Limited State */}
        {isRateLimited && (
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            <span>Please wait...</span>
          </div>
        )}

        {/* Normal State */}
        {!loading && !isProcessing && !isRateLimited && children}

        {/* Ripple Effects */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-white bg-opacity-30 rounded-full animate-ping pointer-events-none"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
          />
        ))}

        {/* Security indicator for sensitive actions */}
        {requireConfirmation && !showConfirmation && (
          <Shield 
            className="absolute top-1 right-1 text-yellow-400" 
            size={12} 
            title="Requires confirmation"
          />
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold">Confirm Action</h3>
            </div>
            
            <p className="text-gray-600 mb-6">{confirmationText}</p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  setShowConfirmation(false);
                  handleClick(e);
                }}
                className={`px-4 py-2 rounded-md font-medium ${
                  variant === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SecureButton;