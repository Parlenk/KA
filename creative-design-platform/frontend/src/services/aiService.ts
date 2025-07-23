import axios from 'axios';

// AI Service Configuration
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

const aiApi = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes for AI operations
});

// Types for AI Service
export interface ImageGenerationRequest {
  prompt: string;
  style: 'realistic' | 'digital-art' | '3d-model' | 'isometric' | 'pixel-art' | 'anime' | 'vaporwave';
  width?: number;
  height?: number;
  batch_size?: number;
  seed?: number;
  negative_prompt?: string;
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  seed?: number;
}

export interface ImageGenerationResponse {
  images: GeneratedImage[];
  prompt: string;
  style: string;
  job_id: string;
}

export interface BackgroundRemovalRequest {
  image_url: string;
  edge_refinement?: boolean;
  content_type?: string;
}

export interface BackgroundRemovalResponse {
  result_url: string;
  original_url: string;
  job_id: string;
}

export interface TextGenerationRequest {
  context: string;
  tone: 'friendly' | 'formal' | 'casual' | 'professional' | 'optimistic' | 'confident' | 'assertive' | 'emotional' | 'serious' | 'humorous';
  format_type: 'headline' | 'subheading' | 'body' | 'cta' | 'tagline' | 'social' | 'email_subject' | 'ad_copy';
  max_length?: number;
  target_audience?: string;
  variation_count?: number;
}

export interface GeneratedText {
  text: string;
  confidence_score: number;
}

export interface TextGenerationResponse {
  variations: GeneratedText[];
  context: string;
  tone: string;
  job_id: string;
}

export interface AnimationGenerationRequest {
  design_elements: Array<{
    id: string;
    type: string;
    content?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  }>;
  style: 'smooth' | 'bouncy' | 'elastic' | 'dramatic' | 'subtle' | 'energetic' | 'professional' | 'playful';
  purpose: 'attention' | 'engagement' | 'conversion' | 'branding' | 'storytelling' | 'product_showcase';
  duration_seconds?: number;
  context?: any;
}

export interface AnimationResponse {
  animations: Array<{
    element_id: string;
    type: string;
    name: string;
    keyframes: any[];
    duration: number;
    easing: string;
    delay: number;
    properties: string[];
    repeat: string;
    confidence_score: number;
  }>;
  strategy: any;
  insights: any;
  total_duration: number;
  style: string;
  purpose: string;
  job_id: string;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentAnalysisRequest {
  text: string;
}

export interface ContentAnalysisResponse {
  analysis: {
    readability: number;
    sentiment: any;
    power_words: Record<string, string[]>;
    emotional_triggers: string[];
    call_to_action_strength: number;
    keyword_density: Record<string, number>;
    length_optimization: any;
    tone_consistency: any;
    conversion_potential: number;
  };
  suggestions: string[];
  overall_score: number;
  optimization_priority: Array<{
    priority: string;
    area: string;
    impact: string;
    effort: string;
  }>;
  job_id: string;
}

export interface ABTestRequest {
  context: string;
  format_type: string;
  tone: string;
  test_type?: 'emotional_vs_rational' | 'benefit_vs_feature' | 'urgency_vs_value' | 'question_vs_statement' | 'long_vs_short';
  variations_per_approach?: number;
}

export interface ABTestResponse {
  variations: Record<string, GeneratedText[]>;
  test_type: string;
  recommended_winner: string;
  job_id: string;
}

// AI Service Client
export const aiService = {
  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await aiApi.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('AI Service health check failed:', error);
      return false;
    }
  },

  // Image Generation
  async generateImages(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const response = await aiApi.post('/api/v1/generate/images', request);
    return response.data;
  },

  async generateImageWithReference(
    prompt: string,
    referenceImageUrl: string,
    style: string,
    strength: number = 0.7
  ): Promise<GeneratedImage> {
    const response = await aiApi.post('/api/v1/generate/images/with-reference', {
      prompt,
      reference_image_url: referenceImageUrl,
      style,
      strength,
    });
    return response.data;
  },

  async upscaleImage(imageUrl: string, scaleFactor: number = 2, enhanceFace: boolean = false): Promise<GeneratedImage> {
    const response = await aiApi.post('/api/v1/generate/images/upscale', {
      image_url: imageUrl,
      scale_factor: scaleFactor,
      enhance_face: enhanceFace,
    });
    return response.data;
  },

  async inpaintImage(
    imageUrl: string,
    maskUrl: string,
    prompt: string,
    style: string
  ): Promise<GeneratedImage> {
    const response = await aiApi.post('/api/v1/generate/images/inpaint', {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt,
      style,
    });
    return response.data;
  },

  // Background Processing
  async removeBackground(request: BackgroundRemovalRequest): Promise<BackgroundRemovalResponse> {
    const response = await aiApi.post('/api/v1/process/remove-background', request);
    return response.data;
  },

  async batchRemoveBackground(
    imageUrls: string[],
    contentType: string = 'auto'
  ): Promise<{
    results: Array<{ original_url: string; result_url: string | null; success: boolean; error?: string }>;
    total_processed: number;
    successful: number;
    failed: number;
    success_rate: number;
    job_id: string;
  }> {
    const response = await aiApi.post('/api/v1/process/batch-background-removal', {
      image_urls: imageUrls,
      content_type: contentType,
    });
    return response.data;
  },

  async advancedSegmentation(
    imageUrl: string,
    promptPoints: Array<[number, number]>,
    promptLabels: number[]
  ): Promise<{
    result_url: string;
    original_url: string;
    job_id: string;
    method: string;
  }> {
    const response = await aiApi.post('/api/v1/process/advanced-segmentation', {
      image_url: imageUrl,
      prompt_points: promptPoints,
      prompt_labels: promptLabels,
    });
    return response.data;
  },

  async detectObjects(imageUrl: string): Promise<{
    detected_objects: Array<{
      label: string;
      confidence: number;
      box: number[];
    }>;
    analysis: {
      total_objects: number;
      object_types: string[];
      high_confidence_objects: any[];
      recommended_processing: string;
      scene_complexity: string;
    };
    job_id: string;
  }> {
    const response = await aiApi.post('/api/v1/process/smart-object-detection', {
      image_url: imageUrl,
    });
    return response.data;
  },

  // Text Generation
  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const response = await aiApi.post('/api/v1/generate/text', request);
    return response.data;
  },

  async generateABTestVariations(request: ABTestRequest): Promise<ABTestResponse> {
    const response = await aiApi.post('/api/v1/generate/text/ab-test', request);
    return response.data;
  },

  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResponse> {
    const response = await aiApi.post('/api/v1/generate/text/content-analysis', request);
    return response.data;
  },

  async generateIndustryOptimizedCopy(
    context: string,
    industry: string,
    formatType: string,
    tone: string,
    targetAudience?: string
  ): Promise<TextGenerationResponse> {
    const response = await aiApi.post('/api/v1/generate/text/industry-optimized', {
      context,
      industry,
      format_type: formatType,
      tone,
      target_audience: targetAudience,
    });
    return response.data;
  },

  // Animation Generation
  async generateSmartAnimations(request: AnimationGenerationRequest): Promise<AnimationResponse> {
    const response = await aiApi.post('/api/v1/animate/smart-generate', request);
    return response.data;
  },

  async optimizeAnimations(
    currentAnimations: any[],
    performanceGoals: any,
    context?: any
  ): Promise<{
    optimized_animations: any[];
    optimization_opportunities: any[];
    improvement_metrics: any;
    recommendations: string[];
    job_id: string;
  }> {
    const response = await aiApi.post('/api/v1/animate/optimize', {
      current_animations: currentAnimations,
      performance_goals: performanceGoals,
      context,
    });
    return response.data;
  },

  async generateAnimationVariations(
    baseAnimation: any,
    variationCount: number = 5,
    creativityLevel: number = 0.7
  ): Promise<{
    variations: Array<{
      effectiveness_score: number;
      creativity_score: number;
      [key: string]: any;
    }>;
    total_generated: number;
  }> {
    const response = await aiApi.post('/api/v1/animate/variations', {
      base_animation: baseAnimation,
      variation_count: variationCount,
      creativity_level: creativityLevel,
    });
    return response.data;
  },

  async generateContextualPresets(
    industry: string,
    brandPersonality: string[],
    targetAudience: any,
    contentType: string
  ): Promise<{
    presets: any[];
    recommended_styles: any[];
    context_analysis: any;
    usage_guidelines: any;
    industry: string;
    content_type: string;
    job_id: string;
  }> {
    const response = await aiApi.post('/api/v1/animate/contextual-presets', {
      industry,
      brand_personality: brandPersonality,
      target_audience: targetAudience,
      content_type: contentType,
    });
    return response.data;
  },

  // Translation
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto',
    preserveFormatting: boolean = true
  ): Promise<{
    translated_text: string;
    source_language: string;
    target_language: string;
    confidence_score: number;
    job_id: string;
  }> {
    const response = await aiApi.post('/api/v1/translate', {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      preserve_formatting: preserveFormatting,
    });
    return response.data;
  },

  // Job Status Tracking
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await aiApi.get(`/api/v1/jobs/${jobId}`);
    return response.data;
  },

  // Service Information
  async getAvailableStyles(): Promise<{
    styles: Array<{
      id: string;
      name: string;
      description: string;
    }>;
  }> {
    const response = await aiApi.get('/api/v1/info/styles');
    return response.data;
  },

  async getServiceLimits(): Promise<{
    image_generation: {
      max_width: number;
      max_height: number;
      min_width: number;
      min_height: number;
      max_batch_size: number;
      supported_formats: string[];
    };
    rate_limits: {
      requests_per_minute: number;
      max_concurrent_jobs: number;
    };
  }> {
    const response = await aiApi.get('/api/v1/info/limits');
    return response.data;
  },
};

// Utility Functions
export const aiUtils = {
  // Poll job status until completion
  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (progress: number) => void,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<JobStatus> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await aiService.getJobStatus(jobId);
        
        if (onProgress) {
          onProgress(status.progress);
        }
        
        if (status.status === 'completed') {
          return status;
        }
        
        if (status.status === 'failed') {
          throw new Error(status.error || 'Job failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      }
    }
    
    throw new Error('Job polling timeout');
  },

  // Validate image dimensions
  validateImageDimensions(width: number, height: number): { valid: boolean; message?: string } {
    if (width < 256 || height < 256) {
      return { valid: false, message: 'Minimum dimensions are 256x256' };
    }
    if (width > 2048 || height > 2048) {
      return { valid: false, message: 'Maximum dimensions are 2048x2048' };
    }
    return { valid: true };
  },

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate unique request ID
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};

export default aiService;