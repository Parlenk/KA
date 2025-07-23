import api from './api';

// Brand Guidelines Types
export interface BrandGuideline {
  id: string;
  brand_kit_id: string;
  name: string;
  description: string;
  category: 'colors' | 'typography' | 'spacing' | 'layout' | 'imagery' | 'logo' | 'general';
  rule_type: 'required' | 'preferred' | 'forbidden' | 'conditional';
  severity: 'error' | 'warning' | 'info';
  rules: BrandRule[];
  conditions?: BrandCondition[];
  exceptions?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
  order: number;
}

export interface BrandRule {
  id: string;
  type: 'color_usage' | 'font_usage' | 'logo_placement' | 'spacing_rule' | 'size_constraint' | 'text_content' | 'image_style';
  property: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in_range' | 'regex_match';
  value: any;
  message: string;
  auto_fix?: boolean;
  fix_action?: any;
}

export interface BrandCondition {
  id: string;
  property: string;
  operator: string;
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface ComplianceResult {
  design_id: string;
  overall_score: number;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  suggestions: ComplianceSuggestion[];
  checked_at: string;
  guidelines_version: string;
}

export interface ComplianceViolation {
  id: string;
  guideline_id: string;
  rule_id: string;
  element_id?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  current_value: any;
  expected_value: any;
  can_auto_fix: boolean;
  fix_action?: any;
  coordinates?: { x: number; y: number; width: number; height: number };
}

export interface ComplianceWarning {
  id: string;
  message: string;
  recommendation: string;
  element_ids: string[];
  impact_score: number;
}

export interface ComplianceSuggestion {
  id: string;
  type: 'improvement' | 'optimization' | 'best_practice';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  implementation_effort: 'easy' | 'medium' | 'complex';
  expected_impact: string;
  action_required: any;
}

export interface BrandApprovalWorkflow {
  id: string;
  brand_kit_id: string;
  name: string;
  description: string;
  stages: ApprovalStage[];
  auto_approval_rules?: AutoApprovalRule[];
  escalation_rules?: EscalationRule[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  approvers: string[];
  required_approvals: number;
  auto_approve_after?: number; // hours
  compliance_threshold?: number; // minimum score required
  order: number;
}

export interface AutoApprovalRule {
  id: string;
  condition: string;
  action: 'approve' | 'reject' | 'skip_stage';
  reasoning: string;
}

export interface EscalationRule {
  id: string;
  trigger: 'timeout' | 'rejection' | 'compliance_fail';
  escalate_to: string[];
  notification_template: string;
}

export interface ApprovalRequest {
  id: string;
  design_id: string;
  workflow_id: string;
  requestor_id: string;
  current_stage: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  compliance_score: number;
  submitted_at: string;
  updated_at: string;
  comments: ApprovalComment[];
  approval_history: ApprovalAction[];
}

export interface ApprovalComment {
  id: string;
  user_id: string;
  stage_id: string;
  message: string;
  created_at: string;
  attachments?: string[];
}

export interface ApprovalAction {
  id: string;
  user_id: string;
  stage_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  reasoning: string;
  created_at: string;
}

export interface BrandUsageAnalytics {
  brand_kit_id: string;
  timeframe: string;
  total_designs: number;
  compliance_metrics: {
    average_score: number;
    compliance_trend: Array<{ date: string; score: number; designs_count: number }>;
    violation_categories: Record<string, number>;
    most_common_violations: Array<{
      guideline_id: string;
      guideline_name: string;
      violation_count: number;
      severity: string;
    }>;
  };
  asset_usage: {
    colors: Array<{ hex: string; usage_count: number; compliance_rate: number }>;
    fonts: Array<{ family: string; usage_count: number; compliance_rate: number }>;
    logos: Array<{ id: string; name: string; usage_count: number; compliance_rate: number }>;
  };
  approval_metrics: {
    total_requests: number;
    approval_rate: number;
    average_approval_time: number;
    rejection_reasons: Record<string, number>;
  };
  user_compliance: Array<{
    user_id: string;
    user_name: string;
    designs_count: number;
    average_compliance: number;
    improvement_trend: number;
  }>;
}

class BrandGuidelinesService {
  // Guidelines management
  async getBrandGuidelines(brandKitId: string): Promise<BrandGuideline[]> {
    const response = await api.get(`/brand-kits/${brandKitId}/guidelines`);
    return response.data.data;
  }

  async createBrandGuideline(brandKitId: string, guideline: Omit<BrandGuideline, 'id' | 'created_at' | 'updated_at'>): Promise<BrandGuideline> {
    const response = await api.post(`/brand-kits/${brandKitId}/guidelines`, guideline);
    return response.data.data;
  }

  async updateBrandGuideline(guidelineId: string, updates: Partial<BrandGuideline>): Promise<BrandGuideline> {
    const response = await api.put(`/brand-guidelines/${guidelineId}`, updates);
    return response.data.data;
  }

  async deleteBrandGuideline(guidelineId: string): Promise<void> {
    await api.delete(`/brand-guidelines/${guidelineId}`);
  }

  async reorderGuidelines(brandKitId: string, guidelineIds: string[]): Promise<void> {
    await api.put(`/brand-kits/${brandKitId}/guidelines/reorder`, {
      guideline_ids: guidelineIds
    });
  }

  async duplicateGuideline(guidelineId: string): Promise<BrandGuideline> {
    const response = await api.post(`/brand-guidelines/${guidelineId}/duplicate`);
    return response.data.data;
  }

  // Compliance checking
  async checkCompliance(designId: string, brandKitId?: string): Promise<ComplianceResult> {
    const response = await api.post('/brand-compliance/check', {
      design_id: designId,
      brand_kit_id: brandKitId
    });
    return response.data.data;
  }

  async checkRealtimeCompliance(designData: any, brandKitId: string): Promise<ComplianceResult> {
    const response = await api.post('/brand-compliance/realtime', {
      design_data: designData,
      brand_kit_id: brandKitId
    });
    return response.data.data;
  }

  async autoFixViolations(designId: string, violationIds: string[]): Promise<{
    fixed_violations: string[];
    failed_fixes: Array<{ violation_id: string; error: string }>;
    updated_design_data: any;
  }> {
    const response = await api.post(`/brand-compliance/auto-fix`, {
      design_id: designId,
      violation_ids: violationIds
    });
    return response.data.data;
  }

  async getComplianceHistory(designId: string, limit: number = 50): Promise<ComplianceResult[]> {
    const response = await api.get(`/designs/${designId}/compliance-history`, {
      params: { limit }
    });
    return response.data.data;
  }

  // Brand approval workflows
  async getApprovalWorkflows(brandKitId: string): Promise<BrandApprovalWorkflow[]> {
    const response = await api.get(`/brand-kits/${brandKitId}/approval-workflows`);
    return response.data.data;
  }

  async createApprovalWorkflow(brandKitId: string, workflow: Omit<BrandApprovalWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<BrandApprovalWorkflow> {
    const response = await api.post(`/brand-kits/${brandKitId}/approval-workflows`, workflow);
    return response.data.data;
  }

  async updateApprovalWorkflow(workflowId: string, updates: Partial<BrandApprovalWorkflow>): Promise<BrandApprovalWorkflow> {
    const response = await api.put(`/approval-workflows/${workflowId}`, updates);
    return response.data.data;
  }

  async deleteApprovalWorkflow(workflowId: string): Promise<void> {
    await api.delete(`/approval-workflows/${workflowId}`);
  }

  // Approval requests
  async submitForApproval(designId: string, workflowId: string, message?: string): Promise<ApprovalRequest> {
    const response = await api.post('/approval-requests', {
      design_id: designId,
      workflow_id: workflowId,
      message
    });
    return response.data.data;
  }

  async getApprovalRequests(status?: string, userId?: string): Promise<ApprovalRequest[]> {
    const response = await api.get('/approval-requests', {
      params: { status, user_id: userId }
    });
    return response.data.data;
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequest> {
    const response = await api.get(`/approval-requests/${requestId}`);
    return response.data.data;
  }

  async approveRequest(requestId: string, stageId: string, reasoning?: string): Promise<ApprovalRequest> {
    const response = await api.post(`/approval-requests/${requestId}/approve`, {
      stage_id: stageId,
      reasoning
    });
    return response.data.data;
  }

  async rejectRequest(requestId: string, stageId: string, reasoning: string): Promise<ApprovalRequest> {
    const response = await api.post(`/approval-requests/${requestId}/reject`, {
      stage_id: stageId,
      reasoning
    });
    return response.data.data;
  }

  async requestChanges(requestId: string, stageId: string, feedback: string): Promise<ApprovalRequest> {
    const response = await api.post(`/approval-requests/${requestId}/request-changes`, {
      stage_id: stageId,
      feedback
    });
    return response.data.data;
  }

  async addApprovalComment(requestId: string, stageId: string, message: string, attachments?: string[]): Promise<ApprovalComment> {
    const response = await api.post(`/approval-requests/${requestId}/comments`, {
      stage_id: stageId,
      message,
      attachments
    });
    return response.data.data;
  }

  async cancelApprovalRequest(requestId: string, reason?: string): Promise<void> {
    await api.delete(`/approval-requests/${requestId}`, {
      data: { reason }
    });
  }

  // Analytics and reporting
  async getBrandUsageAnalytics(brandKitId: string, timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<BrandUsageAnalytics> {
    const response = await api.get(`/brand-kits/${brandKitId}/analytics`, {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getComplianceTrends(brandKitId: string, timeframe: string): Promise<{
    trends: Array<{ date: string; score: number; violations: number; designs: number }>;
    insights: string[];
    recommendations: string[];
  }> {
    const response = await api.get(`/brand-kits/${brandKitId}/compliance-trends`, {
      params: { timeframe }
    });
    return response.data.data;
  }

  async generateComplianceReport(brandKitId: string, options: {
    timeframe: string;
    include_user_breakdown?: boolean;
    include_violation_details?: boolean;
    format: 'pdf' | 'excel' | 'json';
  }): Promise<{ report_url: string; expires_at: string }> {
    const response = await api.post(`/brand-kits/${brandKitId}/compliance-report`, options);
    return response.data.data;
  }

  // Guideline templates and presets
  async getGuidelineTemplates(industry?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    industry: string;
    guidelines_count: number;
    usage_count: number;
    rating: number;
    preview_url?: string;
  }>> {
    const response = await api.get('/brand-guidelines/templates', {
      params: { industry }
    });
    return response.data.data;
  }

  async applyGuidelineTemplate(brandKitId: string, templateId: string, customizations?: any): Promise<BrandGuideline[]> {
    const response = await api.post(`/brand-kits/${brandKitId}/apply-template`, {
      template_id: templateId,
      customizations
    });
    return response.data.data;
  }

  async createGuidelineTemplate(name: string, description: string, guidelines: BrandGuideline[], industry: string): Promise<{
    template_id: string;
  }> {
    const response = await api.post('/brand-guidelines/templates', {
      name,
      description,
      guidelines,
      industry
    });
    return response.data.data;
  }

  // AI-powered suggestions
  async getAIGuidelineSuggestions(brandKitId: string, designId?: string): Promise<{
    suggested_guidelines: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      guideline: Partial<BrandGuideline>;
      reasoning: string;
      confidence: number;
    }>;
    brand_analysis: {
      color_palette_consistency: number;
      typography_consistency: number;
      layout_patterns: string[];
      style_characteristics: string[];
    };
  }> {
    const response = await api.post(`/brand-kits/${brandKitId}/ai-suggestions`, {
      design_id: designId
    });
    return response.data.data;
  }

  async optimizeBrandCompliance(designId: string, brandKitId: string, priority: 'speed' | 'quality' | 'balance' = 'balance'): Promise<{
    optimized_design_data: any;
    improvements: Array<{
      type: string;
      description: string;
      before_score: number;
      after_score: number;
    }>;
    overall_improvement: number;
  }> {
    const response = await api.post('/brand-compliance/optimize', {
      design_id: designId,
      brand_kit_id: brandKitId,
      optimization_priority: priority
    });
    return response.data.data;
  }

  // Bulk operations
  async bulkCheckCompliance(designIds: string[], brandKitId: string): Promise<{
    results: ComplianceResult[];
    summary: {
      total_designs: number;
      average_score: number;
      violations_count: number;
      warnings_count: number;
    };
  }> {
    const response = await api.post('/brand-compliance/bulk-check', {
      design_ids: designIds,
      brand_kit_id: brandKitId
    });
    return response.data.data;
  }

  async bulkApplyGuidelines(designIds: string[], guidelineIds: string[]): Promise<{
    success_count: number;
    failed_designs: Array<{ design_id: string; error: string }>;
    compliance_improvements: Array<{
      design_id: string;
      before_score: number;
      after_score: number;
    }>;
  }> {
    const response = await api.post('/brand-guidelines/bulk-apply', {
      design_ids: designIds,
      guideline_ids: guidelineIds
    });
    return response.data.data;
  }

  // Integration and webhooks
  async setupComplianceWebhook(brandKitId: string, webhook: {
    url: string;
    events: ('violation_detected' | 'compliance_improved' | 'approval_submitted' | 'approval_completed')[];
    secret?: string;
  }): Promise<{ webhook_id: string }> {
    const response = await api.post(`/brand-kits/${brandKitId}/webhooks`, webhook);
    return response.data.data;
  }

  async getComplianceWebhooks(brandKitId: string): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
  }>> {
    const response = await api.get(`/brand-kits/${brandKitId}/webhooks`);
    return response.data.data;
  }

  async deleteComplianceWebhook(webhookId: string): Promise<void> {
    await api.delete(`/webhooks/${webhookId}`);
  }
}

// Utility functions for brand guidelines
export const brandGuidelinesUtils = {
  // Severity color mapping
  getSeverityColor(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  },

  // Calculate compliance score
  calculateComplianceScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const totalPenalty = violations.reduce((sum, violation) => {
      switch (violation.severity) {
        case 'error': return sum + 20;
        case 'warning': return sum + 10;
        case 'info': return sum + 5;
        default: return sum;
      }
    }, 0);

    return Math.max(0, 100 - totalPenalty);
  },

  // Format compliance score
  formatComplianceScore(score: number): {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    color: string;
    description: string;
  } {
    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    let color: string;
    let description: string;

    if (score >= 95) {
      grade = 'A+';
      color = '#10B981';
      description = 'Excellent brand compliance';
    } else if (score >= 85) {
      grade = 'A';
      color = '#22C55E';
      description = 'Very good brand compliance';
    } else if (score >= 75) {
      grade = 'B';
      color = '#84CC16';
      description = 'Good brand compliance';
    } else if (score >= 65) {
      grade = 'C';
      color = '#F59E0B';
      description = 'Fair brand compliance';
    } else if (score >= 50) {
      grade = 'D';
      color = '#F97316';
      description = 'Poor brand compliance';
    } else {
      grade = 'F';
      color = '#EF4444';
      description = 'Very poor brand compliance';
    }

    return { score, grade, color, description };
  },

  // Generate guideline rule from template
  generateRule(type: BrandRule['type'], property: string, value: any, message?: string): BrandRule {
    return {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      property,
      operator: 'equals',
      value,
      message: message || `${property} should be ${value}`,
      auto_fix: true
    };
  },

  // Validate guideline rule
  validateRule(rule: BrandRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.property) {
      errors.push('Property is required');
    }

    if (rule.value === undefined || rule.value === null) {
      errors.push('Value is required');
    }

    if (!rule.message) {
      errors.push('Message is required');
    }

    // Type-specific validation
    switch (rule.type) {
      case 'color_usage':
        if (typeof rule.value !== 'string' || !rule.value.match(/^#[0-9A-Fa-f]{6}$/)) {
          errors.push('Color value must be a valid hex color');
        }
        break;
      case 'size_constraint':
        if (typeof rule.value !== 'number' || rule.value <= 0) {
          errors.push('Size value must be a positive number');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Group violations by category
  groupViolationsByCategory(violations: ComplianceViolation[]): Record<string, ComplianceViolation[]> {
    return violations.reduce((groups, violation) => {
      const category = violation.rule_id.split('_')[0] || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(violation);
      return groups;
    }, {} as Record<string, ComplianceViolation[]>);
  },

  // Generate compliance summary
  generateComplianceSummary(result: ComplianceResult): {
    score: number;
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    topIssues: string[];
    recommendations: string[];
  } {
    const errorCount = result.violations.filter(v => v.severity === 'error').length;
    const warningCount = result.violations.filter(v => v.severity === 'warning').length;
    const infoCount = result.violations.filter(v => v.severity === 'info').length;

    // Get most common violation types
    const violationTypes = result.violations.reduce((acc, v) => {
      acc[v.rule_id] = (acc[v.rule_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIssues = Object.entries(violationTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([ruleId]) => ruleId);

    const recommendations = result.suggestions
      .filter(s => s.priority === 'high')
      .map(s => s.title)
      .slice(0, 3);

    return {
      score: result.overall_score,
      totalViolations: result.violations.length,
      errorCount,
      warningCount,
      infoCount,
      topIssues,
      recommendations
    };
  }
};

// Export singleton instance
export const brandGuidelinesService = new BrandGuidelinesService();
export default brandGuidelinesService;