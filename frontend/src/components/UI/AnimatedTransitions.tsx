import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// Fade In/Out Transition Component
interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  show,
  children,
  duration = 300,
  className = '',
  onEnter,
  onExit
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setTimeout(() => {
        setIsVisible(true);
        onEnter?.();
      }, 10);
    } else {
      setIsVisible(false);
      onExit?.();
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [show, duration, onEnter, onExit]);

  if (!shouldRender) return null;

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
};

// Slide Transition Component
interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
  distance?: string;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  show,
  children,
  direction = 'down',
  duration = 300,
  className = '',
  distance = '20px'
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return `translateY(${distance})`;
        case 'down':
          return `translateY(-${distance})`;
        case 'left':
          return `translateX(${distance})`;
        case 'right':
          return `translateX(-${distance})`;
        default:
          return `translateY(-${distance})`;
      }
    }
    return 'translate(0, 0)';
  };

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        transform: getTransform(),
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  );
};

// Scale Transition Component
interface ScaleTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
  initialScale?: number;
}

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  show,
  children,
  duration = 200,
  className = '',
  initialScale = 0.95
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        transform: `scale(${isVisible ? 1 : initialScale})`,
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      {children}
    </div>
  );
};

// Collapsible/Accordion Component
interface CollapsibleProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  duration?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
  titleClassName = '',
  contentClassName = '',
  duration = 300,
  icon,
  disabled = false,
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    if (disabled) return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onToggle?.(newIsOpen);

    if (contentRef.current) {
      if (newIsOpen) {
        setHeight(contentRef.current.scrollHeight);
        setTimeout(() => setHeight('auto'), duration);
      } else {
        setHeight(contentRef.current.scrollHeight);
        setTimeout(() => setHeight(0), 10);
      }
    }
  }, [isOpen, disabled, duration, onToggle]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={toggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between p-4 text-left
          bg-gray-50 hover:bg-gray-100 transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${titleClassName}
        `}
        aria-expanded={isOpen}
        aria-controls="collapsible-content"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <ChevronDown
          className={`transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          size={20}
        />
      </button>
      
      <div
        ref={contentRef}
        id="collapsible-content"
        className={`overflow-hidden transition-all ${contentClassName}`}
        style={{
          height: height,
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component with Animation
interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  animated?: boolean;
  striped?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  barClassName = '',
  showLabel = false,
  animated = true,
  striped = false,
  color = 'blue',
  size = 'md'
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min((displayValue / max) * 100, 100);

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      case 'purple':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'lg':
        return 'h-6';
      default:
        return 'h-4';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`bg-gray-200 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`
            ${getColorClasses()}
            ${getSizeClasses()}
            transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
            ${striped ? 'bg-gradient-to-r from-transparent via-white to-transparent bg-size-200 animate-shimmer' : ''}
            ${barClassName}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Skeleton Loader Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = false,
  animated = true
}) => {
  return (
    <div
      className={`
        bg-gray-200
        ${rounded ? 'rounded-full' : 'rounded'}
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{ width, height }}
    />
  );
};

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = '',
  text
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'gray':
        return 'text-gray-500';
      case 'white':
        return 'text-white';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin ${getSizeClasses()} ${getColorClasses()}`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

// Stagger Children Animation Component
interface StaggerChildrenProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerChildren: React.FC<StaggerChildrenProps> = ({
  children,
  staggerDelay = 100,
  className = ''
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setShouldAnimate(true), 50);
  }, []);

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={`transition-all duration-500 ${
            shouldAnimate
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{
            transitionDelay: `${index * staggerDelay}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Hover Card Component
interface HoverCardProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const HoverCard: React.FC<HoverCardProps> = ({
  trigger,
  content,
  delay = 300,
  className = '',
  placement = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showCard = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideCard = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const getPlacementClasses = () => {
    switch (placement) {
      case 'bottom':
        return 'top-full mt-2';
      case 'left':
        return 'right-full mr-2';
      case 'right':
        return 'left-full ml-2';
      default:
        return 'bottom-full mb-2';
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showCard}
      onMouseLeave={hideCard}
    >
      {trigger}
      <FadeTransition show={isVisible}>
        <div
          className={`
            absolute z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-md
            shadow-lg max-w-xs whitespace-nowrap
            ${getPlacementClasses()}
            ${className}
          `}
        >
          {content}
        </div>
      </FadeTransition>
    </div>
  );
};

export default {
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  Collapsible,
  ProgressBar,
  Skeleton,
  LoadingSpinner,
  StaggerChildren,
  HoverCard
};