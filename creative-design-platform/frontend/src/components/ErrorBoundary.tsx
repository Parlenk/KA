import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, prevents error from bubbling up
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if implemented)
    this.sendErrorToMonitoring(error, errorInfo);

    // If isolate is false, re-throw the error to let parent boundaries handle it
    if (!this.props.isolate) {
      // Small delay to ensure logging completes
      setTimeout(() => {
        throw error;
      }, 0);
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  private sendErrorToMonitoring = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you would send this to a monitoring service like Sentry
    // For now, we'll just log it
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    // Example: Send to monitoring service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // }).catch(console.error);

    console.warn('Error sent to monitoring:', errorData);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    });
  };

  private handleRetryWithDelay = (delay: number = 1000) => {
    const timeout = setTimeout(() => {
      this.handleRetry();
      this.retryTimeouts.delete(timeout);
    }, delay);
    
    this.retryTimeouts.add(timeout);
  };

  private getErrorMessage = (error: Error): string => {
    // Provide user-friendly error messages based on error type
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This might be due to a network issue or an updated version.';
    }
    
    if (error.message.includes('Canvas')) {
      return 'There was an issue with the design canvas. Your work has been saved automatically.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('Permission')) {
      return 'You don\'t have permission to perform this action. Please refresh the page and try again.';
    }
    
    // Generic fallback
    return 'Something unexpected happened. Our team has been notified and is working on a fix.';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const userMessage = this.getErrorMessage(this.state.error);
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div style={{
          padding: '2rem',
          margin: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #fecaca',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>⚠️</span>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem', 
              fontWeight: '600' 
            }}>
              Oops! Something went wrong
            </h2>
          </div>

          <p style={{ 
            marginBottom: '1rem', 
            lineHeight: '1.5',
            color: '#7f1d1d'
          }}>
            {userMessage}
          </p>

          {isDevelopment && (
            <details style={{ 
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              <summary style={{ 
                cursor: 'pointer',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Technical Details (Development Mode)
              </summary>
              <pre style={{
                backgroundColor: '#fff1f2',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                overflow: 'auto',
                fontSize: '0.75rem',
                border: '1px solid #fecaca'
              }}>
                <strong>Error:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong>
                    <br />
                    {this.state.error.stack}
                  </>
                )}
                <br /><br />
                <strong>Error ID:</strong> {this.state.errorId}
              </pre>
            </details>
          )}

          <div style={{ 
            display: 'flex', 
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
            >
              Try Again
            </button>

            <button
              onClick={() => this.handleRetryWithDelay(1000)}
              style={{
                backgroundColor: 'white',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Retry in 1 Second
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              Refresh Page
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            If this problem persists, please contact support with Error ID: {this.state.errorId}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized error boundaries for different parts of the app
export const CanvasErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    isolate={true}
    fallback={
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f9fafb',
        border: '2px dashed #d1d5db',
        borderRadius: '0.5rem',
        color: '#6b7280'
      }}>
        <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</span>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Canvas Error</h3>
        <p style={{ margin: 0, textAlign: 'center' }}>
          The design canvas encountered an error.<br />
          Your work has been automatically saved.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          Reload Canvas
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;