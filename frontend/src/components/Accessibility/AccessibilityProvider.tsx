import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sanitizeHtml } from '../../utils/security';

interface AccessibilityState {
  // Screen reader support
  announcements: string[];
  isScreenReaderActive: boolean;
  
  // Keyboard navigation
  focusTrap: {
    enabled: boolean;
    containerRef: React.RefObject<HTMLElement> | null;
  };
  keyboardNavigation: boolean;
  
  // Visual accessibility
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  
  // Focus management
  focusHistory: HTMLElement[];
  skipLinks: Array<{
    id: string;
    label: string;
    target: string;
  }>;
}

interface AccessibilityContextType extends AccessibilityState {
  // Announcement functions
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncements: () => void;
  
  // Focus management
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => void;
  releaseFocus: () => void;
  restoreFocus: () => void;
  moveFocusToFirst: (container: HTMLElement) => void;
  moveFocusToLast: (container: HTMLElement) => void;
  
  // Navigation
  addSkipLink: (id: string, label: string, target: string) => void;
  removeSkipLink: (id: string) => void;
  
  // Settings
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: AccessibilityState['fontSize']) => void;
  
  // Keyboard handlers
  handleKeyboardNavigation: (event: KeyboardEvent) => boolean;
  registerKeyboardShortcut: (key: string, handler: () => void, description: string) => void;
  unregisterKeyboardShortcut: (key: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

// WCAG 2.1 AA compliant accessibility provider
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>(() => {
    // Initialize from localStorage and system preferences
    const saved = localStorage.getItem('accessibility-preferences');
    const preferences = saved ? JSON.parse(saved) : {};
    
    return {
      announcements: [],
      isScreenReaderActive: false,
      focusTrap: { enabled: false, containerRef: null },
      keyboardNavigation: preferences.keyboardNavigation ?? true,
      highContrast: preferences.highContrast ?? window.matchMedia('(prefers-contrast: high)').matches,
      reducedMotion: preferences.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      fontSize: preferences.fontSize ?? 'medium',
      focusHistory: [],
      skipLinks: [
        { id: 'main-content', label: 'Skip to main content', target: '#main-content' },
        { id: 'navigation', label: 'Skip to navigation', target: '#navigation' },
        { id: 'canvas', label: 'Skip to canvas', target: '#canvas-container' }
      ]
    };
  });

  const announcementTimeoutRef = useRef<NodeJS.Timeout>();
  const keyboardShortcuts = useRef<Map<string, { handler: () => void; description: string }>>(new Map());

  // Detect screen reader
  useEffect(() => {
    // Detection method: create invisible element and check if it's announced
    const detectScreenReader = () => {
      const testElement = document.createElement('div');
      testElement.setAttribute('aria-live', 'polite');
      testElement.setAttribute('aria-atomic', 'true');
      testElement.style.position = 'absolute';
      testElement.style.left = '-10000px';
      testElement.style.width = '1px';
      testElement.style.height = '1px';
      testElement.style.overflow = 'hidden';
      
      document.body.appendChild(testElement);
      
      // Test if screen reader is active
      setTimeout(() => {
        testElement.textContent = 'Screen reader test';
        setTimeout(() => {
          setState(prev => ({ ...prev, isScreenReaderActive: true }));
          document.body.removeChild(testElement);
        }, 100);
      }, 100);
    };

    detectScreenReader();
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    const preferences = {
      keyboardNavigation: state.keyboardNavigation,
      highContrast: state.highContrast,
      reducedMotion: state.reducedMotion,
      fontSize: state.fontSize
    };
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [state.keyboardNavigation, state.highContrast, state.reducedMotion, state.fontSize]);

  // Apply CSS custom properties for accessibility settings
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Font size
    root.setAttribute('data-font-size', state.fontSize);
    
    // CSS custom properties
    const fontSizeMap = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.125rem',
      xl: '1.25rem'
    };
    
    root.style.setProperty('--accessibility-font-size', fontSizeMap[state.fontSize]);
  }, [state.highContrast, state.reducedMotion, state.fontSize]);

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Sanitize message to prevent XSS
    const sanitizedMessage = sanitizeHtml(message, 'TEXT');
    
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements, sanitizedMessage]
    }));

    // Create live region for announcement
    const liveRegion = document.getElementById('accessibility-announcements');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = sanitizedMessage;
      
      // Clear after announcement
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      
      announcementTimeoutRef.current = setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }, []);

  const clearAnnouncements = useCallback(() => {
    setState(prev => ({ ...prev, announcements: [] }));
  }, []);

  // Focus trap for modals and dropdowns
  const trapFocus = useCallback((containerRef: React.RefObject<HTMLElement>) => {
    setState(prev => ({
      ...prev,
      focusTrap: { enabled: true, containerRef },
      focusHistory: [...prev.focusHistory, document.activeElement as HTMLElement]
    }));
  }, []);

  const releaseFocus = useCallback(() => {
    setState(prev => ({
      ...prev,
      focusTrap: { enabled: false, containerRef: null }
    }));
  }, []);

  const restoreFocus = useCallback(() => {
    setState(prev => {
      const lastFocused = prev.focusHistory[prev.focusHistory.length - 1];
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus();
      }
      
      return {
        ...prev,
        focusHistory: prev.focusHistory.slice(0, -1),
        focusTrap: { enabled: false, containerRef: null }
      };
    });
  }, []);

  // Get focusable elements within a container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => {
        const element = el as HTMLElement;
        return element.offsetWidth > 0 && element.offsetHeight > 0;
      }) as HTMLElement[];
  }, []);

  const moveFocusToFirst = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  const moveFocusToLast = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // Skip link management
  const addSkipLink = useCallback((id: string, label: string, target: string) => {
    setState(prev => ({
      ...prev,
      skipLinks: [...prev.skipLinks.filter(link => link.id !== id), { id, label, target }]
    }));
  }, []);

  const removeSkipLink = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      skipLinks: prev.skipLinks.filter(link => link.id !== id)
    }));
  }, []);

  // Accessibility settings
  const toggleHighContrast = useCallback(() => {
    setState(prev => ({ ...prev, highContrast: !prev.highContrast }));
    announce(state.highContrast ? 'High contrast disabled' : 'High contrast enabled');
  }, [state.highContrast, announce]);

  const toggleReducedMotion = useCallback(() => {
    setState(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    announce(state.reducedMotion ? 'Animations enabled' : 'Animations reduced');
  }, [state.reducedMotion, announce]);

  const setFontSize = useCallback((size: AccessibilityState['fontSize']) => {
    setState(prev => ({ ...prev, fontSize: size }));
    announce(`Font size changed to ${size}`);
  }, [announce]);

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent): boolean => {
    if (!state.keyboardNavigation) return false;

    const { key, ctrlKey, altKey, shiftKey } = event;

    // Handle focus trap
    if (state.focusTrap.enabled && state.focusTrap.containerRef?.current) {
      const container = state.focusTrap.containerRef.current;
      const focusableElements = getFocusableElements(container);
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      if (key === 'Tab') {
        if (focusableElements.length === 0) {
          event.preventDefault();
          return true;
        }

        if (shiftKey) {
          // Shift+Tab - move to previous element
          if (currentIndex <= 0) {
            event.preventDefault();
            focusableElements[focusableElements.length - 1].focus();
            return true;
          }
        } else {
          // Tab - move to next element
          if (currentIndex >= focusableElements.length - 1) {
            event.preventDefault();
            focusableElements[0].focus();
            return true;
          }
        }
      }

      if (key === 'Escape') {
        event.preventDefault();
        restoreFocus();
        return true;
      }
    }

    // Global keyboard shortcuts
    const shortcutKey = [
      ctrlKey && 'Ctrl',
      altKey && 'Alt', 
      shiftKey && 'Shift',
      key
    ].filter(Boolean).join('+');

    const shortcut = keyboardShortcuts.current.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      shortcut.handler();
      return true;
    }

    // Default accessibility shortcuts
    if (altKey) {
      switch (key) {
        case 'h':
          event.preventDefault();
          toggleHighContrast();
          return true;
        case 'm':
          event.preventDefault();
          toggleReducedMotion();
          return true;
        case '1':
          event.preventDefault();
          setFontSize('small');
          return true;
        case '2':
          event.preventDefault();
          setFontSize('medium');
          return true;
        case '3':
          event.preventDefault();
          setFontSize('large');
          return true;
        case '4':
          event.preventDefault();
          setFontSize('xl');
          return true;
      }
    }

    return false;
  }, [
    state.keyboardNavigation,
    state.focusTrap,
    getFocusableElements,
    restoreFocus,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize
  ]);

  // Keyboard shortcut management
  const registerKeyboardShortcut = useCallback((key: string, handler: () => void, description: string) => {
    keyboardShortcuts.current.set(key, { handler, description });
  }, []);

  const unregisterKeyboardShortcut = useCallback((key: string) => {
    keyboardShortcuts.current.delete(key);
  }, []);

  // Set up global keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyboardNavigation(event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyboardNavigation]);

  // Context value
  const contextValue: AccessibilityContextType = {
    ...state,
    announce,
    clearAnnouncements,
    trapFocus,
    releaseFocus,
    restoreFocus,
    moveFocusToFirst,
    moveFocusToLast,
    addSkipLink,
    removeSkipLink,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    handleKeyboardNavigation,
    registerKeyboardShortcut,
    unregisterKeyboardShortcut
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Live region for announcements */}
      <div
        id="accessibility-announcements"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* Skip links */}
      <div className="skip-links">
        {state.skipLinks.map(link => (
          <a
            key={link.id}
            href={link.target}
            className="skip-link"
            onClick={(e) => {
              e.preventDefault();
              const target = document.querySelector(link.target);
              if (target) {
                (target as HTMLElement).focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                announce(`Navigated to ${link.label}`);
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Higher-order component for accessibility features
export interface WithAccessibilityProps {
  accessibility: AccessibilityContextType;
}

export function withAccessibility<P extends WithAccessibilityProps>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: Omit<P, 'accessibility'>) => {
    const accessibility = useAccessibility();
    return <Component {...(props as P)} accessibility={accessibility} />;
  };
  
  WrappedComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default AccessibilityProvider;