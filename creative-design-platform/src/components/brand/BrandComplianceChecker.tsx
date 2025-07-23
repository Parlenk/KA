import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Eye,
  EyeOff,
  Zap,
  RefreshCw,
  Settings,
  TrendingUp,
  Target,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  Pause,
  BarChart3,
  Clock,
  Users,
  Award
} from 'lucide-react';
import { useBrandGuidelines } from '../../hooks/useBrandGuidelines';
import { 
  ComplianceViolation, 
  ComplianceResult, 
  brandGuidelinesUtils 
} from '../../services/brandGuidelinesService';

interface BrandComplianceCheckerProps {
  brandKitId: string;
  designId: string;
  designData?: any; // Current design canvas data
  onViolationClick?: (violation: ComplianceViolation) => void;
  onAutoFix?: (violationIds: string[]) => void;
  className?: string;
  position?: 'sidebar' | 'floating' | 'bottom';
  showMiniMode?: boolean;
}

interface ComplianceUIState {
  isExpanded: boolean;
  showDetails: boolean;
  selectedViolation: ComplianceViolation | null;
  filterSeverity: string;
  autoCheckEnabled: boolean;
  showResolvedViolations: boolean;
}

const BrandComplianceChecker: React.FC<BrandComplianceCheckerProps> = ({
  brandKitId,
  designId,
  designData,
  onViolationClick,
  onAutoFix,
  className = '',
  position = 'sidebar',
  showMiniMode = false
}) => {
  const brandGuidelines = useBrandGuidelines({
    brandKitId,
    designId,
    enableRealtimeCompliance: true,
    complianceCheckInterval: 3000
  });

  const [uiState, setUIState] = useState<ComplianceUIState>({
    isExpanded: !showMiniMode,
    showDetails: false,
    selectedViolation: null,
    filterSeverity: 'all',
    autoCheckEnabled: true,
    showResolvedViolations: false
  });

  const [resolvedViolations, setResolvedViolations] = useState<Set<string>>(new Set());
  const previousResultRef = useRef<ComplianceResult | null>(null);

  // Update realtime compliance when design data changes
  useEffect(() => {
    if (designData && uiState.autoCheckEnabled) {
      brandGuidelines.checkRealtimeCompliance(designData);
    }
  }, [designData, uiState.autoCheckEnabled]);

  // Track resolved violations
  useEffect(() => {
    if (brandGuidelines.complianceResult && previousResultRef.current) {
      const previousViolationIds = new Set(previousResultRef.current.violations.map(v => v.id));
      const currentViolationIds = new Set(brandGuidelines.complianceResult.violations.map(v => v.id));
      
      // Find violations that were resolved
      const newlyResolved = new Set<string>();
      previousViolationIds.forEach(id => {
        if (!currentViolationIds.has(id)) {
          newlyResolved.add(id);
        }
      });
      
      if (newlyResolved.size > 0) {
        setResolvedViolations(prev => new Set([...prev, ...newlyResolved]));
      }
    }
    
    previousResultRef.current = brandGuidelines.complianceResult;
  }, [brandGuidelines.complianceResult]);

  const updateUIState = (updates: Partial<ComplianceUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  };

  const handleViolationClick = (violation: ComplianceViolation) => {
    updateUIState({ selectedViolation: violation, showDetails: true });
    onViolationClick?.(violation);
  };

  const handleAutoFix = async (violationIds: string[]) => {
    try {
      await brandGuidelines.autoFixViolations(violationIds);
      onAutoFix?.(violationIds);
    } catch (error) {
      console.error('Auto-fix failed:', error);
    }
  };

  const handleManualCheck = async () => {
    await brandGuidelines.checkCompliance();
  };

  const toggleAutoCheck = () => {
    updateUIState({ autoCheckEnabled: !uiState.autoCheckEnabled });
    brandGuidelines.toggleRealtimeCompliance(!uiState.autoCheckEnabled);
  };

  const getComplianceData = () => {
    if (!brandGuidelines.complianceResult) return null;
    
    const result = brandGuidelines.complianceResult;
    const formattedScore = brandGuidelines.getFormattedScore();
    const summary = brandGuidelines.getComplianceSummary();
    
    return {
      result,
      formattedScore,
      summary
    };
  };

  const filteredViolations = brandGuidelines.complianceResult?.violations.filter(violation => {
    if (uiState.filterSeverity !== 'all' && violation.severity !== uiState.filterSeverity) {
      return false;
    }
    
    if (!uiState.showResolvedViolations && resolvedViolations.has(violation.id)) {
      return false;
    }
    
    return true;
  }) || [];

  const autoFixableViolations = filteredViolations.filter(v => v.can_auto_fix);

  const complianceData = getComplianceData();

  // Mini mode display
  if (showMiniMode && !uiState.isExpanded) {
    return (
      <div className={`fixed ${position === 'floating' ? 'bottom-4 right-4' : 'bottom-0 right-0'} z-40`}>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <button
            onClick={() => updateUIState({ isExpanded: true })}
            className="flex items-center space-x-2"
          >
            <Shield className="w-5 h-5 text-blue-600" />
            {complianceData && (
              <>
                <span className="text-sm font-medium" style={{ color: complianceData.formattedScore.color }}>
                  {complianceData.formattedScore.score}%
                </span>
                {filteredViolations.length > 0 && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (brandGuidelines.complianceLoading && !brandGuidelines.complianceResult) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600">Checking brand compliance...</span>
        </div>
      </div>
    );
  }

  // No compliance data
  if (!complianceData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-4">No compliance data available</p>
          <button
            onClick={handleManualCheck}
            className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Run Compliance Check</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Brand Compliance</h3>
            {brandGuidelines.complianceLoading && (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleAutoCheck}
              className={`p-1 rounded transition-colors ${
                uiState.autoCheckEnabled 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title={uiState.autoCheckEnabled ? 'Auto-check enabled' : 'Auto-check disabled'}
            >
              {uiState.autoCheckEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleManualCheck}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Manual check"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            {showMiniMode && (
              <button
                onClick={() => updateUIState({ isExpanded: false })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Score display */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Overall Score</span>
            <span 
              className="text-2xl font-bold"
              style={{ color: complianceData.formattedScore.color }}
            >
              {complianceData.formattedScore.score}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${complianceData.formattedScore.score}%`,
                backgroundColor: complianceData.formattedScore.color 
              }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span 
              className="text-sm font-medium"
              style={{ color: complianceData.formattedScore.color }}
            >
              {complianceData.formattedScore.grade}
            </span>
            <span className="text-xs text-gray-500">
              {complianceData.formattedScore.description}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-red-600">
              {complianceData.summary?.errorCount || 0}
            </div>
            <div className="text-xs text-gray-600">Errors</div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-yellow-600">
              {complianceData.summary?.warningCount || 0}
            </div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {complianceData.summary?.infoCount || 0}
            </div>
            <div className="text-xs text-gray-600">Info</div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-green-600">
              {autoFixableViolations.length}
            </div>
            <div className="text-xs text-gray-600">Auto-fixable</div>
          </div>
        </div>
      </div>

      {/* Filters and actions */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <select
              value={uiState.filterSeverity}
              onChange={(e) => updateUIState({ filterSeverity: e.target.value })}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="all">All Severities</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="info">Info Only</option>
            </select>
            
            <label className="flex items-center space-x-1 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={uiState.showResolvedViolations}
                onChange={(e) => updateUIState({ showResolvedViolations: e.target.checked })}
                className="w-3 h-3"
              />
              <span>Show resolved</span>
            </label>
          </div>
          
          {autoFixableViolations.length > 0 && (
            <button
              onClick={() => handleAutoFix(autoFixableViolations.map(v => v.id))}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              <Zap className="w-3 h-3" />
              <span>Auto-fix ({autoFixableViolations.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Violations list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredViolations.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {uiState.filterSeverity === 'all' 
                ? 'No violations found. Great job!' 
                : `No ${uiState.filterSeverity} violations found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredViolations.map((violation, index) => (
              <ViolationItem
                key={violation.id}
                violation={violation}
                isResolved={resolvedViolations.has(violation.id)}
                onClick={() => handleViolationClick(violation)}
                onAutoFix={violation.can_auto_fix ? () => handleAutoFix([violation.id]) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {complianceData.result.suggestions.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Suggestions</span>
          </div>
          
          <div className="space-y-2">
            {complianceData.result.suggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium text-blue-900">{suggestion.title}</div>
                <div className="text-blue-700">{suggestion.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed violation modal */}
      {uiState.selectedViolation && uiState.showDetails && (
        <ViolationDetailModal
          violation={uiState.selectedViolation}
          onClose={() => updateUIState({ selectedViolation: null, showDetails: false })}
          onAutoFix={uiState.selectedViolation.can_auto_fix ? () => handleAutoFix([uiState.selectedViolation!.id]) : undefined}
        />
      )}
    </div>
  );
};

// Violation item component
const ViolationItem: React.FC<{
  violation: ComplianceViolation;
  isResolved: boolean;
  onClick: () => void;
  onAutoFix?: () => void;
}> = ({ violation, isResolved, onClick, onAutoFix }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        isResolved ? 'opacity-60 bg-green-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {isResolved ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            getSeverityIcon(violation.severity)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {violation.message}
            </p>
            
            {onAutoFix && !isResolved && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoFix();
                }}
                className="ml-2 p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                title="Auto-fix"
              >
                <Zap className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {violation.element_id && (
            <p className="text-xs text-gray-500 mt-1">
              Element: {violation.element_id}
            </p>
          )}
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>Current: {typeof violation.current_value === 'string' ? violation.current_value.replace(/[<>]/g, '') : JSON.stringify(violation.current_value).replace(/[<>]/g, '')}</span>
            <span>Expected: {typeof violation.expected_value === 'string' ? violation.expected_value.replace(/[<>]/g, '') : JSON.stringify(violation.expected_value).replace(/[<>]/g, '')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Violation detail modal
const ViolationDetailModal: React.FC<{
  violation: ComplianceViolation;
  onClose: () => void;
  onAutoFix?: () => void;
}> = ({ violation, onClose, onAutoFix }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Violation Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <p className="text-sm text-gray-900">{violation.message}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  violation.severity === 'error' ? 'bg-red-100 text-red-800' :
                  violation.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {violation.severity}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Auto-fixable</label>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  violation.can_auto_fix ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {violation.can_auto_fix ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            {violation.element_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Element ID</label>
                <p className="text-sm text-gray-900 font-mono">{violation.element_id}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                  {JSON.stringify(violation.current_value, null, 2).replace(/[<>]/g, '')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Value</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                  {JSON.stringify(violation.expected_value, null, 2).replace(/[<>]/g, '')}
                </p>
              </div>
            </div>
            
            {violation.coordinates && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <p className="text-sm text-gray-900">
                  x: {violation.coordinates.x}, y: {violation.coordinates.y}, 
                  width: {violation.coordinates.width}, height: {violation.coordinates.height}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {onAutoFix && (
              <button
                onClick={() => {
                  onAutoFix();
                  onClose();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Auto-fix</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandComplianceChecker;