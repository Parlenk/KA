import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Target } from 'lucide-react';
import { useAccessibility } from './AccessibilityProvider';

interface KeyboardNavigationOverlayProps {
  enabled?: boolean;
  showHints?: boolean;
  className?: string;
}

interface FocusableElement {
  element: HTMLElement;
  rect: DOMRect;
  index: number;
  role: string;
  label: string;
  type: 'button' | 'input' | 'link' | 'custom';
}

const KeyboardNavigationOverlay: React.FC<KeyboardNavigationOverlayProps> = ({
  enabled = true,
  showHints = true,
  className = ''
}) => {
  const [focusableElements, setFocusableElements] = useState<FocusableElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'sequential' | 'spatial'>('sequential');
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const rescanTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    keyboardNavigation, 
    announce, 
    registerKeyboardShortcut, 
    unregisterKeyboardShortcut 
  } = useAccessibility();

  // Focusable element selectors
  const focusableSelectors = [
    'button:not([disabled]):not([aria-hidden="true"])',
    'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
    'select:not([disabled]):not([aria-hidden="true"])',
    'textarea:not([disabled]):not([aria-hidden="true"])',
    'a[href]:not([aria-hidden="true"])',
    '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
    '[contenteditable="true"]:not([aria-hidden="true"])',
    '[role="button"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
    '[role="menuitem"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
    '[role="tab"]:not([aria-disabled="true"]):not([aria-hidden="true"])',
    'canvas:not([aria-hidden="true"])'
  ].join(', ');

  // Scan for focusable elements
  const scanFocusableElements = useCallback(() => {
    if (!enabled || !keyboardNavigation) return;

    const elements = Array.from(document.querySelectorAll(focusableSelectors))
      .filter(el => {
        const element = el as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        // Filter out invisible elements
        if (rect.width === 0 && rect.height === 0) return false;
        if (element.offsetParent === null) return false;
        
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        
        return true;
      })
      .map((el, index) => {
        const element = el as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        // Determine element type and role
        let type: FocusableElement['type'] = 'custom';
        if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
          type = 'button';
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
          type = 'input';
        } else if (element.tagName === 'A') {
          type = 'link';
        }

        // Get accessible label
        const label = 
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') && 
          document.getElementById(element.getAttribute('aria-labelledby')!)?.textContent ||
          element.getAttribute('title') ||
          element.textContent?.trim() ||
          element.getAttribute('placeholder') ||
          `${element.tagName.toLowerCase()} element`;

        const role = element.getAttribute('role') || element.tagName.toLowerCase();

        return {
          element,
          rect,
          index,
          role,
          label: label.substring(0, 50), // Truncate long labels
          type
        };
      });

    setFocusableElements(elements);
  }, [enabled, keyboardNavigation]);

  // Update current focus index based on document.activeElement
  const updateCurrentFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    const index = focusableElements.findIndex(item => item.element === activeElement);
    setCurrentFocusIndex(index);
  }, [focusableElements]);

  // Spatial navigation helper
  const findClosestElement = useCallback((
    direction: 'up' | 'down' | 'left' | 'right',
    currentElement: FocusableElement
  ): FocusableElement | null => {
    const currentRect = currentElement.rect;
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestElement: FocusableElement | null = null;
    let bestDistance = Infinity;

    focusableElements.forEach(element => {
      if (element === currentElement) return;

      const rect = element.rect;
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      let isInDirection = false;
      let distance = 0;

      switch (direction) {
        case 'up':
          isInDirection = center.y < currentCenter.y;
          distance = Math.abs(currentCenter.y - center.y) + Math.abs(currentCenter.x - center.x) * 0.5;
          break;
        case 'down':
          isInDirection = center.y > currentCenter.y;
          distance = Math.abs(center.y - currentCenter.y) + Math.abs(currentCenter.x - center.x) * 0.5;
          break;
        case 'left':
          isInDirection = center.x < currentCenter.x;
          distance = Math.abs(currentCenter.x - center.x) + Math.abs(currentCenter.y - center.y) * 0.5;
          break;
        case 'right':
          isInDirection = center.x > currentCenter.x;
          distance = Math.abs(center.x - currentCenter.x) + Math.abs(currentCenter.y - center.y) * 0.5;
          break;
      }

      if (isInDirection && distance < bestDistance) {
        bestDistance = distance;
        bestElement = element;
      }
    });

    return bestElement;
  }, [focusableElements]);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (!enabled || !keyboardNavigation || !showOverlay) return;

    const { key, ctrlKey, altKey } = event;
    
    // Toggle overlay with Ctrl+K
    if (ctrlKey && key === 'k') {
      event.preventDefault();
      setShowOverlay(!showOverlay);
      announce(showOverlay ? 'Keyboard navigation overlay hidden' : 'Keyboard navigation overlay shown');
      return;
    }

    if (!showOverlay) return;

    // Toggle navigation mode with Ctrl+M
    if (ctrlKey && key === 'm') {
      event.preventDefault();
      const newMode = navigationMode === 'sequential' ? 'spatial' : 'sequential';
      setNavigationMode(newMode);
      announce(`Navigation mode: ${newMode}`);
      return;
    }

    // Show keyboard help with ?
    if (key === '?' && !altKey && !ctrlKey) {
      event.preventDefault();
      setKeyboardHelpVisible(!keyboardHelpVisible);
      return;
    }

    const currentElement = focusableElements[currentFocusIndex];
    
    if (navigationMode === 'spatial' && currentElement) {
      // Spatial navigation with arrow keys
      let targetElement: FocusableElement | null = null;

      switch (key) {
        case 'ArrowUp':
          event.preventDefault();
          targetElement = findClosestElement('up', currentElement);
          break;
        case 'ArrowDown':
          event.preventDefault();
          targetElement = findClosestElement('down', currentElement);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          targetElement = findClosestElement('left', currentElement);
          break;
        case 'ArrowRight':
          event.preventDefault();
          targetElement = findClosestElement('right', currentElement);
          break;
      }

      if (targetElement) {
        targetElement.element.focus();
        announce(`Focused: ${targetElement.label}`);
      }
    } else {
      // Sequential navigation
      switch (key) {
        case 'ArrowDown':
        case 'j': // Vim-style navigation
          event.preventDefault();
          if (currentFocusIndex < focusableElements.length - 1) {
            const nextElement = focusableElements[currentFocusIndex + 1];
            nextElement.element.focus();
            announce(`Focused: ${nextElement.label}`);
          }
          break;
        case 'ArrowUp':
        case 'k': // Vim-style navigation
          event.preventDefault();
          if (currentFocusIndex > 0) {
            const prevElement = focusableElements[currentFocusIndex - 1];
            prevElement.element.focus();
            announce(`Focused: ${prevElement.label}`);
          }
          break;
        case 'Home':
          event.preventDefault();
          if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            firstElement.element.focus();
            announce(`Focused first element: ${firstElement.label}`);
          }
          break;
        case 'End':
          event.preventDefault();
          if (focusableElements.length > 0) {
            const lastElement = focusableElements[focusableElements.length - 1];
            lastElement.element.focus();
            announce(`Focused last element: ${lastElement.label}`);
          }
          break;
      }
    }

    // Numbers 1-9 for quick access
    if (!isNaN(Number(key)) && Number(key) > 0 && Number(key) <= 9) {
      event.preventDefault();
      const index = Number(key) - 1;
      if (index < focusableElements.length) {
        const element = focusableElements[index];
        element.element.focus();
        announce(`Quick access: ${element.label}`);
      }
    }
  }, [
    enabled,
    keyboardNavigation,
    showOverlay,
    navigationMode,
    currentFocusIndex,
    focusableElements,
    findClosestElement,
    keyboardHelpVisible,
    announce
  ]);

  // Set up keyboard shortcuts
  useEffect(() => {
    registerKeyboardShortcut('Ctrl+k', () => {
      setShowOverlay(!showOverlay);
      announce(showOverlay ? 'Keyboard overlay hidden' : 'Keyboard overlay shown');
    }, 'Toggle keyboard navigation overlay');

    return () => {
      unregisterKeyboardShortcut('Ctrl+k');
    };
  }, [showOverlay, registerKeyboardShortcut, unregisterKeyboardShortcut, announce]);

  // Scan elements on mount and when DOM changes
  useEffect(() => {
    scanFocusableElements();
    updateCurrentFocus();

    const observer = new MutationObserver(() => {
      // Debounce rescanning
      if (rescanTimeoutRef.current) {
        clearTimeout(rescanTimeoutRef.current);
      }
      rescanTimeoutRef.current = setTimeout(scanFocusableElements, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-hidden', 'tabindex']
    });

    return () => {
      observer.disconnect();
      if (rescanTimeoutRef.current) {
        clearTimeout(rescanTimeoutRef.current);
      }
    };
  }, [scanFocusableElements, updateCurrentFocus]);

  // Update focus tracking
  useEffect(() => {
    const handleFocusChange = () => {
      updateCurrentFocus();
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => document.removeEventListener('focusin', handleFocusChange);
  }, [updateCurrentFocus]);

  // Keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  if (!enabled || !keyboardNavigation) return null;

  return (
    <>
      {/* Overlay indicators */}
      {showOverlay && (
        <div
          ref={overlayRef}
          className={`fixed inset-0 pointer-events-none z-40 ${className}`}
          aria-hidden="true"
        >
          {/* Focus indicators */}
          {focusableElements.map((item, index) => {
            const isCurrentFocus = index === currentFocusIndex;
            const isNumbered = index < 9;

            return (
              <div
                key={`${item.element.tagName}-${item.index}`}
                className={`absolute border-2 rounded-md transition-all duration-200 ${
                  isCurrentFocus 
                    ? 'border-blue-500 bg-blue-500 bg-opacity-20 shadow-lg' 
                    : 'border-yellow-400 bg-yellow-400 bg-opacity-10'
                }`}
                style={{
                  left: item.rect.left - 2,
                  top: item.rect.top - 2,
                  width: item.rect.width + 4,
                  height: item.rect.height + 4,
                  transform: isCurrentFocus ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {/* Element number for quick access */}
                {isNumbered && (
                  <div
                    className={`absolute -top-6 -left-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                      isCurrentFocus ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                )}

                {/* Element info tooltip */}
                {showHints && isCurrentFocus && (
                  <div className="absolute -bottom-8 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap max-w-xs truncate">
                    {item.label} ({item.type})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      {showOverlay && (
        <div className="fixed bottom-4 left-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
          <div className="flex items-center gap-3 text-sm">
            <Keyboard className="w-4 h-4" />
            <span>
              {currentFocusIndex + 1} / {focusableElements.length}
            </span>
            <span className="text-gray-300">|</span>
            <span className="capitalize">{navigationMode}</span>
            <span className="text-gray-300">|</span>
            <span>Ctrl+K to toggle</span>
          </div>
        </div>
      )}

      {/* Keyboard help modal */}
      {keyboardHelpVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Keyboard Navigation Help</h3>
              <button
                onClick={() => setKeyboardHelpVisible(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close help"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Navigation</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <kbd className="bg-gray-100 px-2 py-1 rounded">↑↓</kbd>
                  <span>Navigate elements</span>
                  <kbd className="bg-gray-100 px-2 py-1 rounded">←→</kbd>
                  <span>Spatial navigation</span>
                  <kbd className="bg-gray-100 px-2 py-1 rounded">1-9</kbd>
                  <span>Quick access</span>
                  <kbd className="bg-gray-100 px-2 py-1 rounded">Home/End</kbd>
                  <span>First/Last element</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Controls</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl+K</kbd>
                  <span>Toggle overlay</span>
                  <kbd className="bg-gray-100 px-2 py-1 rounded">Ctrl+M</kbd>
                  <span>Toggle mode</span>
                  <kbd className="bg-gray-100 px-2 py-1 rounded">?</kbd>
                  <span>Show this help</span>
                </div>
              </div>

              <div className="text-gray-600 text-xs">
                Current mode: <strong className="capitalize">{navigationMode}</strong>
                <br />
                Total focusable elements: <strong>{focusableElements.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardNavigationOverlay;