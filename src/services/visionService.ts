/**
 * Vision Service - Image Understanding with OpenRouter Vision Models
 * Analyzes images in tweets to provide richer context for AI replies
 */

import { StorageService } from './storage';
import { ConfigurationManager } from '@/config/configurationManager';

// Hardcoded API configuration
const API_CONFIG = {
  OPENROUTER_API_KEY: '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',
  BASE_URL: 'https://openrouter.ai/api/v1',
  HEADERS: {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://tweetcraft.ai/extension',
    'X-Title': 'TweetCraft - AI Reply Assistant v0.0.12'
  }
};

export interface VisionAnalysisResult {
  success: boolean;
  description?: string;
  objects?: string[];
  text?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  context?: string;
  error?: string;
}

export interface VisionModelConfig {
  model: string;
  enabled: boolean;
  maxImagesPerRequest: number;
  costPerImage: number; // in credits/cents
}

export class VisionService {
  private static instance: VisionService;
  private apiKey: string | null = null;
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  // Vision-capable models on OpenRouter
  private readonly visionModels: Record<string, { id: string; name: string; maxTokens: number; costPer1k: number }> = {
    'gpt-4-vision': {
      id: 'openai/gpt-4-vision-preview',
      name: 'GPT-4 Vision',
      maxTokens: 4096,
      costPer1k: 0.01
    },
    'claude-3-sonnet': {
      id: 'anthropic/claude-3-sonnet:beta',
      name: 'Claude 3 Sonnet',
      maxTokens: 4096,
      costPer1k: 0.003
    },
    'claude-3-haiku': {
      id: 'anthropic/claude-3-haiku:beta',
      name: 'Claude 3 Haiku',
      maxTokens: 4096,
      costPer1k: 0.00025
    },
    'gemini-pro-vision': {
      id: 'google/gemini-pro-vision',
      name: 'Gemini Pro Vision',
      maxTokens: 2048,
      costPer1k: 0.00025
    }
  };

  private defaultModel = 'gemini-pro-vision'; // Most cost-effective

  private constructor() {}

  static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  /**
   * Initialize the service with API key
   */
  async initialize(): Promise<void> {
    // Get API key directly from storage service
    // Use hardcoded API key
    this.apiKey = API_CONFIG.OPENROUTER_API_KEY;
    
    if (!this.apiKey || this.apiKey === 'sk-or-v1-YOUR_API_KEY_HERE') {
      console.log('%c⚠️ Vision Service: API key not configured in apiConfig.ts', 'color: #FFA500');
      this.apiKey = null;
    } else {
      console.log('%c✅ Vision Service: API key loaded', 'color: #17BF63');
    }
  }

  /**
   * Check if vision analysis is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await ConfigurationManager.getInstance().getConfig();
    return config.features?.imageUnderstanding?.enabled ?? false;
  }

  /**
   * Analyze images and return contextual description
   */
  async analyzeImages(imageUrls: string[], tweetText?: string): Promise<VisionAnalysisResult> {
    // Check if enabled
    if (!await this.isEnabled()) {
      return {
        success: false,
        error: 'Image understanding is disabled in settings'
      };
    }

    // Initialize if needed
    if (!this.apiKey) {
      await this.initialize();
      if (!this.apiKey) {
        return {
          success: false,
          error: 'No API key configured'
        };
      }
    }

    // Limit number of images to analyze (cost control)
    const maxImages = await this.getMaxImagesPerRequest();
    const imagesToAnalyze = imageUrls.slice(0, maxImages);

    console.log('%c👁️ Vision Analysis', 'color: #794BC4; font-weight: bold');
    console.log('%c  Images to analyze:', 'color: #657786', imagesToAnalyze.length);

    try {
      const modelConfig = await this.getModelConfig();
      const model = this.visionModels[modelConfig.model] || this.visionModels[this.defaultModel];

      // Prepare the prompt for vision analysis
      const prompt = this.buildVisionPrompt(tweetText);

      // Build the message with images
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            ...imagesToAnalyze.map(url => ({
              type: 'image_url',
              image_url: {
                url: url,
                detail: 'auto' // Let the model decide the detail level
              }
            }))
          ]
        }
      ];

      // Make the API call
      const response = await this.callVisionAPI(model.id, messages);

      if (response.success && response.content) {
        const analysis = this.parseVisionResponse(response.content);
        console.log('%c✅ Vision analysis complete', 'color: #17BF63');
        console.log('%c  Description:', 'color: #657786', analysis.description?.substring(0, 100) + '...');
        return analysis;
      } else {
        console.error('Vision API error:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to analyze images'
        };
      }

    } catch (error) {
      console.error('Vision service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build the vision analysis prompt
   */
  private buildVisionPrompt(tweetText?: string): string {
    let prompt = `Analyze these images and provide a concise description for understanding the context of a Twitter conversation.

Focus on:
1. What's shown in the image(s)
2. Any text visible in the images
3. The overall sentiment or mood
4. Key objects, people, or scenes
5. Any memes, jokes, or cultural references

Keep the description under 150 words and focus on details relevant for crafting a contextual reply.`;

    if (tweetText) {
      prompt += `\n\nThe tweet text accompanying these images is: "${tweetText}"`;
      prompt += `\nConsider how the images relate to or enhance the tweet text.`;
    }

    prompt += `\n\nProvide the analysis in this JSON format:
{
  "description": "overall description of what's shown",
  "objects": ["list", "of", "key", "objects"],
  "text": "any text visible in the images",
  "sentiment": "positive/neutral/negative",
  "context": "relevant context for replying to this tweet"
}`;

    return prompt;
  }

  /**
   * Call the vision API
   */
  private async callVisionAPI(modelId: string, messages: any[]): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      // Use service worker for CSP compliance
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_IMAGES',
        modelId,
        messages
      });

      if (response.success && response.content) {
        return { success: true, content: response.content };
      } else {
        return { 
          success: false, 
          error: response.error || 'Failed to analyze images' 
        };
      }

    } catch (error) {
      console.error('Vision API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Parse the vision API response
   */
  private parseVisionResponse(content: string): VisionAnalysisResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          description: parsed.description || content,
          objects: parsed.objects || [],
          text: parsed.text || undefined,
          sentiment: parsed.sentiment || 'neutral',
          context: parsed.context || parsed.description
        };
      }

      // Fallback to plain text
      return {
        success: true,
        description: content,
        context: content,
        sentiment: 'neutral'
      };

    } catch (error) {
      // If parsing fails, return the raw content
      return {
        success: true,
        description: content,
        context: content,
        sentiment: 'neutral'
      };
    }
  }

  /**
   * Get configured vision model
   */
  private async getModelConfig(): Promise<{ model: string }> {
    const config = await ConfigurationManager.getInstance().getConfig();
    const visionModel = config.features?.imageUnderstanding?.model || this.defaultModel;
    
    // Validate model exists
    if (!this.visionModels[visionModel]) {
      console.warn(`Invalid vision model ${visionModel}, using default`);
      return { model: this.defaultModel };
    }

    return { model: visionModel };
  }

  /**
   * Get max images per request (cost control)
   */
  private async getMaxImagesPerRequest(): Promise<number> {
    const config = await ConfigurationManager.getInstance().getConfig();
    return config.features?.imageUnderstanding?.maxImagesPerRequest || 2; // Default to 2 images
  }

  /**
   * Format vision context for inclusion in reply prompt
   */
  static formatVisionContext(analysis: VisionAnalysisResult): string {
    if (!analysis.success || !analysis.description) {
      return '';
    }

    let context = `\n\n[Visual Context: ${analysis.description}`;
    
    if (analysis.objects && analysis.objects.length > 0) {
      context += ` Key elements: ${analysis.objects.slice(0, 5).join(', ')}.`;
    }
    
    if (analysis.text) {
      context += ` Text in image: "${analysis.text}".`;
    }
    
    if (analysis.sentiment && analysis.sentiment !== 'neutral') {
      context += ` Mood: ${analysis.sentiment}.`;
    }
    
    context += ']';
    
    return context;
  }

  /**
   * Check if URL is an image that should be analyzed
   */
  static shouldAnalyzeImage(url: string): boolean {
    // Skip profile pictures, emojis, icons
    if (url.includes('profile_images') || 
        url.includes('emoji') || 
        url.includes('icon') ||
        url.includes('avatar')) {
      return false;
    }

    // Check for supported image formats
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(ext)) ||
           url.includes('pbs.twimg.com') ||
           url.includes('ton.twitter.com');
  }

  /**
   * Estimate cost for analyzing images
   */
  estimateCost(imageCount: number, modelName?: string): number {
    const model = this.visionModels[modelName || this.defaultModel];
    if (!model) return 0;

    // Rough estimate: 200 tokens per image analysis
    const estimatedTokens = imageCount * 200;
    const cost = (estimatedTokens / 1000) * model.costPer1k;
    
    return Math.round(cost * 1000) / 1000; // Round to 3 decimal places
  }
}

// Export singleton instance
export const visionService = VisionService.getInstance();