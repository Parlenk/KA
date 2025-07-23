import React, { useEffect, useCallback, useRef, useState } from 'react';
import { X, Shield, AlertTriangle, Lock } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SecureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'danger' | 'warning' | 'secure';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventBodyScroll?: boolean;
  className?: string;
  overlayClassName?: string;
  // Security features
  requireConfirmationToClose?: boolean;
  confirmationMessage?: string;
  autoCloseAfter?: number; // seconds
  maxOpenTime?: number; // seconds, for sensitive operations
  onSecurityViolation?: (reason: string) => void;
  // Accessibility
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  role?: string;
}

const SecureModal: React.FC<SecureModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  variant = 'default',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventBodyScroll = true,
  className = '',
  overlayClassName = '',
  requireConfirmationToClose = false,
  confirmationMessage = 'Are you sure you want to close? Any unsaved changes will be lost.',
  autoCloseAfter,
  maxOpenTime,
  onSecurityViolation,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  role = 'dialog'
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const openTimeRef = useRef<number>(0);
  const autoCloseTimerRef = useRef<NodeJS.Timeout>();
  const maxTimeTimerRef = useRef<NodeJS.Timeout>();

  // Security: Track modal open time
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      
      // Set up auto-close timer
      if (autoCloseAfter) {
        setTimeRemaining(autoCloseAfter);
        autoCloseTimerRef.current = setTimeout(() => {
          handleSecureClose('auto-close');
        }, autoCloseAfter * 1000);
      }

      // Set up max time timer for sensitive operations
      if (maxOpenTime) {
        maxTimeTimerRef.current = setTimeout(() => {
          onSecurityViolation?.('max-time-exceeded');
          handleForceClose();
        }, maxOpenTime * 1000);
      }
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      if (maxTimeTimerRef.current) {
        clearTimeout(maxTimeTimerRef.current);
      }
    };
  }, [isOpen, autoCloseAfter, maxOpenTime, onSecurityViolation]);

  // Update countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && autoCloseAfter && timeRemaining !== null) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOpen, autoCloseAfter, timeRemaining]);

  // Handle body scroll prevention
  useEffect(() => {
    if (isOpen && preventBodyScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventBodyScroll]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 100);
    } else {
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle secure close with potential confirmation
  const handleSecureClose = useCallback((reason: string = 'user-action') => {
    if (requireConfirmationToClose && reason === 'user-action') {
      setShowConfirmation(true);
      return;
    }

    setIsClosing(true);
    
    // Security: Log modal session duration
    const sessionDuration = Date.now() - openTimeRef.current;
    console.log(`Modal closed. Session duration: ${sessionDuration}ms, Reason: ${reason}`);
    
    // Animate close
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setShowConfirmation(false);
      setTimeRemaining(null);
    }, 150);
  }, [requireConfirmationToClose, onClose]);

  // Force close without confirmation (security scenarios)
  const handleForceClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setShowConfirmation(false);
      setTimeRemaining(null);
    }, 150);
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      handleSecureClose('overlay-click');
    }
  }, [closeOnOverlayClick, handleSecureClose]);

  // Handle escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      handleSecureClose('escape-key');
    }

    // Trap focus within modal
    if (event.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [closeOnEscape, handleSecureClose]);

  // Set up keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full h-full m-0';
      default:
        return 'max-w-lg';
    }
  };

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'danger':
        return 'border-l-4 border-red-500';
      case 'warning':
        return 'border-l-4 border-yellow-500';
      case 'secure':
        return 'border-l-4 border-blue-500 bg-blue-50';
      default:
        return '';
    }
  };

  // Get variant icon
  const getVariantIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'secure':
        return <Shield className="text-blue-500" size={20} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className={`
        fixed inset-0 z-50 overflow-y-auto
        ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}
        ${overlayClassName}
      `}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative bg-white rounded-lg shadow-xl w-full
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${isClosing ? 'animate-scaleOut' : 'animate-scaleIn'}
            ${className}
          `}
          role={role}
          aria-modal="true"
          aria-labelledby={ariaLabelledBy || 'modal-title'}
          aria-describedby={ariaDescribedBy}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              {getVariantIcon()}
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
              {variant === 'secure' && (
                <Lock className="text-blue-500" size={16} title="Secure modal" />
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Time remaining indicator */}
              {timeRemaining !== null && (
                <div className="text-sm text-orange-600 font-medium">
                  Auto-close in {timeRemaining}s
                </div>
              )}

              {/* Close button */}
              {showCloseButton && (
                <button
                  onClick={() => handleSecureClose('close-button')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold">Confirm Close</h3>
            </div>
            
            <p className="text-gray-600 mb-6">{confirmationMessage}</p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  handleSecureClose('confirmed');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render modal in portal for proper z-index handling
  return createPortal(modalContent, document.body);
};

export default SecureModal;