/**
 * AI Service Client - Real API Integration
 * Connects frontend to Python FastAPI AI service with best AI resizer
 */

const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8000';

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processing_time: number;
  cached?: boolean;
}

export interface SmartResizeRequest {
  image_data: string;
  target_width: number;
  target_height: number;
  maintain_aspect?: boolean;
  enhance_quality?: boolean;
  background_fill?: string;
}

export interface SmartResizeResult {
  image: string;
  original_size: { width: number; height: number };
  new_size: { width: number; height: number };
  enhancement_applied: boolean;
}

export interface TextGenerationRequest {
  prompt: string;
  tone?: string;
  max_length?: number;
  variations?: number;
}

export interface TextGenerationResult {
  texts: string[];
  tone: string;
  prompt: string;
}

export interface BackgroundRemovalResult {
  image: string;
  original_size: { width: number; height: number };
}

class AIServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<AIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (\!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`AI Service error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: 0,
      };
    }
  }

  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('AI Service health check failed:', error);
      return { status: 'unavailable', error: error.message };
    }
  }

  /**
   * Best AI image resizer using Real-ESRGAN
   */
  async smartResize(request: SmartResizeRequest): Promise<AIResponse<SmartResizeResult>> {
    console.log('🎯 AI Smart Resize:', {
      targetSize: `${request.target_width}x${request.target_height}`,
      maintainAspect: request.maintain_aspect,
      enhanceQuality: request.enhance_quality
    });

    return await this.makeRequest<SmartResizeResult>('/ai/smart-resize', request);
  }

  /**
   * Professional background removal
   */
  async removeBackground(imageData: string): Promise<AIResponse<BackgroundRemovalResult>> {
    console.log('🎭 AI Background Removal started');
    return await this.makeRequest<BackgroundRemovalResult>('/ai/remove-background', {
      image_data: imageData,
      operation: 'remove_background'
    });
  }

  /**
   * AI text generation using GPT-4
   */
  async generateText(request: TextGenerationRequest): Promise<AIResponse<TextGenerationResult>> {
    console.log('✨ AI Text Generation:', request);
    return await this.makeRequest<TextGenerationResult>('/ai/generate-text', request);
  }

  canvasToBase64(canvas: any): string {
    try {
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1
      });
      return dataURL.split(',')[1];
    } catch (error) {
      console.error('Failed to convert canvas to base64:', error);
      throw new Error('Canvas conversion failed');
    }
  }
}

export const aiService = new AIServiceClient();
export default aiService;
EOF < /dev/null