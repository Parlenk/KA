import React from 'react';

// Generic loading spinner
export const LoadingSpinner: React.FC<{
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}> = ({ size = 'medium', color = '#4f46e5', className = '' }) => {
  const sizeMap = {
    small: '1rem',
    medium: '1.5rem',
    large: '2rem'
  };

  return (
    <div 
      className={`loading-spinner ${className}`}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    >
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Skeleton loading component
export const SkeletonLoader: React.FC<{
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  className?: string;
  animate?: boolean;
}> = ({ 
  width = '100%', 
  height = '1rem', 
  variant = 'rectangular',
  className = '',
  animate = true
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return {
          height: '1rem',
          borderRadius: '0.25rem'
        };
      case 'circular':
        return {
          borderRadius: '50%',
          width: height,
          height: height
        };
      case 'rectangular':
      default:
        return {
          borderRadius: '0.375rem'
        };
    }
  };

  return (
    <>
      <div
        className={`skeleton-loader ${animate ? 'animate' : ''} ${className}`}
        style={{
          width,
          height,
          backgroundColor: '#f3f4f6',
          ...getVariantStyles()
        }}
      />
      <style jsx>{`
        .skeleton-loader.animate {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  );
};

// Template card skeleton
export const TemplateCardSkeleton: React.FC = () => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <SkeletonLoader height="180px" variant="rectangular" />
    <div style={{ padding: '1.5rem' }}>
      <SkeletonLoader height="1.125rem" style={{ marginBottom: '0.5rem' }} />
      <SkeletonLoader height="0.875rem" width="80%" style={{ marginBottom: '0.5rem' }} />
      <SkeletonLoader height="0.875rem" width="60%" style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLoader height="1.5rem" width="4rem" />
        <SkeletonLoader height="0.75rem" width="3rem" />
      </div>
    </div>
  </div>
);

// Project card skeleton
export const ProjectCardSkeleton: React.FC = () => (
  <div style={{
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <SkeletonLoader height="1.125rem" style={{ marginBottom: '0.5rem' }} />
    <SkeletonLoader height="0.875rem" width="60%" style={{ marginBottom: '0.25rem' }} />
    <SkeletonLoader height="0.875rem" width="70%" />
  </div>
);

// Canvas loading overlay
export const CanvasLoadingOverlay: React.FC<{
  message?: string;
  progress?: number;
}> = ({ message = 'Loading canvas...', progress }) => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)'
  }}>
    <div style={{
      textAlign: 'center',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <LoadingSpinner size="large" />
      <div style={{
        marginTop: '1rem',
        fontSize: '1rem',
        fontWeight: '500',
        color: '#374151'
      }}>
        {message}
      </div>
      {typeof progress === 'number' && (
        <div style={{
          marginTop: '0.75rem',
          width: '200px',
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: '#4f46e5',
              borderRadius: '2px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      )}
    </div>
  </div>
);

// AI operation loading
export const AILoadingIndicator: React.FC<{
  operation: string;
  onCancel?: () => void;
}> = ({ operation, onCancel }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '0.5rem',
    color: '#0369a1'
  }}>
    <LoadingSpinner size="small" color="#0369a1" />
    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500' }}>
      🤖 {operation}...
    </span>
    {onCancel && (
      <button
        onClick={onCancel}
        style={{
          backgroundColor: 'transparent',
          border: '1px solid #0ea5e9',
          borderRadius: '0.25rem',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          color: '#0369a1',
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
    )}
  </div>
);

// Full page loading
export const FullPageLoading: React.FC<{
  message?: string;
  subMessage?: string;
}> = ({ message = 'Loading...', subMessage }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{ textAlign: 'center' }}>
      <LoadingSpinner size="large" />
      <div style={{
        marginTop: '1.5rem',
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        {message}
      </div>
      {subMessage && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          {subMessage}
        </div>
      )}
    </div>
  </div>
);

// Inline loading state
export const InlineLoading: React.FC<{
  size?: 'small' | 'medium';
  text?: string;
}> = ({ size = 'small', text = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontSize: size === 'small' ? '0.875rem' : '1rem'
  }}>
    <LoadingSpinner size={size} color="#6b7280" />
    <span>{text}</span>
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ 
  loading, 
  children, 
  loadingText, 
  disabled, 
  onClick, 
  className = '', 
  style = {} 
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={className}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      opacity: loading || disabled ? 0.6 : 1,
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
      ...style
    }}
  >
    {loading && <LoadingSpinner size="small" color="currentColor" />}
    <span>{loading && loadingText ? loadingText : children}</span>
  </button>
);

// Grid loading skeleton
export const GridLoadingSkeleton: React.FC<{
  itemCount?: number;
  itemComponent: React.ComponentType;
  columns?: number;
}> = ({ itemCount = 8, itemComponent: ItemComponent, columns = 3 }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))`,
    gap: '1.5rem'
  }}>
    {Array.from({ length: itemCount }).map((_, index) => (
      <ItemComponent key={`skeleton-${index}`} />
    ))}
  </div>
);

export default {
  LoadingSpinner,
  SkeletonLoader,
  TemplateCardSkeleton,
  ProjectCardSkeleton,
  CanvasLoadingOverlay,
  AILoadingIndicator,
  FullPageLoading,
  InlineLoading,
  ButtonLoading,
  GridLoadingSkeleton
};