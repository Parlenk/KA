/**
 * Simplified AI Service - Working Version for Deployment
 */

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processing_time: number;
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

class SimpleAIService {
  async generateText(request: TextGenerationRequest): Promise<AIResponse<TextGenerationResult>> {
    try {
      const response = await fetch('/api/ai-generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: 0,
      };
    }
  }

  async checkHealth(): Promise<any> {
    return { status: 'ok' };
  }
}

export const aiService = new SimpleAIService();
export default aiService;