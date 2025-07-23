import { useState, useCallback, useRef } from 'react';
import { aiService, aiUtils } from '../services/aiService';

export interface AIJob {
  id: string;
  type: 'image' | 'text' | 'animation' | 'background' | 'analysis' | 'enhancement';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

export interface AICapability {
  id: string;
  name: string;
  description: string;
  category: 'generate' | 'enhance' | 'analyze';
  icon: string;
  available: boolean;
  requiresSelection?: boolean;
  requiresInput?: boolean;
}

interface UseAIAssistantReturn {
  // State
  isOpen: boolean;
  isConnected: boolean;
  activeJobs: AIJob[];
  capabilities: AICapability[];
  
  // Actions
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  
  // AI Operations
  generateImage: (prompt: string, options?: any) => Promise<any>;
  generateText: (context: string, options?: any) => Promise<any>;
  removeBackground: (imageUrl: string, options?: any) => Promise<any>;
  analyzeContent: (text: string) => Promise<any>;
  generateAnimation: (elements: any[], options?: any) => Promise<any>;
  
  // Job Management
  getJob: (id: string) => AIJob | undefined;
  cancelJob: (id: string) => void;
  clearCompletedJobs: () => void;
  
  // Utility
  checkAIServiceHealth: () => Promise<boolean>;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeJobs, setActiveJobs] = useState<AIJob[]>([]);
  const jobCounterRef = useRef(0);

  // AI Capabilities configuration
  const capabilities: AICapability[] = [
    // Generate category
    {
      id: 'generate-image',
      name: 'AI Image Generation',
      description: 'Create stunning images from text descriptions',
      category: 'generate',
      icon: 'image',
      available: true,
      requiresInput: true,
    },
    {
      id: 'generate-text',
      name: 'Smart Copywriting',
      description: 'Generate compelling headlines, descriptions, and CTAs',
      category: 'generate',
      icon: 'type',
      available: true,
      requiresInput: true,
    },
    {
      id: 'generate-animation',
      name: 'Magic Animator',
      description: 'Create professional animations automatically',
      category: 'generate',
      icon: 'zap',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'generate-variations',
      name: 'Design Variations',
      description: 'Create multiple versions of your design',
      category: 'generate',
      icon: 'refresh',
      available: true,
      requiresSelection: true,
    },

    // Enhance category
    {
      id: 'remove-background',
      name: 'Background Removal',
      description: 'Remove backgrounds with AI precision',
      category: 'enhance',
      icon: 'scissors',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'upscale-image',
      name: 'AI Upscaling',
      description: 'Enhance image quality and resolution',
      category: 'enhance',
      icon: 'maximize',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'enhance-text',
      name: 'Content Optimization',
      description: 'Improve text for better conversion',
      category: 'enhance',
      icon: 'edit',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'smart-crop',
      name: 'Smart Cropping',
      description: 'Intelligently crop and resize images',
      category: 'enhance',
      icon: 'crop',
      available: true,
      requiresSelection: true,
    },

    // Analyze category
    {
      id: 'analyze-content',
      name: 'Content Analysis',
      description: 'Analyze text effectiveness and readability',
      category: 'analyze',
      icon: 'bar-chart',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'design-feedback',
      name: 'Design Feedback',
      description: 'Get AI-powered design recommendations',
      category: 'analyze',
      icon: 'lightbulb',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'performance-prediction',
      name: 'Performance Prediction',
      description: 'Predict how your design will perform',
      category: 'analyze',
      icon: 'trending-up',
      available: true,
      requiresSelection: true,
    },
    {
      id: 'ab-test-generator',
      name: 'A/B Test Generator',
      description: 'Create variations for testing',
      category: 'analyze',
      icon: 'split',
      available: true,
      requiresInput: true,
    },
  ];

  // Create a new job
  const createJob = useCallback((
    type: AIJob['type'],
    additionalData?: Partial<AIJob>
  ): string => {
    const id = `job_${++jobCounterRef.current}_${Date.now()}`;
    const newJob: AIJob = {
      id,
      type,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
      ...additionalData,
    };

    setActiveJobs(prev => [...prev, newJob]);
    return id;
  }, []);

  // Update job
  const updateJob = useCallback((id: string, updates: Partial<AIJob>) => {
    setActiveJobs(prev => prev.map(job => 
      job.id === id ? { ...job, ...updates } : job
    ));
  }, []);

  // Get job by ID
  const getJob = useCallback((id: string): AIJob | undefined => {
    return activeJobs.find(job => job.id === id);
  }, [activeJobs]);

  // Cancel job
  const cancelJob = useCallback((id: string) => {
    updateJob(id, { status: 'failed', error: 'Cancelled by user', endTime: Date.now() });
  }, [updateJob]);

  // Clear completed jobs
  const clearCompletedJobs = useCallback(() => {
    setActiveJobs(prev => prev.filter(job => 
      job.status !== 'completed' && job.status !== 'failed'
    ));
  }, []);

  // Assistant controls
  const openAssistant = useCallback(() => setIsOpen(true), []);
  const closeAssistant = useCallback(() => setIsOpen(false), []);
  const toggleAssistant = useCallback(() => setIsOpen(prev => !prev), []);

  // Check AI service health
  const checkAIServiceHealth = useCallback(async (): Promise<boolean> => {
    try {
      const isHealthy = await aiService.healthCheck();
      setIsConnected(isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('AI service health check failed:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Generate Image
  const generateImage = useCallback(async (
    prompt: string,
    options: {
      style?: string;
      width?: number;
      height?: number;
      batchSize?: number;
      seed?: number;
    } = {}
  ) => {
    const jobId = createJob('image');
    
    try {
      updateJob(jobId, { status: 'processing', progress: 10 });

      const result = await aiService.generateImages({
        prompt,
        style: (options.style || 'realistic') as any,
        width: options.width || 1024,
        height: options.height || 1024,
        batch_size: options.batchSize || 1,
        seed: options.seed,
      });

      // Poll for completion if needed
      if (result.job_id) {
        await aiUtils.pollJobUntilComplete(
          result.job_id,
          (progress) => updateJob(jobId, { progress }),
          60,
          2000
        );
      }

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
        endTime: Date.now(),
      });

      return result;

    } catch (error) {
      console.error('Image generation failed:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
      });
      throw error;
    }
  }, [createJob, updateJob]);

  // Generate Text
  const generateText = useCallback(async (
    context: string,
    options: {
      tone?: string;
      formatType?: string;
      maxLength?: number;
      targetAudience?: string;
      variationCount?: number;
    } = {}
  ) => {
    const jobId = createJob('text');
    
    try {
      updateJob(jobId, { status: 'processing', progress: 10 });

      const result = await aiService.generateText({
        context,
        tone: (options.tone || 'professional') as any,
        format_type: (options.formatType || 'body') as any,
        max_length: options.maxLength,
        target_audience: options.targetAudience,
        variation_count: options.variationCount || 3,
      });

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
        endTime: Date.now(),
      });

      return result;

    } catch (error) {
      console.error('Text generation failed:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
      });
      throw error;
    }
  }, [createJob, updateJob]);

  // Remove Background
  const removeBackground = useCallback(async (
    imageUrl: string,
    options: {
      edgeRefinement?: boolean;
      contentType?: string;
    } = {}
  ) => {
    const jobId = createJob('background');
    
    try {
      updateJob(jobId, { status: 'processing', progress: 10 });

      const result = await aiService.removeBackground({
        image_url: imageUrl,
        edge_refinement: options.edgeRefinement,
        content_type: options.contentType,
      });

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
        endTime: Date.now(),
      });

      return result;

    } catch (error) {
      console.error('Background removal failed:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
      });
      throw error;
    }
  }, [createJob, updateJob]);

  // Analyze Content
  const analyzeContent = useCallback(async (text: string) => {
    const jobId = createJob('analysis');
    
    try {
      updateJob(jobId, { status: 'processing', progress: 10 });

      const result = await aiService.analyzeContent({ text });

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
        endTime: Date.now(),
      });

      return result;

    } catch (error) {
      console.error('Content analysis failed:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
      });
      throw error;
    }
  }, [createJob, updateJob]);

  // Generate Animation
  const generateAnimation = useCallback(async (
    elements: any[],
    options: {
      style?: string;
      purpose?: string;
      duration?: number;
      context?: any;
    } = {}
  ) => {
    const jobId = createJob('animation');
    
    try {
      updateJob(jobId, { status: 'processing', progress: 10 });

      const result = await aiService.generateSmartAnimations({
        design_elements: elements,
        style: (options.style || 'smooth') as any,
        purpose: (options.purpose || 'engagement') as any,
        duration_seconds: options.duration || 5.0,
        context: options.context,
      });

      updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
        endTime: Date.now(),
      });

      return result;

    } catch (error) {
      console.error('Animation generation failed:', error);
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        endTime: Date.now(),
      });
      throw error;
    }
  }, [createJob, updateJob]);

  return {
    // State
    isOpen,
    isConnected,
    activeJobs,
    capabilities,
    
    // Actions
    openAssistant,
    closeAssistant,
    toggleAssistant,
    
    // AI Operations
    generateImage,
    generateText,
    removeBackground,
    analyzeContent,
    generateAnimation,
    
    // Job Management
    getJob,
    cancelJob,
    clearCompletedJobs,
    
    // Utility
    checkAIServiceHealth,
  };
};