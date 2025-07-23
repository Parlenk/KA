/**
 * AccessibilityProvider Component Tests
 * Tests for accessibility context, keyboard navigation, and screen reader support
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/testHelpers';
import { AccessibilityProvider, useAccessibility } from '../../../components/Accessibility/AccessibilityProvider';
import { checkAccessibility } from '../../utils/testHelpers';

// Test component that consumes accessibility context
const TestConsumer = () => {
  const {
    isScreenReaderActive,
    isHighContrast,
    isReducedMotion,
    keyboardNavigation,
    focusVisible,
    announceToScreenReader,
    toggleHighContrast,
    toggleReducedMotion,
    setFocusVisible
  } = useAccessibility();

  return (
    <div>
      <div data-testid="screen-reader-active">
        {isScreenReaderActive ? 'active' : 'inactive'}
      </div>
      <div data-testid="high-contrast">
        {isHighContrast ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="reduced-motion">
        {isReducedMotion ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="keyboard-navigation">
        {keyboardNavigation ? 'enabled' : 'disabled'}
      </div>
      <div data-testid="focus-visible">
        {focusVisible ? 'visible' : 'hidden'}
      </div>
      <button onClick={() => announceToScreenReader('Test announcement')}>
        Announce
      </button>
      <button onClick={toggleHighContrast}>
        Toggle High Contrast
      </button>
      <button onClick={toggleReducedMotion}>
        Toggle Reduced Motion
      </button>
      <button onClick={() => setFocusVisible(true)}>
        Show Focus
      </button>
    </div>
  );
};

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset media query mocks
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  describe('Initial State', () => {
    it('provides default accessibility state', () => {
      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('inactive');
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('disabled');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('disabled');
      expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('disabled');
      expect(screen.getByTestId('focus-visible')).toHaveTextContent('hidden');
    });

    it('detects system preferences from media queries', () => {
      // Mock prefers-reduced-motion
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('enabled');
    });

    it('loads saved preferences from localStorage', () => {
      localStorage.setItem('accessibility-preferences', JSON.stringify({
        highContrast: true,
        reducedMotion: true
      }));

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('high-contrast')).toHaveTextContent('enabled');
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('enabled');
    });
  });

  describe('Screen Reader Detection', () => {
    it('detects screen reader activation via keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
          <button>Test button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test button');
      
      // Tab to button to simulate keyboard navigation
      await user.tab();
      expect(button).toHaveFocus();

      await waitFor(() => {
        expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('active');
        expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('enabled');
      });
    });

    it('detects screen reader via focus events', async () => {
      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
          <button>Test button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test button');
      
      // Simulate focus without mouse
      fireEvent.focus(button);

      await waitFor(() => {
        expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('active');
      });
    });

    it('detects screen reader via ARIA live region usage', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const announceButton = screen.getByText('Announce');
      await user.click(announceButton);

      await waitFor(() => {
        expect(screen.getByTestId('screen-reader-active')).toHaveTextContent('active');
      });
    });
  });

  describe('High Contrast Mode', () => {
    it('toggles high contrast mode', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const toggleButton = screen.getByText('Toggle High Contrast');
      
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('disabled');
      
      await user.click(toggleButton);
      
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('enabled');
      
      await user.click(toggleButton);
      
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('disabled');
    });

    it('saves high contrast preference to localStorage', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const toggleButton = screen.getByText('Toggle High Contrast');
      await user.click(toggleButton);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('accessibility-preferences') || '{}');
        expect(saved.highContrast).toBe(true);
      });
    });

    it('applies high contrast CSS class to document', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const toggleButton = screen.getByText('Toggle High Contrast');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('high-contrast');
      });
    });
  });

  describe('Reduced Motion', () => {
    it('toggles reduced motion preference', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const toggleButton = screen.getByText('Toggle Reduced Motion');
      
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('disabled');
      
      await user.click(toggleButton);
      
      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('enabled');
    });

    it('applies reduced motion CSS class to document', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const toggleButton = screen.getByText('Toggle Reduced Motion');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('reduce-motion');
      });
    });
  });

  describe('Focus Management', () => {
    it('manages focus visibility state', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const showFocusButton = screen.getByText('Show Focus');
      
      expect(screen.getByTestId('focus-visible')).toHaveTextContent('hidden');
      
      await user.click(showFocusButton);
      
      expect(screen.getByTestId('focus-visible')).toHaveTextContent('visible');
    });

    it('shows focus on keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
          <button>Test button</button>
        </AccessibilityProvider>
      );

      // Tab to activate keyboard navigation
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('focus-visible')).toHaveTextContent('visible');
      });
    });

    it('hides focus on mouse interaction', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
          <button>Test button</button>
        </AccessibilityProvider>
      );

      const button = screen.getByText('Test button');
      
      // First activate keyboard navigation
      await user.tab();
      await waitFor(() => {
        expect(screen.getByTestId('focus-visible')).toHaveTextContent('visible');
      });

      // Then use mouse
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('focus-visible')).toHaveTextContent('hidden');
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('creates ARIA live region for announcements', () => {
      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('announces messages to screen reader', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const announceButton = screen.getByText('Announce');
      await user.click(announceButton);

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).toHaveTextContent('Test announcement');
      });
    });

    it('clears announcements after delay', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const announceButton = screen.getByText('Announce');
      await user.click(announceButton);

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toHaveTextContent('Test announcement');

      // Fast forward past cleanup delay
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('');
      });

      jest.useRealTimers();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('handles accessibility keyboard shortcuts', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      // Alt + H for high contrast
      await user.keyboard('{Alt>}h{/Alt}');
      
      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('enabled');
      });

      // Alt + M for reduced motion
      await user.keyboard('{Alt>}m{/Alt}');
      
      await waitFor(() => {
        expect(screen.getByTestId('reduced-motion')).toHaveTextContent('enabled');
      });
    });
  });

  describe('Media Query Listeners', () => {
    it('responds to prefers-reduced-motion changes', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event, handler) => {
          if (event === 'change' && query === '(prefers-reduced-motion: reduce)') {
            changeHandler = handler;
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('disabled');

      // Simulate media query change
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }

      expect(screen.getByTestId('reduced-motion')).toHaveTextContent('enabled');
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Quota exceeded');
      });

      expect(() => {
        renderWithProviders(
          <AccessibilityProvider>
            <TestConsumer />
          </AccessibilityProvider>
        );
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('handles context usage outside provider', () => {
      // Mock console.error to avoid test noise
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderWithProviders(<TestConsumer />);
      }).toThrow('useAccessibility must be used within AccessibilityProvider');

      console.error = originalError;
    });
  });

  describe('Accessibility Compliance', () => {
    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA attributes', () => {
      renderWithProviders(
        <AccessibilityProvider>
          <div>Test content</div>
        </AccessibilityProvider>
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveAttribute('aria-relevant', 'additions text');
    });
  });

  describe('Performance', () => {
    it('debounces rapid keyboard events', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
          <button>Test button</button>
        </AccessibilityProvider>
      );

      // Rapidly press Tab multiple times
      await user.keyboard('{Tab}{Tab}{Tab}');

      // Should only update state once after debounce
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(screen.getByTestId('keyboard-navigation')).toHaveTextContent('enabled');
      });

      jest.useRealTimers();
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListener = jest.fn();
      
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener,
        dispatchEvent: jest.fn()
      }));

      const { unmount } = renderWithProviders(
        <AccessibilityProvider>
          <TestConsumer />
        </AccessibilityProvider>
      );

      unmount();

      expect(removeEventListener).toHaveBeenCalled();
    });
  });
});