import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sanitizeHtml } from '../../utils/security';

interface AriaLiveRegionProps {
  level?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
  id?: string;
}

interface AnnouncementMessage {
  id: string;
  message: string;
  level: 'polite' | 'assertive';
  timestamp: number;
  duration?: number;
}

const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  level = 'polite',
  atomic = true,
  relevant = 'additions text',
  className = '',
  id = 'main-live-region'
}) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [messageQueue, setMessageQueue] = useState<AnnouncementMessage[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const messageIdCounter = useRef(0);

  // Queue and process announcements
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    duration: number = 3000
  ) => {
    if (!message.trim()) return;

    // Sanitize message for security
    const sanitizedMessage = sanitizeHtml(message, 'TEXT');
    
    const announcement: AnnouncementMessage = {
      id: `announcement-${messageIdCounter.current++}`,
      message: sanitizedMessage,
      level: priority,
      timestamp: Date.now(),
      duration
    };

    setMessageQueue(prev => {
      // For assertive messages, clear the queue and prioritize
      if (priority === 'assertive') {
        return [announcement];
      }
      
      // For polite messages, add to queue
      return [...prev, announcement];
    });
  }, []);

  // Process message queue
  useEffect(() => {
    if (messageQueue.length === 0) return;

    const nextMessage = messageQueue[0];
    
    // Set the message in the live region
    setCurrentMessage(nextMessage.message);
    
    // Update the live region's aria-live attribute based on message priority
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', nextMessage.level);
    }

    // Clear the timeout if one exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to clear message and process next in queue
    timeoutRef.current = setTimeout(() => {
      setCurrentMessage('');
      setMessageQueue(prev => prev.slice(1));
    }, nextMessage.duration || 3000);

  }, [messageQueue]);

  // Global announcement function
  useEffect(() => {
    // Attach announce function to window for global access
    (window as any).announceToScreenReader = announce;
    
    // Custom event listener for announcements
    const handleAnnouncement = (event: CustomEvent) => {
      const { message, priority, duration } = event.detail;
      announce(message, priority, duration);
    };

    window.addEventListener('aria-announce', handleAnnouncement as EventListener);

    return () => {
      window.removeEventListener('aria-announce', handleAnnouncement as EventListener);
      delete (window as any).announceToScreenReader;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [announce]);

  // Status updates for common UI actions
  const announceStatusUpdate = useCallback((
    action: string,
    target: string,
    result: 'success' | 'error' | 'info' = 'info',
    details?: string
  ) => {
    const statusMessages = {
      success: `Success: ${action} ${target}${details ? '. ' + details : ''}`,
      error: `Error: Failed to ${action} ${target}${details ? '. ' + details : ''}`,
      info: `${action} ${target}${details ? '. ' + details : ''}`
    };

    const priority = result === 'error' ? 'assertive' : 'polite';
    announce(statusMessages[result], priority);
  }, [announce]);

  // Form validation announcements
  const announceFormValidation = useCallback((
    fieldName: string,
    isValid: boolean,
    errorMessage?: string
  ) => {
    if (isValid) {
      announce(`${fieldName} is valid`, 'polite');
    } else {
      announce(`${fieldName} error: ${errorMessage || 'Invalid input'}`, 'assertive');
    }
  }, [announce]);

  // Progress announcements
  const announceProgress = useCallback((
    operation: string,
    progress: number,
    total?: number
  ) => {
    let message = '';
    
    if (total) {
      const percentage = Math.round((progress / total) * 100);
      message = `${operation}: ${percentage}% complete (${progress} of ${total})`;
    } else {
      message = `${operation}: ${progress}% complete`;
    }

    announce(message, 'polite', 1500);
  }, [announce]);

  // Navigation announcements
  const announceNavigation = useCallback((
    from: string,
    to: string,
    context?: string
  ) => {
    const message = `Navigated from ${from} to ${to}${context ? ' in ' + context : ''}`;
    announce(message, 'polite');
  }, [announce]);

  // Content change announcements
  const announceContentChange = useCallback((
    changeType: 'added' | 'removed' | 'updated',
    content: string,
    count?: number
  ) => {
    let message = '';
    
    switch (changeType) {
      case 'added':
        message = count ? `${count} ${content} added` : `${content} added`;
        break;
      case 'removed':
        message = count ? `${count} ${content} removed` : `${content} removed`;
        break;
      case 'updated':
        message = count ? `${count} ${content} updated` : `${content} updated`;
        break;
    }

    announce(message, 'polite');
  }, [announce]);

  // Expose announcement functions via ref
  React.useImperativeHandle(React.forwardRef((props, ref) => ref), () => ({
    announce,
    announceStatusUpdate,
    announceFormValidation,
    announceProgress,
    announceNavigation,
    announceContentChange,
    clearQueue: () => {
      setMessageQueue([]);
      setCurrentMessage('');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }), [announce, announceStatusUpdate, announceFormValidation, announceProgress, announceNavigation, announceContentChange]);

  return (
    <div className="sr-only">
      {/* Main live region */}
      <div
        ref={liveRegionRef}
        id={id}
        aria-live={level}
        aria-atomic={atomic}
        aria-relevant={relevant}
        className={`live-region ${className}`}
        role="status"
      >
        {currentMessage}
      </div>

      {/* Secondary live region for assertive announcements */}
      <div
        id={`${id}-assertive`}
        aria-live="assertive"
        aria-atomic="true"
        className="live-region-assertive"
        role="alert"
      />

      {/* Status region for form validation */}
      <div
        id={`${id}-status`}
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        className="live-region-status"
        role="status"
      />

      {/* Progress region */}
      <div
        id={`${id}-progress`}
        aria-live="polite"
        aria-atomic="true"
        className="live-region-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};

// Higher-order component to add live region announcements
export interface WithAriaLiveProps {
  announceToScreenReader: (
    message: string,
    priority?: 'polite' | 'assertive',
    duration?: number
  ) => void;
  announceStatusUpdate: (
    action: string,
    target: string,
    result?: 'success' | 'error' | 'info',
    details?: string
  ) => void;
  announceFormValidation: (
    fieldName: string,
    isValid: boolean,
    errorMessage?: string
  ) => void;
  announceProgress: (
    operation: string,
    progress: number,
    total?: number
  ) => void;
  announceNavigation: (
    from: string,
    to: string,
    context?: string
  ) => void;
  announceContentChange: (
    changeType: 'added' | 'removed' | 'updated',
    content: string,
    count?: number
  ) => void;
}

export function withAriaLive<P extends WithAriaLiveProps>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: Omit<P, keyof WithAriaLiveProps>) => {
    const announce = useCallback((
      message: string,
      priority: 'polite' | 'assertive' = 'polite',
      duration: number = 3000
    ) => {
      // Use global function if available
      if ((window as any).announceToScreenReader) {
        (window as any).announceToScreenReader(message, priority, duration);
      } else {
        // Fallback: dispatch custom event
        window.dispatchEvent(new CustomEvent('aria-announce', {
          detail: { message, priority, duration }
        }));
      }
    }, []);

    const announceStatusUpdate = useCallback((
      action: string,
      target: string,
      result: 'success' | 'error' | 'info' = 'info',
      details?: string
    ) => {
      const statusMessages = {
        success: `Success: ${action} ${target}${details ? '. ' + details : ''}`,
        error: `Error: Failed to ${action} ${target}${details ? '. ' + details : ''}`,
        info: `${action} ${target}${details ? '. ' + details : ''}`
      };

      const priority = result === 'error' ? 'assertive' : 'polite';
      announce(statusMessages[result], priority);
    }, [announce]);

    const announceFormValidation = useCallback((
      fieldName: string,
      isValid: boolean,
      errorMessage?: string
    ) => {
      if (isValid) {
        announce(`${fieldName} is valid`, 'polite');
      } else {
        announce(`${fieldName} error: ${errorMessage || 'Invalid input'}`, 'assertive');
      }
    }, [announce]);

    const announceProgress = useCallback((
      operation: string,
      progress: number,
      total?: number
    ) => {
      let message = '';
      
      if (total) {
        const percentage = Math.round((progress / total) * 100);
        message = `${operation}: ${percentage}% complete (${progress} of ${total})`;
      } else {
        message = `${operation}: ${progress}% complete`;
      }

      announce(message, 'polite', 1500);
    }, [announce]);

    const announceNavigation = useCallback((
      from: string,
      to: string,
      context?: string
    ) => {
      const message = `Navigated from ${from} to ${to}${context ? ' in ' + context : ''}`;
      announce(message, 'polite');
    }, [announce]);

    const announceContentChange = useCallback((
      changeType: 'added' | 'removed' | 'updated',
      content: string,
      count?: number
    ) => {
      let message = '';
      
      switch (changeType) {
        case 'added':
          message = count ? `${count} ${content} added` : `${content} added`;
          break;
        case 'removed':
          message = count ? `${count} ${content} removed` : `${content} removed`;
          break;
        case 'updated':
          message = count ? `${count} ${content} updated` : `${content} updated`;
          break;
      }

      announce(message, 'polite');
    }, [announce]);

    const ariaLiveProps: WithAriaLiveProps = {
      announceToScreenReader: announce,
      announceStatusUpdate,
      announceFormValidation,
      announceProgress,
      announceNavigation,
      announceContentChange
    };

    return <Component {...(props as P)} {...ariaLiveProps} />;
  };

  WrappedComponent.displayName = `withAriaLive(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Utility hook for announcements
export const useAriaLive = () => {
  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
    duration: number = 3000
  ) => {
    if ((window as any).announceToScreenReader) {
      (window as any).announceToScreenReader(message, priority, duration);
    } else {
      window.dispatchEvent(new CustomEvent('aria-announce', {
        detail: { message, priority, duration }
      }));
    }
  }, []);

  return { announce };
};

export default AriaLiveRegion;