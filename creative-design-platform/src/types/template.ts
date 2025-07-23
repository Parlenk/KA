// Template system types

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  preview_url: string;
  category: string;
  subcategory: string;
  tags: string[];
  ai_tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  usage_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  is_premium: boolean;
  is_trending: boolean;
  is_new: boolean;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
    followers?: number;
  };
  design_data: TemplateDesignData;
  ai_metadata: AITemplateMetadata;
  pricing?: {
    free: boolean;
    premium_price?: number;
    credits_required?: number;
  };
  license: {
    type: 'free' | 'premium' | 'exclusive';
    commercial_use: boolean;
    attribution_required: boolean;
    modifications_allowed: boolean;
  };
  performance_metrics?: {
    view_count: number;
    download_count: number;
    conversion_rate: number;
    average_rating: number;
    completion_rate: number;
  };
}

export interface TemplateDesignData {
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  objects: DesignObject[];
  fonts: FontData[];
  color_palette: string[];
  version: string;
  created_with: string;
}

export interface DesignObject {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon' | 'background';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  properties: Record<string, any>;
  animations?: AnimationData[];
  constraints?: LayoutConstraints;
}

export interface FontData {
  family: string;
  variants: string[];
  source: 'google' | 'system' | 'custom';
  url?: string;
}

export interface AnimationData {
  id: string;
  type: string;
  keyframes: Keyframe[];
  duration: number;
  easing: string;
  delay: number;
  iterations: number | 'infinite';
}

export interface Keyframe {
  time: number;
  properties: Record<string, any>;
}

export interface LayoutConstraints {
  pinned_edges?: ('top' | 'bottom' | 'left' | 'right')[];
  maintain_aspect_ratio?: boolean;
  min_width?: number;
  min_height?: number;
  max_width?: number;
  max_height?: number;
}

export interface AITemplateMetadata {
  style: string;
  color_palette: string[];
  complexity_score: number;
  conversion_prediction: number;
  target_audience: string[];
  industry: string[];
  mood: string[];
  visual_weight: number;
  readability_score: number;
  accessibility_score: number;
  trend_alignment: number;
  brand_safety_score: number;
  engagement_prediction: number;
  attention_zones: AttentionZone[];
  content_suggestions: ContentSuggestion[];
  optimization_opportunities: OptimizationOpportunity[];
}

export interface AttentionZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attention_score: number;
  element_type: string;
  importance: 'primary' | 'secondary' | 'tertiary';
}

export interface ContentSuggestion {
  element_id: string;
  suggestion_type: 'text' | 'image' | 'color' | 'layout';
  suggestion: string;
  confidence: number;
  impact_score: number;
}

export interface OptimizationOpportunity {
  area: string;
  description: string;
  potential_improvement: number;
  effort_required: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  subcategories: TemplateSubcategory[];
  template_count: number;
  trending: boolean;
  featured_templates: string[]; // Template IDs
  ai_tags: string[];
  target_industries: string[];
}

export interface TemplateSubcategory {
  id: string;
  name: string;
  description: string;
  template_count: number;
  standard_dimensions: Array<{
    width: number;
    height: number;
    name: string;
  }>;
}

export interface TemplateFilter {
  categories: string[];
  subcategories: string[];
  tags: string[];
  formats: string[];
  dimensions: Array<{
    width: number;
    height: number;
  }>;
  price_range: {
    min: number;
    max: number;
  };
  rating_min: number;
  complexity_range: [number, number];
  conversion_rate_min: number;
  is_premium?: boolean;
  is_trending?: boolean;
  is_new?: boolean;
  created_after?: string;
  updated_after?: string;
  industries: string[];
  styles: string[];
  moods: string[];
  target_audiences: string[];
}

export interface TemplateSearchQuery {
  query: string;
  filters: Partial<TemplateFilter>;
  sort_by: 'relevance' | 'trending' | 'popular' | 'newest' | 'rating' | 'conversion_rate';
  sort_order: 'asc' | 'desc';
  page: number;
  per_page: number;
}

export interface TemplateSearchResult {
  templates: Template[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  facets: SearchFacets;
  ai_recommendations?: AIRecommendation[];
  search_suggestions?: string[];
}

export interface SearchFacets {
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  styles: Array<{ name: string; count: number }>;
  industries: Array<{ name: string; count: number }>;
  price_ranges: Array<{ range: string; count: number }>;
  rating_ranges: Array<{ range: string; count: number }>;
}

export interface AIRecommendation {
  template_id: string;
  reason: string;
  confidence: number;
  match_factors: RecommendationFactor[];
  similarity_score: number;
  predicted_performance: number;
}

export interface RecommendationFactor {
  factor: string;
  description: string;
  weight: number;
  score: number;
}

export interface TemplateUsageAnalytics {
  template_id: string;
  views: number;
  downloads: number;
  completions: number;
  ratings: Array<{
    rating: number;
    count: number;
  }>;
  geographic_usage: Array<{
    country: string;
    usage_count: number;
  }>;
  industry_usage: Array<{
    industry: string;
    usage_count: number;
  }>;
  performance_over_time: Array<{
    date: string;
    views: number;
    downloads: number;
    rating: number;
  }>;
}

export interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  template_ids: string[];
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
  category: string;
}

export interface TemplateCustomizationRequest {
  template_id: string;
  customizations: TemplateCustomization[];
  target_format?: {
    width: number;
    height: number;
  };
  brand_guidelines?: {
    colors: string[];
    fonts: string[];
    logo_url?: string;
    brand_voice?: string;
  };
  content_preferences?: {
    industry: string;
    target_audience: string;
    tone: string;
    keywords: string[];
  };
}

export interface TemplateCustomization {
  element_id: string;
  customization_type: 'text' | 'image' | 'color' | 'font' | 'size' | 'position';
  value: any;
  ai_generated?: boolean;
  confidence_score?: number;
}

export interface TemplateExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'gif' | 'mp4';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  dimensions?: {
    width: number;
    height: number;
  };
  background_color?: string;
  include_bleed?: boolean;
  color_profile?: 'sRGB' | 'CMYK' | 'P3';
  optimization?: {
    compress: boolean;
    progressive: boolean;
    strip_metadata: boolean;
  };
}

// API Response types
export interface TemplateResponse {
  data: Template;
  message: string;
  status: 'success' | 'error';
}

export interface TemplateListResponse {
  data: Template[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  message: string;
  status: 'success' | 'error';
}

export interface TemplateSearchResponse {
  data: TemplateSearchResult;
  message: string;
  status: 'success' | 'error';
}

export interface TemplateAnalyticsResponse {
  data: TemplateUsageAnalytics;
  message: string;
  status: 'success' | 'error';
}