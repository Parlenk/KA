import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Heart, 
  Star, 
  ThumbsUp, 
  Bookmark, 
  Share2, 
  Copy, 
  Check,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Trash2
} from 'lucide-react';

// Animated Like Button
interface LikeButtonProps {
  initialLiked?: boolean;
  onToggle?: (liked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  showCount?: boolean;
  count?: number;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  initialLiked = false,
  onToggle,
  size = 'md',
  className = '',
  disabled = false,
  showCount = false,
  count = 0
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-8 h-8';
      default: return 'w-6 h-6';
    }
  };

  const handleClick = useCallback(() => {
    if (disabled || isAnimating) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setIsAnimating(true);
    onToggle?.(newLiked);

    // Create particle effect when liking
    if (newLiked) {
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20
      }));
      setParticles(newParticles);

      setTimeout(() => setParticles([]), 1000);
    }

    setTimeout(() => setIsAnimating(false), 300);
  }, [liked, disabled, isAnimating, onToggle]);

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${liked 
            ? 'text-red-500 bg-red-50 hover:bg-red-100' 
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          }
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${isAnimating ? 'scale-125' : 'hover:scale-110'}
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        `}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart 
          className={`${getSizeClasses()} transition-all duration-200 ${
            liked ? 'fill-current scale-110' : ''
          }`}
        />
        
        {/* Particle effects */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%)`
            }}
          >
            <Heart
              className="w-3 h-3 text-red-500 fill-current animate-ping"
              style={{
                animationDelay: `${Math.random() * 200}ms`,
                transform: `translate(${particle.x}px, ${particle.y}px)`
              }}
            />
          </div>
        ))}
      </button>

      {showCount && (
        <span className="text-sm text-gray-600 min-w-[2rem]">
          {(count + (liked ? 1 : 0)).toLocaleString()}
        </span>
      )}
    </div>
  );
};

// Animated Star Rating
interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
  showValue?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  readonly = false,
  onRatingChange,
  className = '',
  showValue = false
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-8 h-8';
      default: return 'w-6 h-6';
    }
  };

  const handleStarClick = useCallback((starRating: number) => {
    if (readonly) return;
    
    setIsAnimating(true);
    onRatingChange?.(starRating);
    
    setTimeout(() => setIsAnimating(false), 200);
  }, [readonly, onRatingChange]);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {Array.from({ length: maxRating }, (_, index) => {
          const starRating = index + 1;
          const isFilled = starRating <= (hoverRating || rating);
          const isPartial = starRating === Math.ceil(rating) && rating % 1 !== 0;

          return (
            <button
              key={index}
              onClick={() => handleStarClick(starRating)}
              onMouseEnter={() => !readonly && setHoverRating(starRating)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              disabled={readonly}
              className={`
                transition-all duration-200
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
                ${isAnimating && isFilled ? 'animate-bounce' : ''}
                focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 rounded
              `}
              aria-label={`Rate ${starRating} star${starRating > 1 ? 's' : ''}`}
            >
              <div className="relative">
                <Star 
                  className={`
                    ${getSizeClasses()}
                    ${isFilled 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300'
                    }
                    transition-colors duration-200
                  `}
                />
                {isPartial && (
                  <Star 
                    className={`
                      ${getSizeClasses()}
                      text-yellow-400 fill-current absolute inset-0
                    `}
                    style={{
                      clipPath: `inset(0 ${100 - (rating % 1) * 100}% 0 0)`
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className="text-sm text-gray-600 ml-2">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// Copy to Clipboard Button
interface CopyButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'both';
  onCopy?: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  children,
  className = '',
  size = 'md',
  variant = 'icon',
  onCopy
}) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [text, onCopy]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      onClick={handleCopy}
      className={`
        flex items-center gap-2 p-2 rounded-md transition-all duration-200
        ${copied 
          ? 'text-green-600 bg-green-50' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      <div className={`transition-transform duration-200 ${copied ? 'scale-110' : ''}`}>
        {copied ? (
          <Check className={`${getSizeClasses()} text-green-600`} />
        ) : (
          <Copy className={getSizeClasses()} />
        )}
      </div>
      
      {(variant === 'text' || variant === 'both') && (
        <span className="text-sm font-medium">
          {copied ? 'Copied!' : children || 'Copy'}
        </span>
      )}
    </button>
  );
};

// Toggle Switch with Animation
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'red';
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  size = 'md',
  color = 'blue',
  disabled = false,
  label,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return { track: 'w-8 h-4', thumb: 'w-3 h-3' };
      case 'lg': return { track: 'w-14 h-8', thumb: 'w-6 h-6' };
      default: return { track: 'w-11 h-6', thumb: 'w-5 h-5' };
    }
  };

  const getColorClasses = () => {
    if (!checked) return 'bg-gray-200';
    
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'purple': return 'bg-purple-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const { track, thumb } = getSizeClasses();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex items-center rounded-full transition-all duration-200
          ${track}
          ${getColorClasses()}
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200
            ${thumb}
            ${checked 
              ? size === 'sm' ? 'translate-x-4' : size === 'lg' ? 'translate-x-6' : 'translate-x-5'
              : 'translate-x-0.5'
            }
          `}
        />
      </button>
      
      {label && (
        <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </span>
      )}
    </div>
  );
};

// Floating Action Button
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'purple';
  tooltip?: string;
  className?: string;
  badge?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  position = 'bottom-right',
  size = 'md',
  color = 'blue',
  tooltip,
  className = '',
  badge
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left': return 'bottom-6 left-6';
      case 'top-right': return 'top-6 right-6';
      case 'top-left': return 'top-6 left-6';
      default: return 'bottom-6 right-6';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      default: return 'w-14 h-14';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'green': return 'bg-green-500 hover:bg-green-600';
      case 'red': return 'bg-red-500 hover:bg-red-600';
      case 'purple': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className="relative">
        <button
          onClick={onClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`
            ${getSizeClasses()}
            ${getColorClasses()}
            text-white rounded-full shadow-lg hover:shadow-xl
            flex items-center justify-center
            transform transition-all duration-200 hover:scale-110 active:scale-95
            focus:outline-none focus:ring-4 focus:ring-blue-300
            ${className}
          `}
          aria-label={tooltip || 'Floating action button'}
        >
          {icon}
          
          {/* Badge */}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {tooltip && showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-md whitespace-nowrap">
              {tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Animated Counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number>();
  const startValueRef = useRef(0);

  useEffect(() => {
    const startValue = displayValue;
    startValueRef.current = startValue;
    startTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValue + (value - startValue) * easeOutQuart;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default {
  LikeButton,
  StarRating,
  CopyButton,
  ToggleSwitch,
  FloatingActionButton,
  AnimatedCounter
};