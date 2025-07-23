import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationService, CollaborationUser, CollaborationSession, DesignOperation, CollaborationComment, ChatMessage, VersionSnapshot, ConflictResolution } from '../services/collaborationService';

interface UseCollaborationOptions {
  designId: string;
  sessionId?: string;
  autoConnect?: boolean;
  enablePresence?: boolean;
  enableComments?: boolean;
  enableChat?: boolean;
  enableVersionHistory?: boolean;
}

interface CollaborationState {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  error: string | null;
  
  // Session
  session: CollaborationSession | null;
  participants: CollaborationUser[];
  currentUser: CollaborationUser | null;
  
  // Operations
  pendingOperations: DesignOperation[];
  operationHistory: DesignOperation[];
  conflicts: ConflictResolution[];
  
  // Comments and Chat
  comments: CollaborationComment[];
  chatMessages: ChatMessage[];
  unreadMessages: number;
  
  // Version Control
  versions: VersionSnapshot[];
  currentVersion: number;
  
  // UI State
  showChat: boolean;
  showComments: boolean;
  showVersionHistory: boolean;
  showParticipants: boolean;
  selectedComment: string | null;
  
  // Element locking
  lockedElements: Map<string, string>; // elementId -> userId
  
  // Presence
  userCursors: Map<string, { x: number; y: number; element_id?: string }>; // userId -> cursor position
  userSelections: Map<string, string[]>; // userId -> selected element ids
}

export const useCollaboration = (options: UseCollaborationOptions) => {
  const {
    designId,
    sessionId,
    autoConnect = true,
    enablePresence = true,
    enableComments = true,
    enableChat = true,
    enableVersionHistory = true
  } = options;

  const [state, setState] = useState<CollaborationState>({
    // Connection
    isConnected: false,
    isConnecting: false,
    connectionQuality: 'disconnected',
    error: null,
    
    // Session
    session: null,
    participants: [],
    currentUser: null,
    
    // Operations
    pendingOperations: [],
    operationHistory: [],
    conflicts: [],
    
    // Comments and Chat
    comments: [],
    chatMessages: [],
    unreadMessages: 0,
    
    // Version Control
    versions: [],
    currentVersion: 1,
    
    // UI State
    showChat: false,
    showComments: false,
    showVersionHistory: false,
    showParticipants: false,
    selectedComment: null,
    
    // Element locking
    lockedElements: new Map(),
    
    // Presence
    userCursors: new Map(),
    userSelections: new Map()
  });

  // Refs for event handling
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<CollaborationState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  // Connection management
  const connect = useCallback(async (targetSessionId?: string) => {
    if (state.isConnecting || state.isConnected) return;

    try {
      updateState({ isConnecting: true, error: null });

      const userToken = localStorage.getItem('accessToken');
      if (!userToken) {
        throw new Error('User not authenticated');
      }

      let sessionToJoin = targetSessionId || sessionId;
      
      // Create session if none provided
      if (!sessionToJoin) {
        const newSession = await collaborationService.createSession(designId);
        sessionToJoin = newSession.id;
      }

      const session = await collaborationService.connect(sessionToJoin, userToken);
      
      updateState({
        isConnecting: false,
        isConnected: true,
        session,
        participants: session.participants,
        currentUser: session.participants.find(p => p.id === getCurrentUserId()) || null
      });

      // Load initial data
      await loadInitialData();

    } catch (error) {
      console.error('Failed to connect to collaboration session:', error);
      updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  }, [designId, sessionId, state.isConnecting, state.isConnected]);

  const disconnect = useCallback(() => {
    collaborationService.disconnect();
    updateState({
      isConnected: false,
      isConnecting: false,
      session: null,
      participants: [],
      currentUser: null,
      connectionQuality: 'disconnected'
    });
  }, []);

  // Load initial collaboration data
  const loadInitialData = useCallback(async () => {
    try {
      const promises = [];

      if (enableComments) {
        promises.push(collaborationService.getComments(designId));
      }

      if (enableChat && state.session) {
        promises.push(collaborationService.getChatHistory(state.session.id));
      }

      if (enableVersionHistory) {
        promises.push(collaborationService.getVersionHistory(designId));
      }

      const results = await Promise.allSettled(promises);
      
      let comments: CollaborationComment[] = [];
      let chatMessages: ChatMessage[] = [];
      let versions: VersionSnapshot[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (index === 0 && enableComments) comments = result.value;
          if (index === 1 && enableChat) chatMessages = result.value;
          if (index === 2 && enableVersionHistory) versions = result.value;
        }
      });

      updateState({ comments, chatMessages, versions });

    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    }
  }, [designId, enableComments, enableChat, enableVersionHistory, state.session]);

  // Event handlers setup
  useEffect(() => {
    if (!state.isConnected) return;

    // User presence events
    const handleUserJoined = (user: CollaborationUser) => {
      updateState({
        participants: [...state.participants, user]
      });
    };

    const handleUserLeft = (userId: string) => {
      updateState({
        participants: state.participants.filter(p => p.id !== userId)
      });
      
      // Clean up user presence data
      const newCursors = new Map(state.userCursors);
      const newSelections = new Map(state.userSelections);
      newCursors.delete(userId);
      newSelections.delete(userId);
      
      updateState({
        userCursors: newCursors,
        userSelections: newSelections
      });
    };

    const handleCursorMoved = (userId: string, position: { x: number; y: number; element_id?: string }) => {
      if (!enablePresence) return;
      
      const newCursors = new Map(state.userCursors);
      newCursors.set(userId, position);
      updateState({ userCursors: newCursors });
    };

    const handleSelectionChanged = (userId: string, selectedIds: string[]) => {
      if (!enablePresence) return;
      
      const newSelections = new Map(state.userSelections);
      newSelections.set(userId, selectedIds);
      updateState({ userSelections: newSelections });
    };

    const handleStatusChanged = (userId: string, status: string) => {
      updateState({
        participants: state.participants.map(p => 
          p.id === userId ? { ...p, status: status as CollaborationUser['status'] } : p
        )
      });
    };

    // Design operation events
    const handleOperationApplied = (operation: DesignOperation) => {
      updateState({
        operationHistory: [...state.operationHistory, operation],
        pendingOperations: state.pendingOperations.filter(op => op.element_id !== operation.element_id)
      });
    };

    const handleOperationReverted = (operationId: string) => {
      updateState({
        operationHistory: state.operationHistory.filter(op => op.id !== operationId)
      });
    };

    const handleDesignLocked = (elementId: string, userId: string) => {
      const newLockedElements = new Map(state.lockedElements);
      newLockedElements.set(elementId, userId);
      updateState({ lockedElements: newLockedElements });
    };

    const handleDesignUnlocked = (elementId: string, userId: string) => {
      const newLockedElements = new Map(state.lockedElements);
      newLockedElements.delete(elementId);
      updateState({ lockedElements: newLockedElements });
    };

    // Comment events
    const handleCommentAdded = (comment: CollaborationComment) => {
      if (!enableComments) return;
      updateState({
        comments: [...state.comments, comment]
      });
    };

    const handleCommentUpdated = (comment: CollaborationComment) => {
      if (!enableComments) return;
      updateState({
        comments: state.comments.map(c => c.id === comment.id ? comment : c)
      });
    };

    const handleCommentDeleted = (commentId: string) => {
      if (!enableComments) return;
      updateState({
        comments: state.comments.filter(c => c.id !== commentId)
      });
    };

    const handleCommentResolved = (commentId: string, resolved: boolean) => {
      if (!enableComments) return;
      updateState({
        comments: state.comments.map(c => 
          c.id === commentId ? { ...c, resolved } : c
        )
      });
    };

    // Chat events
    const handleChatMessage = (message: ChatMessage) => {
      if (!enableChat) return;
      
      const isOwnMessage = message.user_id === getCurrentUserId();
      
      updateState({
        chatMessages: [...state.chatMessages, message],
        unreadMessages: isOwnMessage ? state.unreadMessages : state.unreadMessages + 1
      });
    };

    // Version control events
    const handleVersionCreated = (version: VersionSnapshot) => {
      if (!enableVersionHistory) return;
      updateState({
        versions: [version, ...state.versions],
        currentVersion: version.version
      });
    };

    const handleVersionRestored = (version: VersionSnapshot) => {
      if (!enableVersionHistory) return;
      updateState({
        currentVersion: version.version
      });
    };

    // Conflict resolution events
    const handleConflictDetected = (conflict: ConflictResolution) => {
      updateState({
        conflicts: [...state.conflicts, conflict]
      });
    };

    const handleConflictResolved = (conflict: ConflictResolution) => {
      updateState({
        conflicts: state.conflicts.filter(c => c.id !== conflict.id)
      });
    };

    // Session events
    const handleSessionUpdated = (sessionUpdate: Partial<CollaborationSession>) => {
      updateState({
        session: { ...state.session!, ...sessionUpdate }
      });
    };

    const handleSessionEnded = () => {
      disconnect();
    };

    const handlePermissionChanged = (userId: string, permissions: CollaborationUser['permissions']) => {
      updateState({
        participants: state.participants.map(p => 
          p.id === userId ? { ...p, permissions } : p
        )
      });
    };

    // Error and connection events
    const handleCollaborationError = (error: { code: string; message: string; details?: any }) => {
      updateState({ error: error.message });
    };

    const handleReconnectionSuccessful = () => {
      updateState({ 
        error: null,
        connectionQuality: collaborationService.getConnectionQuality()
      });
    };

    const handleConnectionQualityChanged = (quality: 'excellent' | 'good' | 'poor' | 'disconnected') => {
      updateState({ connectionQuality: quality });
    };

    // Register event listeners
    collaborationService.on('user_joined', handleUserJoined);
    collaborationService.on('user_left', handleUserLeft);
    collaborationService.on('user_cursor_moved', handleCursorMoved);
    collaborationService.on('user_selection_changed', handleSelectionChanged);
    collaborationService.on('user_status_changed', handleStatusChanged);
    collaborationService.on('operation_applied', handleOperationApplied);
    collaborationService.on('operation_reverted', handleOperationReverted);
    collaborationService.on('design_locked', handleDesignLocked);
    collaborationService.on('design_unlocked', handleDesignUnlocked);
    collaborationService.on('comment_added', handleCommentAdded);
    collaborationService.on('comment_updated', handleCommentUpdated);
    collaborationService.on('comment_deleted', handleCommentDeleted);
    collaborationService.on('comment_resolved', handleCommentResolved);
    collaborationService.on('chat_message', handleChatMessage);
    collaborationService.on('version_created', handleVersionCreated);
    collaborationService.on('version_restored', handleVersionRestored);
    collaborationService.on('conflict_detected', handleConflictDetected);
    collaborationService.on('conflict_resolved', handleConflictResolved);
    collaborationService.on('session_updated', handleSessionUpdated);
    collaborationService.on('session_ended', handleSessionEnded);
    collaborationService.on('permission_changed', handlePermissionChanged);
    collaborationService.on('collaboration_error', handleCollaborationError);
    collaborationService.on('reconnection_successful', handleReconnectionSuccessful);
    collaborationService.on('connection_quality_changed', handleConnectionQualityChanged);

    // Cleanup function
    return () => {
      collaborationService.off('user_joined', handleUserJoined);
      collaborationService.off('user_left', handleUserLeft);
      collaborationService.off('user_cursor_moved', handleCursorMoved);
      collaborationService.off('user_selection_changed', handleSelectionChanged);
      collaborationService.off('user_status_changed', handleStatusChanged);
      collaborationService.off('operation_applied', handleOperationApplied);
      collaborationService.off('operation_reverted', handleOperationReverted);
      collaborationService.off('design_locked', handleDesignLocked);
      collaborationService.off('design_unlocked', handleDesignUnlocked);
      collaborationService.off('comment_added', handleCommentAdded);
      collaborationService.off('comment_updated', handleCommentUpdated);
      collaborationService.off('comment_deleted', handleCommentDeleted);
      collaborationService.off('comment_resolved', handleCommentResolved);
      collaborationService.off('chat_message', handleChatMessage);
      collaborationService.off('version_created', handleVersionCreated);
      collaborationService.off('version_restored', handleVersionRestored);
      collaborationService.off('conflict_detected', handleConflictDetected);
      collaborationService.off('conflict_resolved', handleConflictResolved);
      collaborationService.off('session_updated', handleSessionUpdated);
      collaborationService.off('session_ended', handleSessionEnded);
      collaborationService.off('permission_changed', handlePermissionChanged);
      collaborationService.off('collaboration_error', handleCollaborationError);
      collaborationService.off('reconnection_successful', handleReconnectionSuccessful);
      collaborationService.off('connection_quality_changed', handleConnectionQualityChanged);
    };
  }, [state.isConnected, state.participants, state.comments, state.chatMessages, state.versions, state.operationHistory, state.pendingOperations, state.lockedElements, state.userCursors, state.userSelections, state.conflicts, state.unreadMessages, state.session, enablePresence, enableComments, enableChat, enableVersionHistory]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !state.isConnected && !state.isConnecting) {
      connect();
    }
  }, [autoConnect, connect, state.isConnected, state.isConnecting]);

  // Collaboration actions
  const applyOperation = useCallback((operation: Omit<DesignOperation, 'id' | 'timestamp' | 'user_id'>) => {
    const fullOperation = {
      ...operation,
      user_id: getCurrentUserId()
    };

    // Add to pending operations
    updateState({
      pendingOperations: [...state.pendingOperations, fullOperation as DesignOperation]
    });

    // Send to collaboration service
    collaborationService.applyOperation(fullOperation);

    // Set timeout for operation confirmation
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }

    operationTimeoutRef.current = setTimeout(() => {
      // Remove from pending if not confirmed
      updateState({
        pendingOperations: state.pendingOperations.filter(op => 
          !(op.type === operation.type && op.element_id === operation.element_id)
        )
      });
    }, 5000);
  }, [state.pendingOperations]);

  const batchOperations = useCallback((operations: Array<Omit<DesignOperation, 'id' | 'timestamp' | 'user_id'>>) => {
    const fullOperations = operations.map(op => ({
      ...op,
      user_id: getCurrentUserId()
    }));

    collaborationService.batchOperations(fullOperations);
  }, []);

  // Presence actions
  const updateCursor = useCallback((position: { x: number; y: number; element_id?: string }) => {
    if (!enablePresence || !state.isConnected) return;

    // Throttle cursor updates
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }

    cursorThrottleRef.current = setTimeout(() => {
      collaborationService.updateCursor(position);
    }, 50); // 20 FPS
  }, [enablePresence, state.isConnected]);

  const updateSelection = useCallback((selectedIds: string[]) => {
    if (!enablePresence || !state.isConnected) return;

    collaborationService.updateSelection(selectedIds);
  }, [enablePresence, state.isConnected]);

  const updateStatus = useCallback((status: string) => {
    if (!state.isConnected) return;

    collaborationService.updateStatus(status);
  }, [state.isConnected]);

  // Element locking
  const requestLock = useCallback((elementId: string) => {
    if (!state.isConnected) return;

    collaborationService.requestLock(elementId);
  }, [state.isConnected]);

  const releaseLock = useCallback((elementId: string) => {
    if (!state.isConnected) return;

    collaborationService.releaseLock(elementId);
  }, [state.isConnected]);

  const isElementLocked = useCallback((elementId: string) => {
    return state.lockedElements.has(elementId);
  }, [state.lockedElements]);

  const getElementLocker = useCallback((elementId: string) => {
    const lockerId = state.lockedElements.get(elementId);
    return lockerId ? state.participants.find(p => p.id === lockerId) : null;
  }, [state.lockedElements, state.participants]);

  // Comments
  const addComment = useCallback((comment: Omit<CollaborationComment, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!enableComments || !state.isConnected) return;

    const fullComment = {
      ...comment,
      user_id: getCurrentUserId(),
      design_id: designId
    };

    collaborationService.addComment(fullComment);
  }, [enableComments, state.isConnected, designId]);

  const updateComment = useCallback((commentId: string, content: string) => {
    if (!enableComments || !state.isConnected) return;

    collaborationService.updateComment(commentId, content);
  }, [enableComments, state.isConnected]);

  const deleteComment = useCallback((commentId: string) => {
    if (!enableComments || !state.isConnected) return;

    collaborationService.deleteComment(commentId);
  }, [enableComments, state.isConnected]);

  const resolveComment = useCallback((commentId: string, resolved: boolean) => {
    if (!enableComments || !state.isConnected) return;

    collaborationService.resolveComment(commentId, resolved);
  }, [enableComments, state.isConnected]);

  // Chat
  const sendChatMessage = useCallback((content: string, type: ChatMessage['type'] = 'text', metadata?: ChatMessage['metadata']) => {
    if (!enableChat || !state.isConnected || !state.session) return;

    const message = {
      session_id: state.session.id,
      user_id: getCurrentUserId(),
      content,
      type,
      metadata
    };

    collaborationService.sendChatMessage(message);
  }, [enableChat, state.isConnected, state.session]);

  const markChatAsRead = useCallback(() => {
    updateState({ unreadMessages: 0 });
  }, []);

  // Version control
  const createVersion = useCallback((title: string, description?: string, isMilestone = false) => {
    if (!enableVersionHistory || !state.isConnected) return;

    const version = {
      design_id: designId,
      created_by: getCurrentUserId(),
      title,
      description,
      thumbnail: '', // Would be generated on backend
      design_data: {}, // Current design state
      changes_summary: {
        added_elements: 0,
        modified_elements: 0,
        deleted_elements: 0,
        style_changes: 0
      },
      auto_created: false,
      is_milestone: isMilestone
    };

    collaborationService.createVersion(version);
  }, [enableVersionHistory, state.isConnected, designId]);

  const restoreVersion = useCallback((versionId: string) => {
    if (!enableVersionHistory || !state.isConnected) return;

    collaborationService.restoreVersion(versionId);
  }, [enableVersionHistory, state.isConnected]);

  // Conflict resolution
  const resolveConflict = useCallback((conflictId: string, resolution: any) => {
    if (!state.isConnected) return;

    collaborationService.resolveConflict(conflictId, resolution);
  }, [state.isConnected]);

  // UI actions
  const toggleChat = useCallback(() => {
    updateState({ showChat: !state.showChat });
    if (!state.showChat) {
      markChatAsRead();
    }
  }, [state.showChat]);

  const toggleComments = useCallback(() => {
    updateState({ showComments: !state.showComments });
  }, [state.showComments]);

  const toggleVersionHistory = useCallback(() => {
    updateState({ showVersionHistory: !state.showVersionHistory });
  }, [state.showVersionHistory]);

  const toggleParticipants = useCallback(() => {
    updateState({ showParticipants: !state.showParticipants });
  }, [state.showParticipants]);

  const selectComment = useCallback((commentId: string | null) => {
    updateState({ selectedComment: commentId });
  }, []);

  // Session management
  const inviteUser = useCallback(async (email: string, role: CollaborationUser['role']) => {
    if (!state.session) return;

    try {
      await collaborationService.inviteUser(state.session.id, email, role);
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  }, [state.session]);

  const removeUser = useCallback(async (userId: string) => {
    if (!state.session) return;

    try {
      await collaborationService.removeUser(state.session.id, userId);
    } catch (error) {
      console.error('Failed to remove user:', error);
      throw error;
    }
  }, [state.session]);

  const updateUserPermissions = useCallback(async (userId: string, permissions: CollaborationUser['permissions']) => {
    if (!state.session) return;

    try {
      await collaborationService.updateUserPermissions(state.session.id, userId, permissions);
    } catch (error) {
      console.error('Failed to update user permissions:', error);
      throw error;
    }
  }, [state.session]);

  const generateShareLink = useCallback(async (options: {
    expires_in?: number;
    role?: CollaborationUser['role'];
    require_approval?: boolean;
  } = {}) => {
    if (!state.session) return null;

    try {
      return await collaborationService.generateShareLink(state.session.id, options);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      throw error;
    }
  }, [state.session]);

  // Utility functions
  const getCurrentUserId = useCallback(() => {
    // This would typically come from your auth context
    return 'current-user-id'; // Replace with actual user ID
  }, []);

  const getUserById = useCallback((userId: string) => {
    return state.participants.find(p => p.id === userId);
  }, [state.participants]);

  const canUserEdit = useCallback((userId?: string) => {
    const user = userId ? getUserById(userId) : state.currentUser;
    return user?.permissions.can_edit || false;
  }, [getUserById, state.currentUser]);

  const canUserComment = useCallback((userId?: string) => {
    const user = userId ? getUserById(userId) : state.currentUser;
    return user?.permissions.can_comment || false;
  }, [getUserById, state.currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
      }
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Connection
    connect,
    disconnect,
    
    // Operations
    applyOperation,
    batchOperations,
    
    // Presence
    updateCursor,
    updateSelection,
    updateStatus,
    
    // Element locking
    requestLock,
    releaseLock,
    isElementLocked,
    getElementLocker,
    
    // Comments
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    selectComment,
    
    // Chat
    sendChatMessage,
    markChatAsRead,
    
    // Version control
    createVersion,
    restoreVersion,
    
    // Conflict resolution
    resolveConflict,
    
    // UI
    toggleChat,
    toggleComments,
    toggleVersionHistory,
    toggleParticipants,
    
    // Session management
    inviteUser,
    removeUser,
    updateUserPermissions,
    generateShareLink,
    
    // Utilities
    getUserById,
    canUserEdit,
    canUserComment
  };
};

export default useCollaboration;