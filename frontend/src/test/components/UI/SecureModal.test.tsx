/**
 * SecureModal Component Tests
 * Tests for modal security, accessibility, and interaction patterns
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/testHelpers';
import { SecureModal } from '../../../components/UI/SecureModal';
import { checkAccessibility } from '../../utils/testHelpers';

describe('SecureModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock portal container
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    // Clean up portal container
    const portalRoot = document.getElementById('modal-root');
    if (portalRoot) {
      document.body.removeChild(portalRoot);
    }
  });

  describe('Basic Functionality', () => {
    it('renders modal when open', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} isOpen={false} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal {...defaultProps} onClose={onClose} />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal {...defaultProps} onClose={onClose} />
      );

      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking modal content', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal {...defaultProps} onClose={onClose} />
      );

      const modalContent = screen.getByText('Modal content');
      await user.click(modalContent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents closing when closeOnOverlayClick is false', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal
          {...defaultProps}
          onClose={onClose}
          closeOnOverlayClick={false}
        />
      );

      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('prevents XSS in title', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          title="<script>alert('xss')</script>Safe Title"
        />
      );

      const title = screen.getByText('Safe Title');
      expect(title).toBeInTheDocument();
      expect(title).not.toHaveTextContent('<script>');
    });

    it('sanitizes content', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          children={
            <div>
              <span>Safe content</span>
              <script>alert('xss')</script>
            </div>
          }
        />
      );

      expect(screen.getByText('Safe content')).toBeInTheDocument();
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('validates CSRF token for critical actions', async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal
          {...defaultProps}
          variant="critical"
          onConfirm={onConfirm}
          requireCsrfToken
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          csrfToken: 'mock-csrf-token'
        })
      );
    });

    it('enforces content security policy', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          children={
            <div>
              <img src="javascript:alert('xss')" alt="test" />
              <a href="javascript:void(0)">Link</a>
            </div>
          }
        />
      );

      const img = screen.getByRole('img');
      const link = screen.getByRole('link');

      expect(img).not.toHaveAttribute('src', 'javascript:alert(\'xss\')');
      expect(link).not.toHaveAttribute('href', 'javascript:void(0)');
    });

    it('implements secure iframe sandboxing', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          children={
            <iframe
              src="https://example.com"
              title="External content"
            />
          }
        />
      );

      const iframe = screen.getByTitle('External content');
      expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('sets focus to modal when opened', async () => {
      renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveFocus();
      });
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal
          {...defaultProps}
          children={
            <div>
              <button>First button</button>
              <input placeholder="Text input" />
              <button>Last button</button>
            </div>
          }
        />
      );

      const firstButton = screen.getByText('First button');
      const lastButton = screen.getByText('Last button');
      const closeButton = screen.getByRole('button', { name: /close/i });

      // Tab forward through all focusable elements
      await user.tab();
      expect(closeButton).toHaveFocus();

      await user.tab();
      expect(firstButton).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();

      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab should wrap to first focusable element
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Shift+Tab should go backwards
      await user.tab({ shift: true });
      expect(lastButton).toHaveFocus();
    });

    it('restores focus when closed', async () => {
      const user = userEvent.setup();

      const TriggerComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            <SecureModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              title="Test Modal"
            >
              Modal content
            </SecureModal>
          </div>
        );
      };

      renderWithProviders(<TriggerComponent />);

      const triggerButton = screen.getByText('Open Modal');
      await user.click(triggerButton);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      });
    });

    it('closes on Escape key', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal {...defaultProps} onClose={onClose} />
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape when disabled', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal
          {...defaultProps}
          onClose={onClose}
          closeOnEscape={false}
        />
      );

      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal Variants', () => {
    it('renders info variant correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} variant="info" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border-blue-500');
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('renders warning variant correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} variant="warning" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border-yellow-500');
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('renders critical variant correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} variant="critical" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border-red-500');
      expect(screen.getByTestId('critical-icon')).toBeInTheDocument();
    });

    it('renders success variant correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} variant="success" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border-green-500');
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });
  });

  describe('Modal Sizes', () => {
    it('applies small size correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} size="sm" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('applies large size correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} size="lg" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-4xl');
    });

    it('applies full screen size correctly', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} size="full" />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('w-screen', 'h-screen');
    });
  });

  describe('Animation and Transitions', () => {
    it('animates entrance', async () => {
      const { rerender } = renderWithProviders(
        <SecureModal {...defaultProps} isOpen={false} />
      );

      rerender(
        <SecureModal {...defaultProps} isOpen={true} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-modal-enter');
    });

    it('animates exit', async () => {
      const { rerender } = renderWithProviders(
        <SecureModal {...defaultProps} isOpen={true} />
      );

      rerender(
        <SecureModal {...defaultProps} isOpen={false} />
      );

      // Modal should still be in DOM during exit animation
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        if (dialog) {
          expect(dialog).toHaveClass('animate-modal-exit');
        }
      });
    });
  });

  describe('Footer Actions', () => {
    it('renders custom footer actions', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          footerActions={
            <div>
              <button>Custom Action</button>
            </div>
          }
        />
      );

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });

    it('renders confirmation dialog actions', async () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureModal
          {...defaultProps}
          variant="critical"
          onConfirm={onConfirm}
          onCancel={onCancel}
          confirmText="Delete"
          cancelText="Cancel"
        />
      );

      const confirmButton = screen.getByText('Delete');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      await user.click(confirmButton);
      expect(onConfirm).toHaveBeenCalledTimes(1);

      await user.click(cancelButton);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('handles render errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // Should not crash when child component throws
      expect(() => {
        renderWithProviders(
          <SecureModal {...defaultProps}>
            <ErrorComponent />
          </SecureModal>
        );
      }).not.toThrow();
    });

    it('shows error state when content fails to load', () => {
      renderWithProviders(
        <SecureModal
          {...defaultProps}
          error="Failed to load content"
        />
      );

      expect(screen.getByText('Failed to load content')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });
  });

  describe('Portal Rendering', () => {
    it('renders in portal container', () => {
      renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      const portalRoot = document.getElementById('modal-root');
      expect(portalRoot).toContainElement(screen.getByRole('dialog'));
    });

    it('cleans up portal on unmount', () => {
      const { unmount } = renderWithProviders(
        <SecureModal {...defaultProps} />
      );

      unmount();

      const portalRoot = document.getElementById('modal-root');
      expect(portalRoot?.children).toHaveLength(0);
    });
  });
});