import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  GitMerge,
  User,
  Eye,
  Edit3,
  Trash2,
  Copy,
  X,
  Info,
  Zap
} from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { ConflictResolution, CollaborationUser } from '../../services/collaborationService';

interface ConflictResolverProps {
  designId: string;
  sessionId?: string;
  currentUserId: string;
}

interface ConflictUIState {
  selectedConflict: ConflictResolution | null;
  resolutionChoice: string | null;
  showDetails: boolean;
  autoResolveEnabled: boolean;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  designId,
  sessionId,
  currentUserId
}) => {
  const collaboration = useCollaboration({
    designId,
    sessionId,
    enablePresence: true
  });

  const [uiState, setUIState] = useState<ConflictUIState>({
    selectedConflict: null,
    resolutionChoice: null,
    showDetails: false,
    autoResolveEnabled: false
  });

  // Auto-resolve simple conflicts after a timeout
  useEffect(() => {
    if (!uiState.autoResolveEnabled) return;

    const autoResolveTimeout = setTimeout(() => {
      collaboration.conflicts.forEach(conflict => {
        if (conflict.conflict_type === 'simultaneous_edit' && !conflict.resolved_at) {
          // Auto-resolve with last write wins strategy
          collaboration.resolveConflict(conflict.id, {
            strategy: 'last_write_wins',
            auto_resolved: true
          });
        }
      });
    }, 5000); // 5 seconds

    return () => clearTimeout(autoResolveTimeout);
  }, [collaboration.conflicts, uiState.autoResolveEnabled]);

  const getConflictIcon = (type: ConflictResolution['conflict_type']) => {
    switch (type) {
      case 'simultaneous_edit':
        return <Edit3 className="w-5 h-5 text-orange-500" />;
      case 'element_deletion':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case 'version_mismatch':
        return <GitMerge className="w-5 h-5 text-purple-500" />;
      case 'permission_conflict':
        return <Users className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getConflictTitle = (conflict: ConflictResolution) => {
    switch (conflict.conflict_type) {
      case 'simultaneous_edit':
        return 'Simultaneous Edit Conflict';
      case 'element_deletion':
        return 'Element Deletion Conflict';
      case 'version_mismatch':
        return 'Version Mismatch';
      case 'permission_conflict':
        return 'Permission Conflict';
      default:
        return 'Unknown Conflict';
    }
  };

  const getConflictDescription = (conflict: ConflictResolution) => {
    const users = conflict.users_involved.map(id => 
      collaboration.getUserById(id)?.name || 'Unknown User'
    ).join(', ');

    switch (conflict.conflict_type) {
      case 'simultaneous_edit':
        return `${users} are editing the same element simultaneously`;
      case 'element_deletion':
        return `${users} have conflicting actions on a deleted element`;
      case 'version_mismatch':
        return `${users} are working on different versions`;
      case 'permission_conflict':
        return `${users} have insufficient permissions for this action`;
      default:
        return `Conflict involving ${users}`;
    }
  };

  const getResolutionStrategies = (conflict: ConflictResolution) => {
    switch (conflict.conflict_type) {
      case 'simultaneous_edit':
        return [
          {
            id: 'last_write_wins',
            name: 'Last Change Wins',
            description: 'Apply the most recent change',
            icon: <Clock className="w-4 h-4" />
          },
          {
            id: 'merge',
            name: 'Merge Changes',
            description: 'Combine both changes intelligently',
            icon: <GitMerge className="w-4 h-4" />
          },
          {
            id: 'manual',
            name: 'Manual Resolution',
            description: 'Let users decide how to resolve',
            icon: <User className="w-4 h-4" />
          }
        ];
      case 'element_deletion':
        return [
          {
            id: 'restore',
            name: 'Restore Element',
            description: 'Bring back the deleted element',
            icon: <RotateCcw className="w-4 h-4" />
          },
          {
            id: 'confirm_delete',
            name: 'Confirm Deletion',
            description: 'Keep the element deleted',
            icon: <Trash2 className="w-4 h-4" />
          }
        ];
      case 'version_mismatch':
        return [
          {
            id: 'sync_to_latest',
            name: 'Sync to Latest',
            description: 'Update all users to the latest version',
            icon: <ArrowRight className="w-4 h-4" />
          },
          {
            id: 'create_branch',
            name: 'Create Branch',
            description: 'Allow parallel development',
            icon: <GitMerge className="w-4 h-4" />
          }
        ];
      default:
        return [
          {
            id: 'revert',
            name: 'Revert Changes',
            description: 'Undo the conflicting action',
            icon: <RotateCcw className="w-4 h-4" />
          }
        ];
    }
  };

  const handleResolveConflict = (conflict: ConflictResolution, strategy: string) => {
    collaboration.resolveConflict(conflict.id, {
      strategy,
      resolved_by: currentUserId,
      manual: strategy === 'manual'
    });

    setUIState(prev => ({
      ...prev,
      selectedConflict: null,
      resolutionChoice: null
    }));
  };

  const ConflictItem: React.FC<{ conflict: ConflictResolution }> = ({ conflict }) => {
    const isSelected = uiState.selectedConflict?.id === conflict.id;
    const strategies = getResolutionStrategies(conflict);

    return (
      <div
        className={`border rounded-lg p-4 transition-all ${
          isSelected ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'
        }`}
      >
        <div
          className="flex items-start space-x-3 cursor-pointer"
          onClick={() => setUIState(prev => ({
            ...prev,
            selectedConflict: isSelected ? null : conflict,
            resolutionChoice: null
          }))}
        >
          {getConflictIcon(conflict.conflict_type)}
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                {getConflictTitle(conflict)}
              </h3>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(Date.now())} {/* Placeholder for conflict timestamp */}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              {getConflictDescription(conflict)}
            </p>
            
            <div className="flex items-center space-x-2 mt-2">
              {conflict.users_involved.map(userId => {
                const user = collaboration.getUserById(userId);
                return user ? (
                  <div key={userId} className="flex items-center space-x-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500">{user.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Choose Resolution Strategy:
            </h4>
            
            <div className="space-y-2">
              {strategies.map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => handleResolveConflict(conflict, strategy.id)}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="text-orange-600">{strategy.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {strategy.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {strategy.description}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>

            {/* Auto-resolve option for simple conflicts */}
            {conflict.conflict_type === 'simultaneous_edit' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Auto-resolve similar conflicts
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Automatically apply "Last Change Wins" for future similar conflicts
                </p>
                <button
                  onClick={() => setUIState(prev => ({ ...prev, autoResolveEnabled: true }))}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Enable Auto-resolve
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  // Don't render if there are no conflicts
  if (collaboration.conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      {/* Conflict Notification */}
      <div className="bg-white rounded-lg shadow-xl border border-orange-200">
        <div className="p-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-sm font-semibold text-orange-900">
              {collaboration.conflicts.length} Conflict{collaboration.conflicts.length !== 1 ? 's' : ''} Detected
            </h2>
          </div>
          <p className="text-xs text-orange-700 mt-1">
            Resolve conflicts to continue collaborating
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <div className="p-4 space-y-3">
            {collaboration.conflicts.map(conflict => (
              <ConflictItem key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>

        {/* Auto-resolve toggle */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uiState.autoResolveEnabled}
              onChange={(e) => setUIState(prev => ({ 
                ...prev, 
                autoResolveEnabled: e.target.checked 
              }))}
              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-xs text-gray-700">
              Auto-resolve simple conflicts
            </span>
            <Info 
              className="w-3 h-3 text-gray-400" 
              title="Automatically resolve conflicts using the 'Last Change Wins' strategy after 5 seconds"
            />
          </label>
        </div>
      </div>

      {/* Global conflict indicator for header */}
      {collaboration.conflicts.length > 0 && (
        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
};

// Conflict notification component for the header
export const ConflictIndicator: React.FC<{
  conflictCount: number;
  onClick: () => void;
}> = ({ conflictCount, onClick }) => {
  if (conflictCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
      title={`${conflictCount} conflict${conflictCount !== 1 ? 's' : ''} need resolution`}
    >
      <AlertTriangle className="w-5 h-5" />
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
        {conflictCount > 9 ? '9+' : conflictCount}
      </div>
    </button>
  );
};

export default ConflictResolver;