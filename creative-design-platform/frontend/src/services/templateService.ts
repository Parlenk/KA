import api from './api';
import {
  Template,
  TemplateCategory,
  TemplateFilter,
  TemplateSearchQuery,
  TemplateSearchResult,
  TemplateCustomizationRequest,
  TemplateExportOptions,
  TemplateCollection,
  AIRecommendation,
  TemplateResponse,
  TemplateListResponse,
  TemplateSearchResponse,
  TemplateAnalyticsResponse
} from '../types/template';

// Template API endpoints
const TEMPLATE_API = {
  TEMPLATES: '/templates',
  CATEGORIES: '/templates/categories',
  SEARCH: '/templates/search',
  RECOMMENDATIONS: '/templates/recommendations',
  COLLECTIONS: '/templates/collections',
  ANALYTICS: '/templates/analytics',
  CUSTOMIZE: '/templates/customize',
  EXPORT: '/templates/export'
};

export const templateService = {
  // Template CRUD operations
  async getTemplates(params?: {
    page?: number;
    per_page?: number;
    category?: string;
    subcategory?: string;
    featured?: boolean;
    trending?: boolean;
    new?: boolean;
  }): Promise<TemplateListResponse> {
    const response = await api.get(TEMPLATE_API.TEMPLATES, { params });
    return response.data;
  },

  async getTemplate(id: string): Promise<TemplateResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/${id}`);
    return response.data;
  },

  async getFeaturedTemplates(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/featured`);
    return response.data;
  },

  async getTrendingTemplates(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/trending`);
    return response.data;
  },

  async getNewTemplates(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/new`);
    return response.data;
  },

  async getPopularTemplates(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/popular`);
    return response.data;
  },

  // Category operations
  async getCategories(): Promise<{ data: TemplateCategory[]; status: string; message: string }> {
    const response = await api.get(TEMPLATE_API.CATEGORIES);
    return response.data;
  },

  async getCategoryTemplates(categoryId: string, params?: {
    page?: number;
    per_page?: number;
    sort_by?: string;
  }): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.CATEGORIES}/${categoryId}/templates`, { params });
    return response.data;
  },

  // Search operations
  async searchTemplates(query: TemplateSearchQuery): Promise<TemplateSearchResponse> {
    const response = await api.post(TEMPLATE_API.SEARCH, query);
    return response.data;
  },

  async getSearchSuggestions(query: string): Promise<{ data: string[]; status: string; message: string }> {
    const response = await api.get(`${TEMPLATE_API.SEARCH}/suggestions`, {
      params: { q: query }
    });
    return response.data;
  },

  async getPopularSearches(): Promise<{ data: string[]; status: string; message: string }> {
    const response = await api.get(`${TEMPLATE_API.SEARCH}/popular`);
    return response.data;
  },

  // AI Recommendations
  async getAIRecommendations(params: {
    current_design?: any;
    user_preferences?: any;
    design_context?: any;
    limit?: number;
  }): Promise<{ data: AIRecommendation[]; status: string; message: string }> {
    const response = await api.post(TEMPLATE_API.RECOMMENDATIONS, params);
    return response.data;
  },

  async getPersonalizedRecommendations(userId: string): Promise<{ data: AIRecommendation[]; status: string; message: string }> {
    const response = await api.get(`${TEMPLATE_API.RECOMMENDATIONS}/${userId}`);
    return response.data;
  },

  async getSimilarTemplates(templateId: string, limit: number = 10): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/${templateId}/similar`, {
      params: { limit }
    });
    return response.data;
  },

  // Template Collections
  async getCollections(): Promise<{ data: TemplateCollection[]; status: string; message: string }> {
    const response = await api.get(TEMPLATE_API.COLLECTIONS);
    return response.data;
  },

  async getCollection(id: string): Promise<{ data: TemplateCollection; status: string; message: string }> {
    const response = await api.get(`${TEMPLATE_API.COLLECTIONS}/${id}`);
    return response.data;
  },

  async getCollectionTemplates(id: string): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.COLLECTIONS}/${id}/templates`);
    return response.data;
  },

  async createCollection(data: {
    name: string;
    description: string;
    template_ids: string[];
    is_public: boolean;
    tags: string[];
  }): Promise<{ data: TemplateCollection; status: string; message: string }> {
    const response = await api.post(TEMPLATE_API.COLLECTIONS, data);
    return response.data;
  },

  async updateCollection(id: string, data: Partial<TemplateCollection>): Promise<{ data: TemplateCollection; status: string; message: string }> {
    const response = await api.put(`${TEMPLATE_API.COLLECTIONS}/${id}`, data);
    return response.data;
  },

  async deleteCollection(id: string): Promise<{ status: string; message: string }> {
    const response = await api.delete(`${TEMPLATE_API.COLLECTIONS}/${id}`);
    return response.data;
  },

  // Template usage and analytics
  async recordTemplateView(templateId: string): Promise<void> {
    await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/view`);
  },

  async recordTemplateDownload(templateId: string): Promise<void> {
    await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/download`);
  },

  async recordTemplateUsage(templateId: string, usageData: {
    design_id?: string;
    completion_time?: number;
    customizations_made?: number;
    export_format?: string;
  }): Promise<void> {
    await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/usage`, usageData);
  },

  async rateTemplate(templateId: string, rating: number, review?: string): Promise<void> {
    await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/rate`, {
      rating,
      review
    });
  },

  async getTemplateAnalytics(templateId: string): Promise<TemplateAnalyticsResponse> {
    const response = await api.get(`${TEMPLATE_API.ANALYTICS}/${templateId}`);
    return response.data;
  },

  // Template customization
  async customizeTemplate(request: TemplateCustomizationRequest): Promise<{
    data: {
      customized_template: Template;
      ai_suggestions: any[];
      optimization_score: number;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(TEMPLATE_API.CUSTOMIZE, request);
    return response.data;
  },

  async getCustomizationSuggestions(templateId: string, context: {
    industry?: string;
    target_audience?: string;
    brand_colors?: string[];
    content_type?: string;
  }): Promise<{
    data: {
      suggestions: any[];
      predicted_improvements: any[];
      alternative_layouts: any[];
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.CUSTOMIZE}/${templateId}/suggestions`, context);
    return response.data;
  },

  async applyAIOptimizations(templateId: string, optimizations: {
    optimize_for: 'conversion' | 'engagement' | 'readability' | 'accessibility';
    target_audience?: string;
    performance_goals?: string[];
  }): Promise<{
    data: {
      optimized_template: Template;
      applied_changes: any[];
      performance_prediction: any;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/optimize`, optimizations);
    return response.data;
  },

  // Template export
  async exportTemplate(templateId: string, options: TemplateExportOptions): Promise<{
    data: {
      export_url: string;
      export_id: string;
      estimated_time: number;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.EXPORT}/${templateId}`, options);
    return response.data;
  },

  async getExportStatus(exportId: string): Promise<{
    data: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      download_url?: string;
      error?: string;
    };
    status: string;
    message: string;
  }> {
    const response = await api.get(`${TEMPLATE_API.EXPORT}/status/${exportId}`);
    return response.data;
  },

  async downloadTemplate(templateId: string, format: string = 'json'): Promise<Blob> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/${templateId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Template favorites and bookmarks
  async addToFavorites(templateId: string): Promise<void> {
    await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/favorite`);
  },

  async removeFromFavorites(templateId: string): Promise<void> {
    await api.delete(`${TEMPLATE_API.TEMPLATES}/${templateId}/favorite`);
  },

  async getFavoriteTemplates(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/favorites`);
    return response.data;
  },

  async getRecentlyViewed(): Promise<TemplateListResponse> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/recent`);
    return response.data;
  },

  // Template sharing
  async shareTemplate(templateId: string, shareData: {
    platform: string;
    message?: string;
    recipients?: string[];
  }): Promise<{
    data: {
      share_url: string;
      share_id: string;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/share`, shareData);
    return response.data;
  },

  async createTemplateLink(templateId: string, options: {
    expires_at?: string;
    password?: string;
    download_allowed?: boolean;
  }): Promise<{
    data: {
      public_url: string;
      link_id: string;
      expires_at?: string;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/link`, options);
    return response.data;
  },

  // AI-powered features
  async generateTemplateVariations(templateId: string, params: {
    variation_count: number;
    style_variations?: boolean;
    color_variations?: boolean;
    layout_variations?: boolean;
    content_variations?: boolean;
  }): Promise<{
    data: {
      variations: Template[];
      generation_insights: any[];
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/variations`, params);
    return response.data;
  },

  async analyzeTemplatePerformance(templateId: string): Promise<{
    data: {
      performance_score: number;
      attention_heatmap: any[];
      readability_analysis: any;
      conversion_predictions: any;
      optimization_suggestions: any[];
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/analyze`);
    return response.data;
  },

  async getAIInsights(templateId: string): Promise<{
    data: {
      design_quality_score: number;
      brand_alignment_score: number;
      accessibility_score: number;
      trends_alignment: any[];
      improvement_opportunities: any[];
      competitive_analysis: any[];
    };
    status: string;
    message: string;
  }> {
    const response = await api.get(`${TEMPLATE_API.TEMPLATES}/${templateId}/insights`);
    return response.data;
  },

  // Template creation and editing
  async createTemplateFromDesign(designData: any, metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    is_public: boolean;
  }): Promise<TemplateResponse> {
    const response = await api.post(TEMPLATE_API.TEMPLATES, {
      design_data: designData,
      ...metadata
    });
    return response.data;
  },

  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<TemplateResponse> {
    const response = await api.put(`${TEMPLATE_API.TEMPLATES}/${templateId}`, updates);
    return response.data;
  },

  async deleteTemplate(templateId: string): Promise<{ status: string; message: string }> {
    const response = await api.delete(`${TEMPLATE_API.TEMPLATES}/${templateId}`);
    return response.data;
  },

  // Bulk operations
  async bulkDownload(templateIds: string[], format: string = 'zip'): Promise<{
    data: {
      download_url: string;
      bulk_id: string;
      estimated_time: number;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/bulk/download`, {
      template_ids: templateIds,
      format
    });
    return response.data;
  },

  async bulkExport(templateIds: string[], options: TemplateExportOptions): Promise<{
    data: {
      export_url: string;
      bulk_export_id: string;
      estimated_time: number;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/bulk/export`, {
      template_ids: templateIds,
      export_options: options
    });
    return response.data;
  },

  // Template validation and quality checks
  async validateTemplate(templateData: any): Promise<{
    data: {
      is_valid: boolean;
      errors: any[];
      warnings: any[];
      suggestions: any[];
      quality_score: number;
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/validate`, {
      template_data: templateData
    });
    return response.data;
  },

  async runQualityCheck(templateId: string): Promise<{
    data: {
      overall_score: number;
      design_quality: number;
      performance_score: number;
      accessibility_score: number;
      brand_compliance: number;
      issues_found: any[];
      recommendations: any[];
    };
    status: string;
    message: string;
  }> {
    const response = await api.post(`${TEMPLATE_API.TEMPLATES}/${templateId}/quality-check`);
    return response.data;
  }
};

// Template utility functions
export const templateUtils = {
  // Calculate template similarity score
  calculateSimilarity(template1: Template, template2: Template): number {
    let score = 0;
    const factors = [
      { weight: 0.3, score: this.compareCategories(template1, template2) },
      { weight: 0.2, score: this.compareTags(template1, template2) },
      { weight: 0.2, score: this.compareStyles(template1, template2) },
      { weight: 0.15, score: this.compareDimensions(template1, template2) },
      { weight: 0.15, score: this.compareMetadata(template1, template2) }
    ];

    score = factors.reduce((total, factor) => total + (factor.weight * factor.score), 0);
    return Math.round(score * 100) / 100;
  },

  compareCategories(template1: Template, template2: Template): number {
    if (template1.category === template2.category) {
      return template1.subcategory === template2.subcategory ? 1 : 0.7;
    }
    return 0;
  },

  compareTags(template1: Template, template2: Template): number {
    const tags1 = new Set([...template1.tags, ...template1.ai_tags]);
    const tags2 = new Set([...template2.tags, ...template2.ai_tags]);
    const intersection = new Set([...tags1].filter(tag => tags2.has(tag)));
    const union = new Set([...tags1, ...tags2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  },

  compareStyles(template1: Template, template2: Template): number {
    if (template1.ai_metadata.style === template2.ai_metadata.style) {
      const moodSimilarity = this.arrayIntersection(
        template1.ai_metadata.mood,
        template2.ai_metadata.mood
      );
      return 0.7 + (moodSimilarity * 0.3);
    }
    return 0;
  },

  compareDimensions(template1: Template, template2: Template): number {
    const ratio1 = template1.dimensions.width / template1.dimensions.height;
    const ratio2 = template2.dimensions.width / template2.dimensions.height;
    const ratioSimilarity = 1 - Math.abs(ratio1 - ratio2) / Math.max(ratio1, ratio2);
    return Math.max(0, ratioSimilarity);
  },

  compareMetadata(template1: Template, template2: Template): number {
    const factors = [
      this.arrayIntersection(template1.ai_metadata.industry, template2.ai_metadata.industry),
      this.arrayIntersection(template1.ai_metadata.target_audience, template2.ai_metadata.target_audience),
      1 - Math.abs(template1.ai_metadata.complexity_score - template2.ai_metadata.complexity_score) / 10
    ];
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  },

  arrayIntersection(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  },

  // Format template for display
  formatTemplate(template: Template): Template {
    return {
      ...template,
      rating: Math.round(template.rating * 10) / 10,
      usage_count: this.formatNumber(template.usage_count),
      created_at: this.formatDate(template.created_at),
      updated_at: this.formatDate(template.updated_at)
    } as Template;
  },

  formatNumber(num: number): number {
    if (num >= 1000000) {
      return Math.round(num / 100000) / 10; // e.g., 1.2M
    } else if (num >= 1000) {
      return Math.round(num / 100) / 10; // e.g., 1.2K
    }
    return num;
  },

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  },

  // Extract colors from template
  extractColors(template: Template): string[] {
    const colors = new Set<string>();
    
    // Add colors from AI metadata
    template.ai_metadata.color_palette.forEach(color => colors.add(color));
    
    // Add colors from design data
    if (template.design_data.color_palette) {
      template.design_data.color_palette.forEach(color => colors.add(color));
    }

    return Array.from(colors);
  },

  // Get template complexity level
  getComplexityLevel(score: number): 'Simple' | 'Moderate' | 'Complex' | 'Advanced' {
    if (score <= 3) return 'Simple';
    if (score <= 5) return 'Moderate';
    if (score <= 7) return 'Complex';
    return 'Advanced';
  },

  // Generate template preview URL
  generatePreviewUrl(template: Template, options: {
    width?: number;
    height?: number;
    quality?: 'low' | 'medium' | 'high';
  } = {}): string {
    const { width = 400, height = 600, quality = 'medium' } = options;
    return `${template.preview_url}?w=${width}&h=${height}&q=${quality}`;
  },

  // Check if template is accessible
  isAccessible(template: Template): boolean {
    return template.ai_metadata.accessibility_score >= 0.8;
  },

  // Check if template is brand-safe
  isBrandSafe(template: Template): boolean {
    return template.ai_metadata.brand_safety_score >= 0.9;
  },

  // Get template performance prediction
  getPerformancePrediction(template: Template): 'Low' | 'Medium' | 'High' | 'Excellent' {
    const score = template.ai_metadata.engagement_prediction;
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  }
};

export default templateService;