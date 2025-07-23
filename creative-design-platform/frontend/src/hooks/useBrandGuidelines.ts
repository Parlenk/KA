import { useState, useEffect, useCallback, useRef } from 'react';
import {
  brandGuidelinesService,
  brandGuidelinesUtils,
  BrandGuideline,
  ComplianceResult,
  BrandApprovalWorkflow,
  ApprovalRequest,
  BrandUsageAnalytics,
  ComplianceViolation
} from '../services/brandGuidelinesService';

interface UseBrandGuidelinesOptions {
  brandKitId: string;
  designId?: string;
  enableRealtimeCompliance?: boolean;
  complianceCheckInterval?: number;
}

interface BrandGuidelinesState {
  // Guidelines
  guidelines: BrandGuideline[];
  guidelinesLoading: boolean;
  
  // Compliance
  complianceResult: ComplianceResult | null;
  complianceLoading: boolean;
  realtimeComplianceEnabled: boolean;
  
  // Approval workflows
  approvalWorkflows: BrandApprovalWorkflow[];
  approvalRequests: ApprovalRequest[];
  
  // Analytics
  usageAnalytics: BrandUsageAnalytics | null;
  
  // UI state
  selectedGuideline: BrandGuideline | null;
  showCompliancePanel: boolean;
  activeViolations: ComplianceViolation[];
  
  // Error handling
  error: string | null;
  lastUpdate: Date | null;
}

export const useBrandGuidelines = (options: UseBrandGuidelinesOptions) => {
  const {
    brandKitId,
    designId,
    enableRealtimeCompliance = false,
    complianceCheckInterval = 5000
  } = options;

  const [state, setState] = useState<BrandGuidelinesState>({
    guidelines: [],
    guidelinesLoading: false,
    complianceResult: null,
    complianceLoading: false,
    realtimeComplianceEnabled: enableRealtimeCompliance,
    approvalWorkflows: [],
    approvalRequests: [],
    usageAnalytics: null,
    selectedGuideline: null,
    showCompliancePanel: false,
    activeViolations: [],
    error: null,
    lastUpdate: null
  });

  // Refs for intervals and timeouts
  const complianceIntervalRef = useRef<NodeJS.Timeout>();
  const realtimeTimeoutRef = useRef<NodeJS.Timeout>();

  // Update state helper
  const updateState = useCallback((updates: Partial<BrandGuidelinesState>) => {
    setState(prevState => ({ ...prevState, ...updates, lastUpdate: new Date() }));
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        updateState({ guidelinesLoading: true, error: null });

        const [guidelines, workflows, analytics, approvalRequests] = await Promise.all([
          brandGuidelinesService.getBrandGuidelines(brandKitId),
          brandGuidelinesService.getApprovalWorkflows(brandKitId),
          brandGuidelinesService.getBrandUsageAnalytics(brandKitId, '30d').catch(() => null),
          brandGuidelinesService.getApprovalRequests().catch(() => [])
        ]);

        updateState({
          guidelines,
          approvalWorkflows: workflows,
          usageAnalytics: analytics,
          approvalRequests,
          guidelinesLoading: false
        });

        // Initial compliance check if design ID is provided
        if (designId) {
          checkCompliance();
        }
      } catch (error) {
        console.error('Failed to load brand guidelines data:', error);
        updateState({
          guidelinesLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load brand guidelines'
        });
      }
    };

    loadInitialData();
  }, [brandKitId, designId]);

  // Setup realtime compliance checking
  useEffect(() => {
    if (!state.realtimeComplianceEnabled || !designId) {
      if (complianceIntervalRef.current) {
        clearInterval(complianceIntervalRef.current);
        complianceIntervalRef.current = undefined;
      }
      return;
    }

    const performComplianceCheck = async () => {
      try {
        const result = await brandGuidelinesService.checkCompliance(designId, brandKitId);
        updateState({
          complianceResult: result,
          activeViolations: result.violations.filter(v => v.severity === 'error')
        });
      } catch (error) {
        console.error('Realtime compliance check failed:', error);
      }
    };

    // Initial check
    performComplianceCheck();

    // Setup interval
    complianceIntervalRef.current = setInterval(performComplianceCheck, complianceCheckInterval);

    return () => {
      if (complianceIntervalRef.current) {
        clearInterval(complianceIntervalRef.current);
      }
    };
  }, [state.realtimeComplianceEnabled, designId, brandKitId, complianceCheckInterval]);

  // Guidelines management functions
  const createGuideline = useCallback(async (guideline: Omit<BrandGuideline, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      updateState({ error: null });
      
      // Validate user authentication before creating guideline
      if (!brandKitId || typeof brandKitId !== 'string') {
        throw new Error('Invalid brand kit ID');
      }
      
      const newGuideline = await brandGuidelinesService.createBrandGuideline(brandKitId, guideline);
      
      updateState(prevState => ({
        ...prevState,
        guidelines: [...prevState.guidelines, newGuideline]
      }));

      return newGuideline;
    } catch (error) {
      console.error('Failed to create guideline:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to create guideline'
      });
      throw error;
    }
  }, [brandKitId]);

  const updateGuideline = useCallback(async (guidelineId: string, updates: Partial<BrandGuideline>) => {
    try {
      updateState({ error: null });
      
      const updatedGuideline = await brandGuidelinesService.updateBrandGuideline(guidelineId, updates);
      
      updateState(prevState => ({
        ...prevState,
        guidelines: prevState.guidelines.map(g => 
          g.id === guidelineId ? updatedGuideline : g
        )
      }));

      // Recheck compliance if this guideline affects current design
      if (designId) {
        checkCompliance();
      }

      return updatedGuideline;
    } catch (error) {
      console.error('Failed to update guideline:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to update guideline'
      });
      throw error;
    }
  }, [designId]);

  const deleteGuideline = useCallback(async (guidelineId: string) => {
    try {
      updateState({ error: null });
      
      await brandGuidelinesService.deleteBrandGuideline(guidelineId);
      
      updateState(prevState => ({
        ...prevState,
        guidelines: prevState.guidelines.filter(g => g.id !== guidelineId),
        selectedGuideline: prevState.selectedGuideline?.id === guidelineId ? null : prevState.selectedGuideline
      }));

      // Recheck compliance after deletion
      if (designId) {
        checkCompliance();
      }
    } catch (error) {
      console.error('Failed to delete guideline:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to delete guideline'
      });
      throw error;
    }
  }, [designId]);

  const duplicateGuideline = useCallback(async (guidelineId: string) => {
    try {
      updateState({ error: null });
      
      const duplicatedGuideline = await brandGuidelinesService.duplicateGuideline(guidelineId);
      
      updateState(prevState => ({
        ...prevState,
        guidelines: [...prevState.guidelines, duplicatedGuideline]
      }));

      return duplicatedGuideline;
    } catch (error) {
      console.error('Failed to duplicate guideline:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to duplicate guideline'
      });
      throw error;
    }
  }, []);

  const reorderGuidelines = useCallback(async (guidelineIds: string[]) => {
    try {
      updateState({ error: null });
      
      await brandGuidelinesService.reorderGuidelines(brandKitId, guidelineIds);
      
      // Update local state to reflect new order
      updateState(prevState => {
        const reorderedGuidelines = guidelineIds.map(id => 
          prevState.guidelines.find(g => g.id === id)!
        ).filter(Boolean);
        
        return {
          ...prevState,
          guidelines: reorderedGuidelines
        };
      });
    } catch (error) {
      console.error('Failed to reorder guidelines:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to reorder guidelines'
      });
      throw error;
    }
  }, [brandKitId]);

  // Compliance functions
  const checkCompliance = useCallback(async (targetDesignId?: string) => {
    if (!targetDesignId && !designId) return;

    try {
      updateState({ complianceLoading: true, error: null });
      
      const result = await brandGuidelinesService.checkCompliance(
        targetDesignId || designId!,
        brandKitId
      );
      
      updateState({
        complianceResult: result,
        activeViolations: result.violations.filter(v => v.severity === 'error'),
        complianceLoading: false
      });

      return result;
    } catch (error) {
      console.error('Failed to check compliance:', error);
      updateState({
        complianceLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check compliance'
      });
      throw error;
    }
  }, [designId, brandKitId]);

  const checkRealtimeCompliance = useCallback(async (designData: any) => {
    try {
      // Debounce realtime compliance checks
      if (realtimeTimeoutRef.current) {
        clearTimeout(realtimeTimeoutRef.current);
      }

      realtimeTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await brandGuidelinesService.checkRealtimeCompliance(designData, brandKitId);
          updateState({
            complianceResult: result,
            activeViolations: result.violations.filter(v => v.severity === 'error')
          });
        } catch (error) {
          console.error('Realtime compliance check failed:', error);
        }
      }, 500); // 500ms debounce
    } catch (error) {
      console.error('Failed to setup realtime compliance check:', error);
    }
  }, [brandKitId]);

  const autoFixViolations = useCallback(async (violationIds: string[]) => {
    if (!designId) return;

    try {
      updateState({ error: null });
      
      const result = await brandGuidelinesService.autoFixViolations(designId, violationIds);
      
      // Recheck compliance after auto-fix
      await checkCompliance();

      return result;
    } catch (error) {
      console.error('Failed to auto-fix violations:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to auto-fix violations'
      });
      throw error;
    }
  }, [designId, checkCompliance]);

  // Approval workflow functions
  const submitForApproval = useCallback(async (workflowId: string, message?: string) => {
    if (!designId) return;

    try {
      updateState({ error: null });
      
      const approvalRequest = await brandGuidelinesService.submitForApproval(designId, workflowId, message);
      
      updateState(prevState => ({
        ...prevState,
        approvalRequests: [...prevState.approvalRequests, approvalRequest]
      }));

      return approvalRequest;
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to submit for approval'
      });
      throw error;
    }
  }, [designId]);

  const approveRequest = useCallback(async (requestId: string, stageId: string, reasoning?: string) => {
    try {
      updateState({ error: null });
      
      const updatedRequest = await brandGuidelinesService.approveRequest(requestId, stageId, reasoning);
      
      updateState(prevState => ({
        ...prevState,
        approvalRequests: prevState.approvalRequests.map(req => 
          req.id === requestId ? updatedRequest : req
        )
      }));

      return updatedRequest;
    } catch (error) {
      console.error('Failed to approve request:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to approve request'
      });
      throw error;
    }
  }, []);

  const rejectRequest = useCallback(async (requestId: string, stageId: string, reasoning: string) => {
    try {
      updateState({ error: null });
      
      const updatedRequest = await brandGuidelinesService.rejectRequest(requestId, stageId, reasoning);
      
      updateState(prevState => ({
        ...prevState,
        approvalRequests: prevState.approvalRequests.map(req => 
          req.id === requestId ? updatedRequest : req
        )
      }));

      return updatedRequest;
    } catch (error) {
      console.error('Failed to reject request:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to reject request'
      });
      throw error;
    }
  }, []);

  // Analytics functions
  const refreshAnalytics = useCallback(async (timeframe: '7d' | '30d' | '90d' | '1y' = '30d') => {
    try {
      updateState({ error: null });
      
      const analytics = await brandGuidelinesService.getBrandUsageAnalytics(brandKitId, timeframe);
      
      updateState({ usageAnalytics: analytics });

      return analytics;
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to refresh analytics'
      });
      throw error;
    }
  }, [brandKitId]);

  // AI suggestions
  const getAISuggestions = useCallback(async () => {
    try {
      updateState({ error: null });
      
      const suggestions = await brandGuidelinesService.getAIGuidelineSuggestions(brandKitId, designId);
      
      return suggestions;
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to get AI suggestions'
      });
      throw error;
    }
  }, [brandKitId, designId]);

  const optimizeCompliance = useCallback(async (priority: 'speed' | 'quality' | 'balance' = 'balance') => {
    if (!designId) return;

    try {
      updateState({ error: null });
      
      const result = await brandGuidelinesService.optimizeBrandCompliance(designId, brandKitId, priority);
      
      // Recheck compliance after optimization
      await checkCompliance();

      return result;
    } catch (error) {
      console.error('Failed to optimize compliance:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to optimize compliance'
      });
      throw error;
    }
  }, [designId, brandKitId, checkCompliance]);

  // UI state management
  const selectGuideline = useCallback((guideline: BrandGuideline | null) => {
    updateState({ selectedGuideline: guideline });
  }, []);

  const toggleCompliancePanel = useCallback((show?: boolean) => {
    updateState(prevState => ({
      ...prevState,
      showCompliancePanel: show !== undefined ? show : !prevState.showCompliancePanel
    }));
  }, []);

  const toggleRealtimeCompliance = useCallback((enabled?: boolean) => {
    updateState(prevState => ({
      ...prevState,
      realtimeComplianceEnabled: enabled !== undefined ? enabled : !prevState.realtimeComplianceEnabled
    }));
  }, []);

  // Utility functions
  const getComplianceScore = useCallback(() => {
    return state.complianceResult ? state.complianceResult.overall_score : 0;
  }, [state.complianceResult]);

  const getFormattedScore = useCallback(() => {
    const score = getComplianceScore();
    return brandGuidelinesUtils.formatComplianceScore(score);
  }, [getComplianceScore]);

  const getViolationsByCategory = useCallback(() => {
    if (!state.complianceResult) return {};
    return brandGuidelinesUtils.groupViolationsByCategory(state.complianceResult.violations);
  }, [state.complianceResult]);

  const getComplianceSummary = useCallback(() => {
    if (!state.complianceResult) return null;
    return brandGuidelinesUtils.generateComplianceSummary(state.complianceResult);
  }, [state.complianceResult]);

  const hasActiveViolations = useCallback(() => {
    return state.activeViolations.length > 0;
  }, [state.activeViolations]);

  const getGuidelinesByCategory = useCallback(() => {
    return state.guidelines.reduce((groups, guideline) => {
      if (!groups[guideline.category]) {
        groups[guideline.category] = [];
      }
      groups[guideline.category].push(guideline);
      return groups;
    }, {} as Record<string, BrandGuideline[]>);
  }, [state.guidelines]);

  // Error clearing
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (complianceIntervalRef.current) {
        clearInterval(complianceIntervalRef.current);
      }
      if (realtimeTimeoutRef.current) {
        clearTimeout(realtimeTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Guidelines management
    createGuideline,
    updateGuideline,
    deleteGuideline,
    duplicateGuideline,
    reorderGuidelines,
    
    // Compliance
    checkCompliance,
    checkRealtimeCompliance,
    autoFixViolations,
    
    // Approval workflows
    submitForApproval,
    approveRequest,
    rejectRequest,
    
    // Analytics
    refreshAnalytics,
    
    // AI features
    getAISuggestions,
    optimizeCompliance,
    
    // UI state
    selectGuideline,
    toggleCompliancePanel,
    toggleRealtimeCompliance,
    
    // Utilities
    getComplianceScore,
    getFormattedScore,
    getViolationsByCategory,
    getComplianceSummary,
    hasActiveViolations,
    getGuidelinesByCategory,
    
    // Error handling
    clearError
  };
};

export default useBrandGuidelines;