import React, { useEffect, useState, useRef } from 'react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { CollaborationUser } from '../../services/collaborationService';
import { SecurityUtils } from '../../utils/security';

interface CollaborativeCursorsProps {
  designId: string;
  sessionId?: string;
  canvasRef: React.RefObject<HTMLElement>;
  currentUserId: string;
}

interface CursorAnimation {
  userId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
}

const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  designId,
  sessionId,
  canvasRef,
  currentUserId
}) => {
  const collaboration = useCollaboration({
    designId,
    sessionId,
    enablePresence: true
  });

  const [cursorAnimations, setCursorAnimations] = useState<Map<string, CursorAnimation>>(new Map());
  const animationFrameRef = useRef<number>();
  const lastMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Rate limiter for cursor updates (20 FPS)
  const cursorRateLimiter = useRef(SecurityUtils.createRateLimiter(20, 1000));

  // Handle mouse movement to update own cursor position
  useEffect(() => {
    if (!canvasRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      lastMousePosition.current = { x, y };

      // Throttle cursor updates
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }

      cursorUpdateTimeoutRef.current = setTimeout(() => {
        // Apply rate limiting
        if (cursorRateLimiter.current(currentUserId)) {
          collaboration.updateCursor({ x, y });
        }
      }, 50); // 20 FPS
    };

    const handleMouseLeave = () => {
      // Update cursor position to indicate user is not on canvas
      collaboration.updateCursor({ x: -1, y: -1 });
    };

    const element = canvasRef.current;
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }
    };
  }, [canvasRef, collaboration.updateCursor]);

  // Track cursor position changes and create smooth animations
  useEffect(() => {
    collaboration.userCursors.forEach((position, userId) => {
      if (userId === currentUserId) return; // Don't show own cursor

      const currentAnimation = cursorAnimations.get(userId);
      const currentTime = Date.now();

      // If there's an ongoing animation, use its current position as the start
      let fromX = position.x;
      let fromY = position.y;

      if (currentAnimation && currentTime < currentAnimation.startTime + currentAnimation.duration) {
        const progress = (currentTime - currentAnimation.startTime) / currentAnimation.duration;
        const easedProgress = easeOutCubic(Math.min(progress, 1));
        fromX = currentAnimation.fromX + (currentAnimation.toX - currentAnimation.fromX) * easedProgress;
        fromY = currentAnimation.fromY + (currentAnimation.toY - currentAnimation.fromY) * easedProgress;
      }

      // Create new animation
      const newAnimation: CursorAnimation = {
        userId,
        fromX,
        fromY,
        toX: position.x,
        toY: position.y,
        startTime: currentTime,
        duration: 200 // 200ms smooth transition
      };

      setCursorAnimations(prev => new Map(prev).set(userId, newAnimation));
    });
  }, [collaboration.userCursors, currentUserId, cursorAnimations]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const currentTime = Date.now();
      let hasActiveAnimations = false;

      setCursorAnimations(prev => {
        const updated = new Map(prev);
        
        updated.forEach((animation, userId) => {
          if (currentTime < animation.startTime + animation.duration) {
            hasActiveAnimations = true;
          } else {
            // Remove completed animations
            updated.delete(userId);
          }
        });

        return updated;
      });

      if (hasActiveAnimations) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (cursorAnimations.size > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cursorAnimations]);

  // Easing function for smooth cursor movement
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Get animated cursor position
  const getAnimatedPosition = (userId: string): { x: number; y: number } => {
    const animation = cursorAnimations.get(userId);
    const currentPosition = collaboration.userCursors.get(userId);

    if (!animation || !currentPosition) {
      return currentPosition || { x: 0, y: 0 };
    }

    const currentTime = Date.now();
    const progress = Math.min((currentTime - animation.startTime) / animation.duration, 1);
    const easedProgress = easeOutCubic(progress);

    return {
      x: animation.fromX + (animation.toX - animation.fromX) * easedProgress,
      y: animation.fromY + (animation.toY - animation.fromY) * easedProgress
    };
  };

  // Get user color for cursor
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1'  // Indigo
    ];
    
    // Generate consistent color based on user ID
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Cursor component
  const Cursor: React.FC<{
    user: CollaborationUser;
    position: { x: number; y: number };
    isVisible: boolean;
  }> = ({ user, position, isVisible }) => {
    const color = getUserColor(user.id);
    
    if (!isVisible || position.x < 0 || position.y < 0) {
      return null;
    }

    return (
      <div
        className="absolute pointer-events-none z-50 transition-opacity duration-200"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-2px, -2px)'
        }}
      >
        {/* Cursor SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="drop-shadow-lg"
        >
          <path
            d="M2 2L18 8L9 11L6 18L2 2Z"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>
        
        {/* User name label */}
        <div
          className="absolute top-6 left-2 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
          style={{ backgroundColor: color }}
        >
          {user.name}
        </div>
      </div>
    );
  };

  // Selection indicator component
  const SelectionIndicator: React.FC<{
    user: CollaborationUser;
    selectedIds: string[];
  }> = ({ user, selectedIds }) => {
    const color = getUserColor(user.id);
    
    // This would integrate with your canvas library to show selection bounds
    // For now, we'll just show a simple indicator
    if (selectedIds.length === 0) return null;

    return (
      <div
        className="absolute pointer-events-none z-40"
        style={{
          border: `2px dashed ${color}`,
          borderRadius: '4px',
          // Position would be calculated based on selected elements
          left: '100px',
          top: '100px',
          width: '100px',
          height: '100px'
        }}
      >
        <div
          className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
          style={{ backgroundColor: color }}
        >
          {user.name} is editing
        </div>
      </div>
    );
  };

  // Collaboration awareness indicator
  const CollaborationIndicator: React.FC = () => {
    const activeUsers = collaboration.participants.filter(
      user => user.id !== currentUserId && user.status === 'online'
    );

    if (activeUsers.length === 0) return null;

    return (
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg border p-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-900">
              {activeUsers.length} user{activeUsers.length !== 1 ? 's' : ''} online
            </span>
          </div>
          
          <div className="space-y-1">
            {activeUsers.slice(0, 3).map(user => (
              <div key={user.id} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getUserColor(user.id) }}
                />
                <span className="text-xs text-gray-600">{user.name}</span>
              </div>
            ))}
            
            {activeUsers.length > 3 && (
              <div className="text-xs text-gray-500">
                +{activeUsers.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!collaboration.isConnected) {
    return null;
  }

  return (
    <>
      {/* Render cursors for other users */}
      {Array.from(collaboration.userCursors.entries()).map(([userId, position]) => {
        if (userId === currentUserId) return null;

        const user = collaboration.getUserById(userId);
        if (!user || user.status !== 'online') return null;

        const animatedPosition = getAnimatedPosition(userId);
        const isVisible = position.x >= 0 && position.y >= 0;

        return (
          <Cursor
            key={userId}
            user={user}
            position={animatedPosition}
            isVisible={isVisible}
          />
        );
      })}

      {/* Render selection indicators */}
      {Array.from(collaboration.userSelections.entries()).map(([userId, selectedIds]) => {
        if (userId === currentUserId) return null;

        const user = collaboration.getUserById(userId);
        if (!user || user.status !== 'online') return null;

        return (
          <SelectionIndicator
            key={`selection-${userId}`}
            user={user}
            selectedIds={selectedIds}
          />
        );
      })}

      {/* Collaboration awareness indicator */}
      <CollaborationIndicator />
    </>
  );
};

export default CollaborativeCursors;