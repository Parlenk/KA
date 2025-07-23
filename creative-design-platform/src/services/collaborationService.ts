import { io, Socket } from 'socket.io-client';
import api from './api';

// Types for collaboration
export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  status: 'online' | 'away' | 'offline';
  cursor_position?: {
    x: number;
    y: number;
    element_id?: string;
  };
  last_seen: string;
  permissions: {
    can_edit: boolean;
    can_comment: boolean;
    can_invite: boolean;
    can_export: boolean;
    can_delete: boolean;
  };
}

export interface CollaborationSession {
  id: string;
  design_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  participants: CollaborationUser[];
  settings: {
    allow_anonymous: boolean;
    require_approval: boolean;
    auto_save_interval: number;
    max_participants: number;
    enable_chat: boolean;
    enable_comments: boolean;
    enable_version_history: boolean;
  };
  current_version: number;
  access_link?: string;
  expires_at?: string;
}

export interface DesignOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'resize' | 'style';
  element_id?: string;
  user_id: string;
  timestamp: string;
  data: any;
  previous_state?: any;
  canvas_id?: string;
  operation_context: {
    cursor_position: { x: number; y: number };
    selection_ids: string[];
    tool_active: string;
  };
}

export interface CollaborationComment {
  id: string;
  design_id: string;
  element_id?: string;
  user_id: string;
  content: string;
  position: {
    x: number;
    y: number;
    canvas_id: string;
  };
  created_at: string;
  updated_at: string;
  resolved: boolean;
  replies: CollaborationComment[];
  mentions: string[];
  attachments?: Array<{
    type: 'image' | 'file' | 'link';
    url: string;
    name: string;
  }>;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'system' | 'file' | 'design_reference';
  timestamp: string;
  metadata?: {
    element_id?: string;
    file_url?: string;
    file_name?: string;
    design_version?: number;
  };
}

export interface VersionSnapshot {
  id: string;
  design_id: string;
  version: number;
  created_by: string;
  created_at: string;
  title: string;
  description?: string;
  thumbnail: string;
  design_data: any;
  changes_summary: {
    added_elements: number;
    modified_elements: number;
    deleted_elements: number;
    style_changes: number;
  };
  auto_created: boolean;
  is_milestone: boolean;
}

export interface ConflictResolution {
  id: string;
  operation_id: string;
  conflict_type: 'simultaneous_edit' | 'element_deletion' | 'version_mismatch' | 'permission_conflict';
  users_involved: string[];
  resolution_strategy: 'last_write_wins' | 'merge' | 'manual' | 'revert';
  resolved_at?: string;
  resolved_by?: string;
  resolution_data?: any;
}

// WebSocket Events
interface ServerToClientEvents {
  // User presence
  user_joined: (user: CollaborationUser) => void;
  user_left: (userId: string) => void;
  user_cursor_moved: (userId: string, position: { x: number; y: number; element_id?: string }) => void;
  user_status_changed: (userId: string, status: string) => void;
  user_selection_changed: (userId: string, selectedIds: string[]) => void;

  // Design operations
  operation_applied: (operation: DesignOperation) => void;
  operation_reverted: (operationId: string) => void;
  design_locked: (elementId: string, userId: string) => void;
  design_unlocked: (elementId: string, userId: string) => void;

  // Comments and chat
  comment_added: (comment: CollaborationComment) => void;
  comment_updated: (comment: CollaborationComment) => void;
  comment_deleted: (commentId: string) => void;
  comment_resolved: (commentId: string, resolved: boolean) => void;
  chat_message: (message: ChatMessage) => void;

  // Version control
  version_created: (version: VersionSnapshot) => void;
  version_restored: (version: VersionSnapshot) => void;
  
  // Conflict resolution
  conflict_detected: (conflict: ConflictResolution) => void;
  conflict_resolved: (conflict: ConflictResolution) => void;

  // Session management
  session_updated: (session: Partial<CollaborationSession>) => void;
  session_ended: () => void;
  permission_changed: (userId: string, permissions: CollaborationUser['permissions']) => void;

  // Error handling
  collaboration_error: (error: { code: string; message: string; details?: any }) => void;
  reconnection_successful: () => void;
  connection_quality_changed: (quality: 'excellent' | 'good' | 'poor' | 'disconnected') => void;
}

interface ClientToServerEvents {
  // Session management
  join_session: (sessionId: string, userToken: string) => void;
  leave_session: (sessionId: string) => void;

  // User presence
  update_cursor: (position: { x: number; y: number; element_id?: string }) => void;
  update_status: (status: string) => void;
  update_selection: (selectedIds: string[]) => void;

  // Design operations
  apply_operation: (operation: Omit<DesignOperation, 'id' | 'timestamp'>) => void;
  request_lock: (elementId: string) => void;
  release_lock: (elementId: string) => void;
  batch_operations: (operations: Array<Omit<DesignOperation, 'id' | 'timestamp'>>) => void;

  // Comments and chat
  add_comment: (comment: Omit<CollaborationComment, 'id' | 'created_at' | 'updated_at'>) => void;
  update_comment: (commentId: string, content: string) => void;
  delete_comment: (commentId: string) => void;
  resolve_comment: (commentId: string, resolved: boolean) => void;
  send_chat_message: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  // Version control
  create_version: (version: Omit<VersionSnapshot, 'id' | 'created_at' | 'version'>) => void;
  restore_version: (versionId: string) => void;

  // Conflict resolution
  resolve_conflict: (conflictId: string, resolution: any) => void;

  // Heartbeat
  ping: () => void;
}

class CollaborationService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private currentSession: CollaborationSession | null = null;
  private currentUser: CollaborationUser | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private operationQueue: Array<Omit<DesignOperation, 'id' | 'timestamp'>> = [];
  private isProcessingQueue = false;

  // Event listeners
  private listeners: {
    [K in keyof ServerToClientEvents]: Array<ServerToClientEvents[K]>
  } = {} as any;

  constructor() {
    this.initializeEventListeners();
  }

  // Connection management
  async connect(sessionId: string, userToken: string): Promise<CollaborationSession> {
    try {
      // Disconnect existing connection
      if (this.socket?.connected) {
        this.disconnect();
      }

      // Get session details
      const sessionResponse = await api.get(`/collaboration/sessions/${sessionId}`);
      this.currentSession = sessionResponse.data.data;

      // Initialize WebSocket connection
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://api.yourapp.com' 
        : 'ws://localhost:3001';

      this.socket = io(socketUrl, {
        auth: {
          token: userToken,
          sessionId
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Set up socket event handlers
      this.setupSocketEventHandlers();

      // Join the collaboration session
      return new Promise((resolve, reject) => {
        this.socket!.emit('join_session', sessionId, userToken);

        this.socket!.on('session_updated', (sessionUpdate) => {
          this.currentSession = { ...this.currentSession!, ...sessionUpdate };
          this.emit('session_updated', sessionUpdate);
          resolve(this.currentSession);
        });

        this.socket!.on('collaboration_error', (error) => {
          reject(new Error(error.message));
        });

        // Set timeout for connection
        setTimeout(() => {
          if (!this.socket?.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });

    } catch (error) {
      console.error('Failed to connect to collaboration session:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.currentSession = null;
    this.currentUser = null;
    this.operationQueue = [];
    this.isProcessingQueue = false;
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processOperationQueue();
      this.emit('reconnection_successful', undefined);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from collaboration server:', reason);
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        this.emit('session_ended', undefined);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('collaboration_error', {
          code: 'CONNECTION_FAILED',
          message: 'Failed to connect to collaboration server'
        });
      }
    });

    // Forward all events to listeners
    Object.keys(this.listeners).forEach(eventName => {
      this.socket!.on(eventName as any, (...args: any[]) => {
        this.emit(eventName as keyof ServerToClientEvents, ...args);
      });
    });
  }

  // Event management
  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  private emit<K extends keyof ServerToClientEvents>(
    event: K,
    ...args: Parameters<ServerToClientEvents[K]>
  ): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Heartbeat management
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Operation management
  applyOperation(operation: Omit<DesignOperation, 'id' | 'timestamp'>): void {
    if (!this.socket?.connected) {
      // Queue operation for when connection is restored
      this.operationQueue.push(operation);
      return;
    }

    this.socket.emit('apply_operation', operation);
  }

  batchOperations(operations: Array<Omit<DesignOperation, 'id' | 'timestamp'>>): void {
    if (!this.socket?.connected) {
      this.operationQueue.push(...operations);
      return;
    }

    this.socket.emit('batch_operations', operations);
  }

  private async processOperationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.operationQueue.length > 0 && this.socket?.connected) {
        const operations = this.operationQueue.splice(0, 10); // Process in batches
        this.socket.emit('batch_operations', operations);
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing operation queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // User presence
  updateCursor(position: { x: number; y: number; element_id?: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('update_cursor', position);
    }
  }

  updateStatus(status: string): void {
    if (this.socket?.connected) {
      this.socket.emit('update_status', status);
    }
  }

  updateSelection(selectedIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('update_selection', selectedIds);
    }
  }

  // Element locking
  requestLock(elementId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('request_lock', elementId);
    }
  }

  releaseLock(elementId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('release_lock', elementId);
    }
  }

  // Comments
  addComment(comment: Omit<CollaborationComment, 'id' | 'created_at' | 'updated_at'>): void {
    if (this.socket?.connected) {
      this.socket.emit('add_comment', comment);
    }
  }

  updateComment(commentId: string, content: string): void {
    if (this.socket?.connected) {
      this.socket.emit('update_comment', commentId, content);
    }
  }

  deleteComment(commentId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('delete_comment', commentId);
    }
  }

  resolveComment(commentId: string, resolved: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('resolve_comment', commentId, resolved);
    }
  }

  // Chat
  sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    if (this.socket?.connected) {
      this.socket.emit('send_chat_message', message);
    }
  }

  // Version control
  createVersion(version: Omit<VersionSnapshot, 'id' | 'created_at' | 'version'>): void {
    if (this.socket?.connected) {
      this.socket.emit('create_version', version);
    }
  }

  restoreVersion(versionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('restore_version', versionId);
    }
  }

  // Conflict resolution
  resolveConflict(conflictId: string, resolution: any): void {
    if (this.socket?.connected) {
      this.socket.emit('resolve_conflict', conflictId, resolution);
    }
  }

  // API methods for session management
  async createSession(designId: string, settings: Partial<CollaborationSession['settings']> = {}): Promise<CollaborationSession> {
    const response = await api.post('/collaboration/sessions', {
      design_id: designId,
      settings: {
        allow_anonymous: false,
        require_approval: false,
        auto_save_interval: 30000,
        max_participants: 10,
        enable_chat: true,
        enable_comments: true,
        enable_version_history: true,
        ...settings
      }
    });
    return response.data.data;
  }

  async getSession(sessionId: string): Promise<CollaborationSession> {
    const response = await api.get(`/collaboration/sessions/${sessionId}`);
    return response.data.data;
  }

  async updateSession(sessionId: string, updates: Partial<CollaborationSession>): Promise<CollaborationSession> {
    const response = await api.put(`/collaboration/sessions/${sessionId}`, updates);
    return response.data.data;
  }

  async endSession(sessionId: string): Promise<void> {
    await api.delete(`/collaboration/sessions/${sessionId}`);
  }

  async inviteUser(sessionId: string, email: string, role: CollaborationUser['role']): Promise<void> {
    await api.post(`/collaboration/sessions/${sessionId}/invite`, {
      email,
      role
    });
  }

  async removeUser(sessionId: string, userId: string): Promise<void> {
    await api.delete(`/collaboration/sessions/${sessionId}/users/${userId}`);
  }

  async updateUserPermissions(
    sessionId: string, 
    userId: string, 
    permissions: CollaborationUser['permissions']
  ): Promise<void> {
    await api.put(`/collaboration/sessions/${sessionId}/users/${userId}/permissions`, {
      permissions
    });
  }

  async getComments(designId: string): Promise<CollaborationComment[]> {
    const response = await api.get(`/collaboration/designs/${designId}/comments`);
    return response.data.data;
  }

  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const response = await api.get(`/collaboration/sessions/${sessionId}/chat`, {
      params: { limit }
    });
    return response.data.data;
  }

  async getVersionHistory(designId: string): Promise<VersionSnapshot[]> {
    const response = await api.get(`/collaboration/designs/${designId}/versions`);
    return response.data.data;
  }

  async generateShareLink(sessionId: string, options: {
    expires_in?: number;
    role?: CollaborationUser['role'];
    require_approval?: boolean;
  } = {}): Promise<string> {
    const response = await api.post(`/collaboration/sessions/${sessionId}/share-link`, options);
    return response.data.data.link;
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  getCurrentUser(): CollaborationUser | null {
    return this.currentUser;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'disconnected' {
    if (!this.socket?.connected) return 'disconnected';
    
    // Simple ping-based quality assessment
    const ping = (this.socket as any).ping || 0;
    if (ping < 50) return 'excellent';
    if (ping < 150) return 'good';
    return 'poor';
  }

  // Initialize event listeners for internal use
  private initializeEventListeners(): void {
    // Initialize empty listener arrays
    const events: (keyof ServerToClientEvents)[] = [
      'user_joined', 'user_left', 'user_cursor_moved', 'user_status_changed', 'user_selection_changed',
      'operation_applied', 'operation_reverted', 'design_locked', 'design_unlocked',
      'comment_added', 'comment_updated', 'comment_deleted', 'comment_resolved', 'chat_message',
      'version_created', 'version_restored', 'conflict_detected', 'conflict_resolved',
      'session_updated', 'session_ended', 'permission_changed', 'collaboration_error',
      'reconnection_successful', 'connection_quality_changed'
    ];

    events.forEach(event => {
      this.listeners[event] = [];
    });
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();
export default collaborationService;