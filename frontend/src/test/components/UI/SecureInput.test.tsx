/**
 * SecureInput Component Tests
 * Tests for input validation, sanitization, and security features
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/testHelpers';
import { SecureInput } from '../../../components/UI/SecureInput';
import { checkAccessibility } from '../../utils/testHelpers';

describe('SecureInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Enter text'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders input with correct attributes', () => {
      renderWithProviders(
        <SecureInput {...defaultProps} label="Test Input" required />
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Test Input');

      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toBeRequired();
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('*'); // Required indicator
    });

    it('calls onChange with sanitized value', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          sanitization={{ stripHtml: true }}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '<script>alert("xss")</script>Hello');

      expect(onChange).toHaveBeenCalledWith(
        expect.not.stringContaining('<script>'),
        expect.any(Boolean)
      );
    });

    it('shows password toggle for password type', () => {
      renderWithProviders(
        <SecureInput {...defaultProps} type="password" />
      );

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(
        <SecureInput {...defaultProps} type="password" value="secret" />
      );

      const input = screen.getByRole('textbox');
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(input).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('Validation', () => {
    it('validates required fields', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          validation={{ required: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      // Focus and blur without entering text
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          type="email"
          validation={{ email: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, 'test@example.com');

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      });
    });

    it('validates minimum length', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          minLength={5}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'abc');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Minimum length is 5 characters')).toBeInTheDocument();
      });
    });

    it('validates maximum length', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          maxLength={5}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'toolongtext');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Maximum length is 5 characters')).toBeInTheDocument();
      });
    });

    it('validates custom patterns', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          pattern="[0-9]+"
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'abc123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid format')).toBeInTheDocument();
      });
    });

    it('runs custom validation', async () => {
      const onChange = jest.fn();
      const customValidator = jest.fn(() => ({ valid: false, message: 'Custom error' }));
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          validation={{ custom: customValidator }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'test');
      await user.tab();

      expect(customValidator).toHaveBeenCalledWith('test');
      
      await waitFor(() => {
        expect(screen.getByText('Custom error')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('prevents HTML injection', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          validation={{ noHtml: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, '<script>alert("xss")</script>');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('HTML tags are not allowed')).toBeInTheDocument();
      });
    });

    it('prevents script injection', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          validation={{ noScript: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'onclick="alert(1)"');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Script content is not allowed')).toBeInTheDocument();
      });
    });

    it('sanitizes input content', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          sanitization={{ stripHtml: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, '<b>Bold</b> text');

      expect(onChange).toHaveBeenLastCalledWith(
        'Bold text', // HTML stripped
        expect.any(Boolean)
      );
    });

    it('enforces maximum length in sanitization', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          onChange={onChange}
          sanitization={{ maxLength: 5 }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'verylongtext');

      expect(onChange).toHaveBeenLastCalledWith(
        'veryl', // Truncated to 5 characters
        expect.any(Boolean)
      );
    });
  });

  describe('Password Strength', () => {
    it('shows password strength indicator', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput {...defaultProps} type="password" value="weak" />
      );

      expect(screen.getByText('Password Strength')).toBeInTheDocument();
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
    });

    it('calculates strong password correctly', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput {...defaultProps} type="password" value="StrongP@ss123!" />
      );

      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <SecureInput
          {...defaultProps}
          label="Accessible Input"
          aria-describedby="help-text"
        />
      );

      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-label', 'Accessible Input');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('sets aria-invalid when validation fails', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          validation={{ required: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('passes accessibility audit', async () => {
      const { container } = renderWithProviders(
        <SecureInput
          {...defaultProps}
          label="Test Input"
          validation={{ required: true }}
        />
      );

      const results = await checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Character Count', () => {
    it('shows character count when maxLength is set', () => {
      renderWithProviders(
        <SecureInput {...defaultProps} maxLength={10} value="hello" />
      );

      expect(screen.getByText('5/10')).toBeInTheDocument();
    });

    it('highlights character count when near limit', () => {
      renderWithProviders(
        <SecureInput {...defaultProps} maxLength={10} value="verylongtext" />
      );

      const counter = screen.getByText('12/10');
      expect(counter).toHaveClass('text-orange-500');
    });
  });

  describe('Focus Management', () => {
    it('focuses input when label is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput {...defaultProps} label="Click me" />
      );

      const label = screen.getByText('Click me');
      const input = screen.getByRole('textbox');

      await user.click(label);
      
      expect(input).toHaveFocus();
    });

    it('shows focus styles', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput {...defaultProps} />
      );

      const input = screen.getByRole('textbox');

      await user.click(input);
      
      expect(input).toHaveClass('focus:border-blue-500');
    });
  });

  describe('Error States', () => {
    it('shows validation icon when validation fails', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          validation={{ required: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
      });
    });

    it('shows success icon when validation passes', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput
          {...defaultProps}
          validation={{ required: true }}
        />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'valid input');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('check-circle')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      renderWithProviders(
        <SecureInput {...defaultProps} disabled />
      );

      const input = screen.getByRole('textbox');
      
      expect(input).toBeDisabled();
      expect(input).toHaveClass('cursor-not-allowed');
    });

    it('does not call onChange when disabled', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <SecureInput {...defaultProps} onChange={onChange} disabled />
      );

      const input = screen.getByRole('textbox');
      
      await user.type(input, 'test');

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});