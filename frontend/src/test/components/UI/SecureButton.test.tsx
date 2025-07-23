/**
 * SecureButton Component Tests
 * Tests for security features, rate limiting, and accessibility
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/testHelpers';
import { SecureButton } from '../../../components/UI/SecureButton';
import { checkAccessibility } from '../../utils/testHelpers';

describe('SecureButton Component', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('renders button with correct content', () => {
      renderWithProviders(
        <SecureButton {...defaultProps}>Test Button</SecureButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Test Button');
    });

    it('calls onClick when clicked', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading state correctly', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} loading>
          Submit
        </SecureButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('applies correct variant styles', () => {
      const { rerender } = renderWithProviders(
        <SecureButton {...defaultProps} variant="primary" />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600');

      rerender(
        <SecureButton {...defaultProps} variant="secondary" />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-600');

      rerender(
        <SecureButton {...defaultProps} variant="danger" />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });

    it('applies correct size styles', () => {
      const { rerender } = renderWithProviders(
        <SecureButton {...defaultProps} size="sm" />
      );

      let button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(
        <SecureButton {...defaultProps} size="lg" />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Security Features', () => {
    it('implements rate limiting', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton
          {...defaultProps}
          onClick={onClick}
          rateLimit={{ maxClicks: 3, windowMs: 5000 }}
        />
      );

      const button = screen.getByRole('button');

      // Click 3 times (within limit)
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);

      // 4th click should be blocked
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(3);
      expect(button).toBeDisabled();
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });

    it('resets rate limit after window expires', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton
          {...defaultProps}
          onClick={onClick}
          rateLimit={{ maxClicks: 2, windowMs: 1000 }}
        />
      );

      const button = screen.getByRole('button');

      // Exhaust rate limit
      await user.click(button);
      await user.click(button);
      await user.click(button); // This should be blocked

      expect(onClick).toHaveBeenCalledTimes(2);
      expect(button).toBeDisabled();

      // Fast forward past window
      jest.advanceTimersByTime(1000);

      // Should be able to click again
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('prevents CSRF attacks with token validation', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton
          {...defaultProps}
          onClick={onClick}
          requireCsrfToken
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Should validate CSRF token before calling onClick
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({
          csrfToken: 'mock-csrf-token'
        })
      );
    });

    it('sanitizes custom data attributes', () => {
      renderWithProviders(
        <SecureButton
          {...defaultProps}
          data-custom="<script>alert('xss')</script>normal-data"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-custom', 'normal-data');
    });

    it('prevents double submission', async () => {
      const onClick = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');

      // Click rapidly multiple times
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Only first click should be processed
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <SecureButton
          {...defaultProps}
          aria-label="Custom label"
          aria-describedby="help-text"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('sets aria-busy when loading', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} loading />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('sets aria-disabled when disabled', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} disabled />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports keyboard navigation', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);

      await user.keyboard('{Space}');
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(
        <SecureButton {...defaultProps} aria-label="Accessible button" />
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} loading />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('hides content when loading', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} loading>
          Submit Form
        </SecureButton>
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveTextContent('Submit Form');
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows custom loading text', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} loading loadingText="Processing...">
          Submit
        </SecureButton>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('submits form when type is submit', async () => {
      const onSubmit = jest.fn(e => e.preventDefault());
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <form onSubmit={onSubmit}>
          <SecureButton {...defaultProps} type="submit">
            Submit
          </SecureButton>
        </form>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('validates form before submission', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <form>
          <input required />
          <SecureButton
            {...defaultProps}
            onClick={onClick}
            validateForm
            type="submit"
          >
            Submit
          </SecureButton>
        </form>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Should not call onClick if form is invalid
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Icon Integration', () => {
    it('renders with leading icon', () => {
      renderWithProviders(
        <SecureButton
          {...defaultProps}
          icon="plus"
          iconPosition="left"
        >
          Add Item
        </SecureButton>
      );

      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('renders with trailing icon', () => {
      renderWithProviders(
        <SecureButton
          {...defaultProps}
          icon="arrow-right"
          iconPosition="right"
        >
          Continue
        </SecureButton>
      );

      expect(screen.getByTestId('arrow-right-icon')).toBeInTheDocument();
    });

    it('renders icon-only button', () => {
      renderWithProviders(
        <SecureButton
          {...defaultProps}
          icon="close"
          iconOnly
          aria-label="Close"
        />
      );

      const button = screen.getByRole('button');
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Error Handling', () => {
    it('handles onClick errors gracefully', async () => {
      const onClick = jest.fn(() => {
        throw new Error('Test error');
      });
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Should not crash the component
      expect(button).toBeInTheDocument();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows error state when validation fails', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton
          {...defaultProps}
          validation={() => ({ valid: false, message: 'Validation failed' })}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(screen.getByText('Validation failed')).toBeInTheDocument();
      expect(button).toHaveClass('border-red-500');
    });
  });

  describe('Disabled State', () => {
    it('prevents clicks when disabled', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <SecureButton {...defaultProps} onClick={onClick} disabled />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('applies disabled styles', () => {
      renderWithProviders(
        <SecureButton {...defaultProps} disabled />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });
});