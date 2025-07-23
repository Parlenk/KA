import api from './api';

// Export Types
export interface ExportRequest {
  design_id: string;
  format: string;
  quality: string;
  dimensions: {
    width: number;
    height: number;
  };
  optimization: {
    compress: boolean;
    progressive: boolean;
    strip_metadata: boolean;
  };
  platforms?: string[];
  batch_export?: boolean;
  include_variants?: boolean;
  watermark?: boolean;
  color_profile?: 'sRGB' | 'Adobe RGB' | 'P3';
  background_color?: string;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  custom_settings?: Record<string, any>;
}

export interface ExportJob {
  id: string;
  design_id: string;
  user_id: string;
  name: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  download_url?: string;
  error_message?: string;
  file_size?: number;
  estimated_time?: number;
  actual_time?: number;
  settings: ExportRequest;
  metadata: {
    original_dimensions: { width: number; height: number };
    output_dimensions: { width: number; height: number };
    compression_ratio?: number;
    color_count?: number;
    file_format_details?: Record<string, any>;
  };
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'print' | 'web' | 'mobile' | 'advertising' | 'custom';
  platform?: string;
  is_built_in: boolean;
  is_public: boolean;
  created_by?: string;
  usage_count: number;
  settings: Partial<ExportRequest>;
  dimensions_presets: Array<{
    name: string;
    width: number;
    height: number;
    description?: string;
  }>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BatchExportRequest {
  design_ids: string[];
  formats: string[];
  settings: Partial<ExportRequest>;
  output_format: 'individual' | 'zip' | 'pdf_collection';
  naming_pattern?: string;
}

export interface BatchExportJob {
  id: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  download_url?: string;
  individual_jobs: ExportJob[];
  error_summary?: string;
}

export interface ExportAnalytics {
  total_exports: number;
  exports_by_format: Record<string, number>;
  exports_by_quality: Record<string, number>;
  exports_by_platform: Record<string, number>;
  average_file_size: number;
  average_processing_time: number;
  most_popular_presets: Array<{
    preset_id: string;
    name: string;
    usage_count: number;
  }>;
  export_trends: Array<{
    date: string;
    count: number;
    total_size: number;
  }>;
  user_preferences: {
    preferred_formats: string[];
    preferred_quality: string;
    avg_dimensions: { width: number; height: number };
  };
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  format: string;
  dimensions: { width: number; height: number };
  quality_settings: Record<string, any>;
  optimization_settings: Record<string, any>;
  platform_specific: boolean;
  target_platforms: string[];
  use_cases: string[];
  estimated_file_size: string;
  recommended_for: string[];
  created_at: string;
  updated_at: string;
}

class ExportService {
  // Single export operations
  async exportDesign(request: ExportRequest): Promise<{ job_id: string; estimated_time: number }> {
    const response = await api.post('/export/single', request);
    return response.data.data;
  }

  async getExportJob(jobId: string): Promise<ExportJob> {
    const response = await api.get(`/export/jobs/${jobId}`);
    return response.data.data;
  }

  async cancelExportJob(jobId: string): Promise<void> {
    await api.delete(`/export/jobs/${jobId}`);
  }

  async downloadExport(jobId: string): Promise<Blob> {
    const response = await api.get(`/export/jobs/${jobId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getExportJobHistory(limit: number = 50): Promise<ExportJob[]> {
    const response = await api.get('/export/jobs', {
      params: { limit }
    });
    return response.data.data;
  }

  // Batch export operations
  async batchExport(request: BatchExportRequest): Promise<{ batch_id: string; estimated_time: number }> {
    const response = await api.post('/export/batch', request);
    return response.data.data;
  }

  async getBatchExportJob(batchId: string): Promise<BatchExportJob> {
    const response = await api.get(`/export/batch/${batchId}`);
    return response.data.data;
  }

  async cancelBatchExport(batchId: string): Promise<void> {
    await api.delete(`/export/batch/${batchId}`);
  }

  async downloadBatchExport(batchId: string): Promise<Blob> {
    const response = await api.get(`/export/batch/${batchId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Export presets
  async getExportPresets(category?: string): Promise<ExportPreset[]> {
    const response = await api.get('/export/presets', {
      params: { category }
    });
    return response.data.data;
  }

  async createExportPreset(preset: Omit<ExportPreset, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<ExportPreset> {
    const response = await api.post('/export/presets', preset);
    return response.data.data;
  }

  async updateExportPreset(presetId: string, updates: Partial<ExportPreset>): Promise<ExportPreset> {
    const response = await api.put(`/export/presets/${presetId}`, updates);
    return response.data.data;
  }

  async deleteExportPreset(presetId: string): Promise<void> {
    await api.delete(`/export/presets/${presetId}`);
  }

  async useExportPreset(presetId: string): Promise<void> {
    await api.post(`/export/presets/${presetId}/use`);
  }

  // Export templates
  async getExportTemplates(category?: string): Promise<ExportTemplate[]> {
    const response = await api.get('/export/templates', {
      params: { category }
    });
    return response.data.data;
  }

  async getExportTemplate(templateId: string): Promise<ExportTemplate> {
    const response = await api.get(`/export/templates/${templateId}`);
    return response.data.data;
  }

  // Format-specific operations
  async validateExportSettings(request: ExportRequest): Promise<{
    valid: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
    estimated_file_size: string;
    estimated_time: number;
  }> {
    const response = await api.post('/export/validate', request);
    return response.data.data;
  }

  async getFormatCapabilities(format: string): Promise<{
    format: string;
    supported_features: string[];
    quality_options: Array<{ id: string; name: string; description: string }>;
    max_dimensions: { width: number; height: number };
    min_dimensions: { width: number; height: number };
    supported_color_profiles: string[];
    compression_options: string[];
    platform_optimizations: string[];
  }> {
    const response = await api.get(`/export/formats/${format}/capabilities`);
    return response.data.data;
  }

  async getSupportedFormats(): Promise<Array<{
    id: string;
    name: string;
    extension: string;
    description: string;
    category: string;
    features: Record<string, boolean>;
    use_cases: string[];
    platforms: string[];
  }>> {
    const response = await api.get('/export/formats');
    return response.data.data;
  }

  // Preview operations
  async generatePreview(request: ExportRequest & { preview_only: true }): Promise<{
    preview_url: string;
    preview_expires_at: string;
  }> {
    const response = await api.post('/export/preview', request);
    return response.data.data;
  }

  async generateThumbnail(designId: string, options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}): Promise<{
    thumbnail_url: string;
    thumbnail_expires_at: string;
  }> {
    const response = await api.post(`/export/designs/${designId}/thumbnail`, options);
    return response.data.data;
  }

  // Platform-specific optimizations
  async optimizeForPlatform(request: ExportRequest, platform: string): Promise<{
    optimized_settings: ExportRequest;
    optimization_notes: string[];
    estimated_performance: {
      loading_time: string;
      file_size_score: number;
      quality_score: number;
      compatibility_score: number;
    };
  }> {
    const response = await api.post('/export/optimize', {
      ...request,
      target_platform: platform
    });
    return response.data.data;
  }

  async getPlatformRequirements(platform: string): Promise<{
    platform: string;
    recommended_formats: string[];
    max_file_size: number;
    recommended_dimensions: Array<{
      name: string;
      width: number;
      height: number;
      use_case: string;
    }>;
    quality_guidelines: string[];
    technical_requirements: Record<string, any>;
  }> {
    const response = await api.get(`/export/platforms/${platform}/requirements`);
    return response.data.data;
  }

  // Analytics and insights
  async getExportAnalytics(timeframe: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ExportAnalytics> {
    const response = await api.get('/export/analytics', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getExportInsights(designId: string): Promise<{
    recommended_formats: Array<{
      format: string;
      score: number;
      reason: string;
    }>;
    size_optimization_tips: string[];
    quality_recommendations: string[];
    platform_suggestions: Array<{
      platform: string;
      confidence: number;
      settings: Partial<ExportRequest>;
    }>;
  }> {
    const response = await api.get(`/export/designs/${designId}/insights`);
    return response.data.data;
  }

  // Quality control
  async analyzeExportQuality(jobId: string): Promise<{
    overall_score: number;
    quality_metrics: {
      resolution_score: number;
      compression_score: number;
      color_accuracy_score: number;
      file_size_score: number;
    };
    issues_found: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestion: string;
    }>;
    improvement_suggestions: string[];
  }> {
    const response = await api.get(`/export/jobs/${jobId}/quality-analysis`);
    return response.data.data;
  }

  async compareExportQuality(jobId1: string, jobId2: string): Promise<{
    comparison: {
      file_size_difference: number;
      quality_difference: number;
      performance_difference: number;
    };
    recommendations: string[];
    preferred_export: string;
  }> {
    const response = await api.get('/export/compare', {
      params: { job1: jobId1, job2: jobId2 }
    });
    return response.data.data;
  }

  // Collaboration and sharing
  async shareExport(jobId: string, options: {
    expires_in?: number;
    password_protected?: boolean;
    download_limit?: number;
  } = {}): Promise<{
    share_url: string;
    share_id: string;
    expires_at?: string;
  }> {
    const response = await api.post(`/export/jobs/${jobId}/share`, options);
    return response.data.data;
  }

  async getSharedExport(shareId: string, password?: string): Promise<{
    job: ExportJob;
    download_url: string;
    remaining_downloads?: number;
  }> {
    const response = await api.get(`/export/shared/${shareId}`, {
      params: { password }
    });
    return response.data.data;
  }

  // Advanced features
  async scheduleExport(request: ExportRequest, scheduleTime: string): Promise<{
    scheduled_job_id: string;
    scheduled_for: string;
  }> {
    const response = await api.post('/export/schedule', {
      ...request,
      scheduled_for: scheduleTime
    });
    return response.data.data;
  }

  async getScheduledExports(): Promise<Array<{
    id: string;
    request: ExportRequest;
    scheduled_for: string;
    status: 'pending' | 'cancelled';
    created_at: string;
  }>> {
    const response = await api.get('/export/scheduled');
    return response.data.data;
  }

  async cancelScheduledExport(scheduledJobId: string): Promise<void> {
    await api.delete(`/export/scheduled/${scheduledJobId}`);
  }

  async createExportWorkflow(workflow: {
    name: string;
    description: string;
    steps: Array<{
      type: 'export' | 'optimize' | 'convert' | 'validate';
      settings: Record<string, any>;
      conditional?: boolean;
      condition?: string;
    }>;
  }): Promise<{
    workflow_id: string;
  }> {
    const response = await api.post('/export/workflows', workflow);
    return response.data.data;
  }

  async runExportWorkflow(workflowId: string, designId: string): Promise<{
    execution_id: string;
    estimated_time: number;
  }> {
    const response = await api.post(`/export/workflows/${workflowId}/run`, {
      design_id: designId
    });
    return response.data.data;
  }

  // Webhook and notifications
  async setupExportWebhook(webhook: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{
    webhook_id: string;
  }> {
    const response = await api.post('/export/webhooks', webhook);
    return response.data.data;
  }

  async getExportWebhooks(): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
  }>> {
    const response = await api.get('/export/webhooks');
    return response.data.data;
  }

  async deleteExportWebhook(webhookId: string): Promise<void> {
    await api.delete(`/export/webhooks/${webhookId}`);
  }

  // Utility functions
  async estimateExportTime(request: ExportRequest): Promise<{
    estimated_seconds: number;
    factors: Array<{
      factor: string;
      impact: string;
      weight: number;
    }>;
  }> {
    const response = await api.post('/export/estimate-time', request);
    return response.data.data;
  }

  async optimizeExportSettings(request: ExportRequest, goal: 'file_size' | 'quality' | 'speed' | 'compatibility'): Promise<{
    optimized_settings: ExportRequest;
    optimization_applied: string[];
    trade_offs: string[];
    estimated_improvement: string;
  }> {
    const response = await api.post('/export/optimize-settings', {
      ...request,
      optimization_goal: goal
    });
    return response.data.data;
  }

  // Error handling and recovery
  async retryFailedExport(jobId: string): Promise<{
    new_job_id: string;
    retry_attempt: number;
  }> {
    const response = await api.post(`/export/jobs/${jobId}/retry`);
    return response.data.data;
  }

  async getExportErrorDetails(jobId: string): Promise<{
    error_code: string;
    error_message: string;
    error_details: Record<string, any>;
    suggested_fixes: string[];
    retry_recommended: boolean;
  }> {
    const response = await api.get(`/export/jobs/${jobId}/error-details`);
    return response.data.data;
  }
}

// Export utility functions
export const exportUtils = {
  // File size formatting
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Time formatting
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  },

  // Progress calculation
  calculateBatchProgress(batchJob: BatchExportJob): number {
    if (batchJob.total_items === 0) return 0;
    return Math.round((batchJob.completed_items / batchJob.total_items) * 100);
  },

  // Quality score interpretation
  interpretQualityScore(score: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
    color: string;
  } {
    if (score >= 90) return {
      level: 'excellent',
      description: 'Excellent quality with minimal artifacts',
      color: 'green'
    };
    if (score >= 75) return {
      level: 'good',
      description: 'Good quality suitable for most uses',
      color: 'blue'
    };
    if (score >= 60) return {
      level: 'fair',
      description: 'Fair quality, some compression visible',
      color: 'yellow'
    };
    return {
      level: 'poor',
      description: 'Poor quality with visible artifacts',
      color: 'red'
    };
  },

  // Platform optimization suggestions
  getPlatformOptimizations(platform: string): {
    formats: string[];
    maxFileSize: string;
    dimensions: Array<{ name: string; width: number; height: number }>;
    tips: string[];
  } {
    const optimizations: Record<string, any> = {
      instagram: {
        formats: ['jpg', 'png', 'mp4'],
        maxFileSize: '30 MB',
        dimensions: [
          { name: 'Square Post', width: 1080, height: 1080 },
          { name: 'Story', width: 1080, height: 1920 },
          { name: 'Landscape', width: 1080, height: 566 }
        ],
        tips: [
          'Use sRGB color profile',
          'Keep file size under 30MB',
          'Use progressive JPEG for faster loading',
          'Avoid transparent backgrounds for better compression'
        ]
      },
      facebook: {
        formats: ['jpg', 'png', 'mp4'],
        maxFileSize: '4 GB',
        dimensions: [
          { name: 'Post Image', width: 1200, height: 630 },
          { name: 'Cover Photo', width: 1640, height: 859 },
          { name: 'Event Image', width: 1920, height: 1080 }
        ],
        tips: [
          'Use high-quality images for better engagement',
          'Facebook compresses images, so start with high quality',
          'Use 20% text rule for ad images',
          'Test images on mobile devices'
        ]
      },
      twitter: {
        formats: ['jpg', 'png', 'gif', 'mp4'],
        maxFileSize: '5 MB',
        dimensions: [
          { name: 'Header', width: 1500, height: 500 },
          { name: 'In-stream', width: 1600, height: 900 },
          { name: 'Card Image', width: 800, height: 418 }
        ],
        tips: [
          'Keep file sizes small for faster loading',
          'Use 16:9 aspect ratio for best results',
          'Consider accessibility with alt text',
          'Test across different devices'
        ]
      }
    };

    return optimizations[platform] || {
      formats: ['jpg', 'png'],
      maxFileSize: '10 MB',
      dimensions: [],
      tips: ['Follow platform-specific guidelines', 'Test on target devices']
    };
  },

  // Generate filename
  generateFilename(designName: string, format: string, dimensions?: { width: number; height: number }, timestamp?: boolean): string {
    let filename = designName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    if (dimensions) {
      filename += `_${dimensions.width}x${dimensions.height}`;
    }
    
    if (timestamp) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      filename += `_${dateStr}`;
    }
    
    return `${filename}.${format}`;
  },

  // Validate export settings
  validateExportSettings(settings: ExportRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Dimension validation
    if (settings.dimensions.width <= 0 || settings.dimensions.height <= 0) {
      errors.push('Dimensions must be positive numbers');
    }

    if (settings.dimensions.width > 8192 || settings.dimensions.height > 8192) {
      warnings.push('Large dimensions may result in very large file sizes');
    }

    // Format-specific validation
    if (settings.format === 'jpg' && settings.optimization.strip_metadata) {
      warnings.push('JPEG metadata stripping may affect color accuracy');
    }

    if (settings.format === 'gif' && (settings.dimensions.width > 800 || settings.dimensions.height > 600)) {
      warnings.push('Large GIF files may have slow loading times');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};

// Export singleton instance
export const exportService = new ExportService();
export default exportService;