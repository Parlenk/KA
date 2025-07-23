import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  MessageCircle,
  Clock,
  Send,
  MoreVertical,
  Check,
  X,
  Reply,
  Trash2,
  Edit3,
  Pin,
  Hash,
  Smile,
  Paperclip,
  Eye,
  EyeOff,
  Crown,
  Shield,
  User,
  Wifi,
  WifiOff,
  Circle,
  Share2,
  Copy,
  Link,
  UserPlus,
  Settings,
  Save,
  GitBranch,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock3,
  Filter,
  Search
} from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { CollaborationUser, CollaborationComment, ChatMessage, VersionSnapshot } from '../../services/collaborationService';

interface CollaborationPanelProps {
  designId: string;
  sessionId?: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  designId,
  sessionId,
  isOpen,
  onClose,
  currentUserId
}) => {
  const collaboration = useCollaboration({
    designId,
    sessionId,
    autoConnect: true,
    enablePresence: true,
    enableComments: true,
    enableChat: true,
    enableVersionHistory: true
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'comments' | 'versions' | 'participants'>('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaborationUser['role']>('editor');
  const [commentFilter, setCommentFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [collaboration.chatMessages]);

  // Mark chat as read when panel is open and chat tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      collaboration.markChatAsRead();
    }
  }, [isOpen, activeTab, collaboration.markChatAsRead]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    collaboration.sendChatMessage(chatMessage);
    setChatMessage('');
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    collaboration.addComment({
      content: commentText,
      position: { x: 100, y: 100, canvas_id: 'main' }, // Would be actual position
      resolved: false,
      replies: [],
      mentions: []
    });
    setCommentText('');
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await collaboration.inviteUser(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const filteredComments = collaboration.comments.filter(comment => {
    const matchesFilter = commentFilter === 'all' || 
      (commentFilter === 'open' && !comment.resolved) ||
      (commentFilter === 'resolved' && comment.resolved);
    
    const matchesSearch = !searchQuery || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: CollaborationUser['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getRoleIcon = (role: CollaborationUser['role']) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'editor': return <Edit3 className="w-3 h-3 text-blue-500" />;
      case 'viewer': return <Eye className="w-3 h-3 text-gray-500" />;
      case 'commenter': return <MessageCircle className="w-3 h-3 text-purple-500" />;
      default: return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const UserAvatar: React.FC<{ user: CollaborationUser; size?: 'sm' | 'md' | 'lg' }> = ({ user, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };

    return (
      <div className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium`}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          user.name.charAt(0).toUpperCase()
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {collaboration.isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {collaboration.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {collaboration.participants.length} participant{collaboration.participants.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShareDialog(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connection Quality Indicator */}
        {collaboration.isConnected && (
          <div className={`px-4 py-2 text-xs ${
            collaboration.connectionQuality === 'excellent' ? 'bg-green-50 text-green-700' :
            collaboration.connectionQuality === 'good' ? 'bg-blue-50 text-blue-700' :
            collaboration.connectionQuality === 'poor' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Connection: {collaboration.connectionQuality}
          </div>
        )}

        {/* Error Display */}
        {collaboration.error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{collaboration.error}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { id: 'chat', label: 'Chat', icon: MessageCircle, count: collaboration.unreadMessages },
            { id: 'comments', label: 'Comments', icon: Pin, count: collaboration.comments.filter(c => !c.resolved).length },
            { id: 'versions', label: 'History', icon: Clock, count: null },
            { id: 'participants', label: 'People', icon: Users, count: collaboration.participants.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-3 px-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {collaboration.chatMessages.map((message) => {
                  const user = collaboration.getUserById(message.user_id);
                  const isOwnMessage = message.user_id === currentUserId;
                  
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex space-x-2 max-w-xs ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {!isOwnMessage && user && <UserAvatar user={user} size="sm" />}
                        <div className={`rounded-lg px-3 py-2 ${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {!isOwnMessage && (
                            <div className="text-xs font-medium mb-1">{user?.name}</div>
                          )}
                          <div className="text-sm">{message.content}</div>
                          <div className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {collaboration.chatMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Start a conversation with your team</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!collaboration.isConnected}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || !collaboration.isConnected}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="h-full flex flex-col">
              {/* Comments Header */}
              <div className="p-4 border-b space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search comments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter */}
                <div className="flex space-x-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'open', label: 'Open' },
                    { id: 'resolved', label: 'Resolved' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setCommentFilter(filter.id as any)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        commentFilter === filter.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredComments.map((comment) => {
                  const user = collaboration.getUserById(comment.user_id);
                  
                  return (
                    <div
                      key={comment.id}
                      className={`p-3 border rounded-lg ${
                        comment.resolved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {user && <UserAvatar user={user} size="sm" />}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{user?.name}</span>
                            <div className="flex items-center space-x-1">
                              {comment.resolved && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {formatTime(comment.created_at)}
                              </span>
                              <button
                                onClick={() => collaboration.resolveComment(comment.id, !comment.resolved)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title={comment.resolved ? 'Reopen' : 'Resolve'}
                              >
                                {comment.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-900">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredComments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Pin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No comments found</p>
                    <p className="text-xs">
                      {searchQuery ? 'Try a different search term' : 'Add a comment to start the discussion'}
                    </p>
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t p-4">
                <div className="space-y-2">
                  <textarea
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={!collaboration.canUserComment()}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {collaboration.canUserComment() ? 'Press Enter to send' : 'You cannot comment'}
                    </span>
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || !collaboration.canUserComment()}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Version History Tab */}
          {activeTab === 'versions' && (
            <div className="h-full flex flex-col">
              {/* Current Version Info */}
              <div className="p-4 border-b bg-blue-50">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Version {collaboration.currentVersion}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">Current working version</p>
              </div>

              {/* Versions List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {collaboration.versions.map((version) => {
                  const user = collaboration.getUserById(version.created_by);
                  const isCurrent = version.version === collaboration.currentVersion;
                  
                  return (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-lg ${
                        isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{version.title}</span>
                            {version.is_milestone && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                Milestone
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          {version.description && (
                            <p className="text-xs text-gray-600 mt-1">{version.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              {user && <UserAvatar user={user} size="sm" />}
                              <span>{user?.name}</span>
                            </div>
                            <span>{formatTime(version.created_at)}</span>
                            <span>v{version.version}</span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>+{version.changes_summary.added_elements} added</span>
                            <span>~{version.changes_summary.modified_elements} modified</span>
                            <span>-{version.changes_summary.deleted_elements} removed</span>
                          </div>
                        </div>
                        
                        {!isCurrent && (
                          <button
                            onClick={() => collaboration.restoreVersion(version.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Restore this version"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {collaboration.versions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No version history</p>
                    <p className="text-xs">Versions will appear as you make changes</p>
                  </div>
                )}
              </div>

              {/* Create Version */}
              <div className="border-t p-4">
                <button
                  onClick={() => collaboration.createVersion('Manual Save', 'User created version')}
                  disabled={!collaboration.canUserEdit()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Create Version</span>
                </button>
              </div>
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="h-full flex flex-col">
              {/* Participants List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {collaboration.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                    <UserAvatar user={participant} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{participant.name}</span>
                        {getRoleIcon(participant.role)}
                        {participant.id === currentUserId && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="capitalize">{participant.role}</span>
                        <Circle className={`w-2 h-2 ${getStatusColor(participant.status)}`} />
                        <span className="capitalize">{participant.status}</span>
                      </div>
                    </div>
                    
                    {participant.id !== currentUserId && collaboration.session?.created_by === currentUserId && (
                      <button
                        onClick={() => collaboration.removeUser(participant.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Remove user"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite User */}
              <div className="border-t p-4">
                <button
                  onClick={() => setShowInviteDialog(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite People</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite People</h3>
              <button
                onClick={() => setShowInviteDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CollaborationUser['role'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="commenter">Commenter - Can view and comment</option>
                  <option value="editor">Editor - Can view, comment, and edit</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share Design</h3>
              <button
                onClick={() => setShowShareDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value="https://app.example.com/design/abc123"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText('https://app.example.com/design/abc123')}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                Anyone with this link can view the design.
              </div>
              
              <button
                onClick={() => setShowShareDialog(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CollaborationPanel;