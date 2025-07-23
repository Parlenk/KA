/**
 * Lazy Loading and Code Splitting Utilities
 * Optimizes bundle size and loading performance
 */

import React, { Suspense, ComponentType, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Loading fallback components
export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-gray-600 text-sm">{message}</p>
  </div>
);

export const LoadingSkeleton: React.FC<{ height?: string; className?: string }> = ({ 
  height = 'h-48', 
  className = '' 
}) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${height} ${className}`}>
    <div className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"></div>
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4 max-w-md">
      {error.message || 'An unexpected error occurred while loading this component.'}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

/**
 * Higher-order component for lazy loading with error boundaries and loading states
 */
export function withLazyLoading<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ComponentType = LoadingSpinner,
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
) {
  const LazyComponent = lazy(importFunc);
  
  return React.forwardRef<any, React.ComponentPropsWithRef<T>>((props, ref) => (
    <ErrorBoundary FallbackComponent={errorFallback || ErrorFallback}>
      <Suspense fallback={<fallback />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </ErrorBoundary>
  ));
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFunc: () => Promise<{ default: ComponentType<any> }>) {
  return importFunc();
}

/**
 * Lazy load routes with route-based code splitting
 */
export const LazyRoutes = {
  // Authentication pages
  Login: withLazyLoading(
    () => import('../pages/auth/LoginPage'),
    () => <LoadingScreen message="Loading login..." />
  ),
  
  Register: withLazyLoading(
    () => import('../pages/auth/RegisterPage'),
    () => <LoadingScreen message="Loading registration..." />
  ),
  
  // Main application pages
  Dashboard: withLazyLoading(
    () => import('../pages/DashboardPage'),
    () => <LoadingScreen message="Loading dashboard..." />
  ),
  
  Projects: withLazyLoading(
    () => import('../pages/ProjectsPage'),
    () => <LoadingScreen message="Loading projects..." />
  ),
  
  // Editor components (heaviest components)
  CanvasEditor: withLazyLoading(
    () => import('../components/editor/CanvasEditor'),
    () => <LoadingScreen message="Loading canvas editor..." />
  ),
  
  TimelineEditor: withLazyLoading(
    () => import('../components/editor/TimelineEditor'),
    () => <LoadingScreen message="Loading animation timeline..." />
  ),
  
  // AI features
  AIImageGenerator: withLazyLoading(
    () => import('../components/ai/ImageGenerator'),
    () => <LoadingScreen message="Loading AI image generator..." />
  ),
  
  AITextGenerator: withLazyLoading(
    () => import('../components/ai/TextGenerator'),
    () => <LoadingScreen message="Loading AI text generator..." />
  ),
  
  BackgroundRemover: withLazyLoading(
    () => import('../components/ai/BackgroundRemover'),
    () => <LoadingScreen message="Loading background remover..." />
  ),
  
  // Template components
  TemplateGallery: withLazyLoading(
    () => import('../components/templates/TemplateGallery'),
    () => <LoadingSkeleton height="h-96" className="rounded-lg" />
  ),
  
  // Brand kit components
  BrandKitManager: withLazyLoading(
    () => import('../components/brand/BrandKitManager'),
    () => <LoadingScreen message="Loading brand kit..." />
  ),
  
  ColorPalette: withLazyLoading(
    () => import('../components/brand/ColorPalette'),
    LoadingSkeleton
  ),
  
  FontManager: withLazyLoading(
    () => import('../components/brand/FontManager'),
    LoadingSkeleton
  ),
  
  // Export components
  ExportDialog: withLazyLoading(
    () => import('../components/export/ExportDialog'),
    () => <LoadingScreen message="Loading export options..." />
  ),
  
  // Settings and preferences
  SettingsPage: withLazyLoading(
    () => import('../pages/SettingsPage'),
    () => <LoadingScreen message="Loading settings..." />
  ),
  
  // Help and documentation
  HelpCenter: withLazyLoading(
    () => import('../pages/HelpCenter'),
    () => <LoadingScreen message="Loading help center..." />
  )
};

/**
 * Preload critical components based on user interaction
 */
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  
  /**
   * Preload components likely to be used next
   */
  public preloadOnUserAction(action: string): void {
    switch (action) {
      case 'hover_new_project':
        this.preloadIfNotLoaded('CanvasEditor', () => import('../components/editor/CanvasEditor'));
        this.preloadIfNotLoaded('TemplateGallery', () => import('../components/templates/TemplateGallery'));
        break;
        
      case 'click_ai_features':
        this.preloadIfNotLoaded('AIImageGenerator', () => import('../components/ai/ImageGenerator'));
        this.preloadIfNotLoaded('AITextGenerator', () => import('../components/ai/TextGenerator'));
        break;
        
      case 'open_editor':
        this.preloadIfNotLoaded('TimelineEditor', () => import('../components/editor/TimelineEditor'));
        this.preloadIfNotLoaded('ExportDialog', () => import('../components/export/ExportDialog'));
        break;
        
      case 'hover_brand_kit':
        this.preloadIfNotLoaded('BrandKitManager', () => import('../components/brand/BrandKitManager'));
        this.preloadIfNotLoaded('ColorPalette', () => import('../components/brand/ColorPalette'));
        break;
    }
  }
  
  private preloadIfNotLoaded(componentName: string, importFunc: () => Promise<any>): void {
    if (!this.preloadedComponents.has(componentName)) {
      this.preloadedComponents.add(componentName);
      importFunc().catch(error => {
        console.warn(`Failed to preload ${componentName}:`, error);
        this.preloadedComponents.delete(componentName);
      });
    }
  }
  
  /**
   * Preload components based on route
   */
  public preloadForRoute(route: string): void {
    switch (route) {
      case '/dashboard':
        this.preloadIfNotLoaded('Projects', () => import('../pages/ProjectsPage'));
        break;
        
      case '/projects':
        this.preloadIfNotLoaded('CanvasEditor', () => import('../components/editor/CanvasEditor'));
        break;
        
      case '/editor':
        this.preloadIfNotLoaded('TimelineEditor', () => import('../components/editor/TimelineEditor'));
        this.preloadIfNotLoaded('ExportDialog', () => import('../components/export/ExportDialog'));
        this.preloadIfNotLoaded('AIImageGenerator', () => import('../components/ai/ImageGenerator'));
        break;
    }
  }
}

/**
 * Hook for tracking component loading performance
 */
export function useComponentLoadingMetrics() {
  const [loadingMetrics, setLoadingMetrics] = React.useState<{
    [componentName: string]: {
      loadTime: number;
      loaded: boolean;
      error?: string;
    }
  }>({});
  
  const trackComponentLoad = React.useCallback((
    componentName: string,
    startTime: number,
    endTime: number,
    error?: Error
  ) => {
    setLoadingMetrics(prev => ({
      ...prev,
      [componentName]: {
        loadTime: endTime - startTime,
        loaded: !error,
        error: error?.message
      }
    }));
  }, []);
  
  return { loadingMetrics, trackComponentLoad };
}

/**
 * Performance-optimized image lazy loading
 */
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}> = ({ src, alt, className = '', placeholder, onLoad, onError }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  // Intersection Observer for lazy loading
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    onError?.();
  };
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`}>
          {placeholder && (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-sm">{placeholder}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
};

// Global preloader instance
export const componentPreloader = new ComponentPreloader();