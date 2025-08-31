/**
 * Image Service for TweetCraft
 * Handles AI image generation and web image search
 */

export interface ImageResult {
  url: string;
  alt: string;
  source: 'generated' | 'web';
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  style?: 'realistic' | 'cartoon' | 'artistic' | 'sketch';
  size?: '256x256' | '512x512' | '1024x1024';
  model?: 'dall-e-2' | 'dall-e-3' | 'stable-diffusion';
}

export interface ImageSearchOptions {
  query: string;
  safeSearch?: boolean;
  license?: 'creative-commons' | 'commercial' | 'any';
  limit?: number;
}

export class ImageService {
  private readonly UNSPLASH_ACCESS_KEY = ''; // User needs to add their key
  private readonly PEXELS_API_KEY = ''; // User needs to add their key
  private imageCache = new Map<string, ImageResult[]>();
  
  constructor() {
    this.loadApiKeys();
    console.log('%c🖼️ ImageService initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Load API keys from storage
   */
  private async loadApiKeys(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['imageApiKeys']);
      if (stored.imageApiKeys) {
        Object.assign(this, stored.imageApiKeys);
      }
    } catch (error) {
      console.warn('Failed to load image API keys:', error);
    }
  }

  /**
   * Generate image using AI
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageResult> {
    console.log('%c🎨 Generating image', 'color: #9146FF', options);
    
    // Check if we have OpenRouter API key for DALL-E
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      throw new Error('OpenRouter API key not found. Please configure in extension settings.');
    }

    try {
      // For now, we'll use a mock response
      // In production, this would call OpenRouter's image generation endpoint
      // or another image generation API like Replicate, Stability AI, etc.
      
      const mockUrl = await this.generateMockImage(options.prompt);
      
      const result: ImageResult = {
        url: mockUrl,
        alt: options.prompt,
        source: 'generated',
        width: 512,
        height: 512
      };
      
      console.log('%c✅ Image generated', 'color: #17BF63', result);
      return result;
    } catch (error) {
      console.error('Failed to generate image:', error);
      throw error;
    }
  }

  /**
   * Search for images on the web
   */
  async searchImages(options: ImageSearchOptions): Promise<ImageResult[]> {
    console.log('%c🔍 Searching images', 'color: #1DA1F2', options);
    
    // Check cache first
    const cacheKey = JSON.stringify(options);
    if (this.imageCache.has(cacheKey)) {
      console.log('%c💾 Using cached images', 'color: #657786');
      return this.imageCache.get(cacheKey)!;
    }

    try {
      // Try Unsplash first
      if (this.UNSPLASH_ACCESS_KEY) {
        const results = await this.searchUnsplash(options);
        if (results.length > 0) {
          this.imageCache.set(cacheKey, results);
          return results;
        }
      }

      // Fallback to Pexels
      if (this.PEXELS_API_KEY) {
        const results = await this.searchPexels(options);
        if (results.length > 0) {
          this.imageCache.set(cacheKey, results);
          return results;
        }
      }

      // Fallback to mock images
      return this.getMockImages(options.query);
    } catch (error) {
      console.error('Failed to search images:', error);
      return this.getMockImages(options.query);
    }
  }

  /**
   * Search Unsplash for images
   */
  private async searchUnsplash(options: ImageSearchOptions): Promise<ImageResult[]> {
    const params = new URLSearchParams({
      query: options.query,
      per_page: String(options.limit || 5),
      orientation: 'landscape'
    });

    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map((photo: any) => ({
      url: photo.urls.regular,
      thumbnail: photo.urls.thumb,
      alt: photo.description || photo.alt_description || options.query,
      source: 'web' as const,
      width: photo.width,
      height: photo.height
    }));
  }

  /**
   * Search Pexels for images
   */
  private async searchPexels(options: ImageSearchOptions): Promise<ImageResult[]> {
    const params = new URLSearchParams({
      query: options.query,
      per_page: String(options.limit || 5),
      orientation: 'landscape'
    });

    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: {
        'Authorization': this.PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.photos.map((photo: any) => ({
      url: photo.src.large,
      thumbnail: photo.src.tiny,
      alt: photo.alt || options.query,
      source: 'web' as const,
      width: photo.width,
      height: photo.height
    }));
  }

  /**
   * Get OpenRouter API key from storage
   */
  private async getOpenRouterApiKey(): Promise<string | null> {
    try {
      const stored = await chrome.storage.local.get(['openRouterApiKey']);
      return stored.openRouterApiKey || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a mock image URL (placeholder)
   */
  private async generateMockImage(prompt: string): Promise<string> {
    // In production, this would call a real image generation API
    // For now, return a placeholder from a service like Picsum
    const seed = prompt.split(' ').join('-').toLowerCase();
    return `https://picsum.photos/seed/${seed}/512/512`;
  }

  /**
   * Get mock images for testing
   */
  private getMockImages(query: string): ImageResult[] {
    const mockImages: ImageResult[] = [];
    
    for (let i = 1; i <= 3; i++) {
      mockImages.push({
        url: `https://picsum.photos/seed/${query}-${i}/800/600`,
        thumbnail: `https://picsum.photos/seed/${query}-${i}/200/150`,
        alt: `${query} image ${i}`,
        source: 'web',
        width: 800,
        height: 600
      });
    }
    
    return mockImages;
  }

  /**
   * Suggest images based on tweet context
   */
  async suggestImages(tweetText: string, replyText: string): Promise<ImageResult[]> {
    console.log('%c🤖 Suggesting images based on context', 'color: #FFA500');
    
    // Extract keywords from tweet and reply
    const keywords = this.extractKeywords(tweetText + ' ' + replyText);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Search for images using top keywords
    const searchQuery = keywords.slice(0, 3).join(' ');
    return this.searchImages({
      query: searchQuery,
      limit: 3,
      safeSearch: true
    });
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove URLs, mentions, and hashtags
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/@\w+/g, '')
      .replace(/#\w+/g, '');
    
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'could', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which'
    ]);
    
    // Extract words and filter
    const words = cleanText
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
  }

  /**
   * Download image to blob for upload
   */
  async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return response.blob();
  }

  /**
   * Clear image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    console.log('%c🗑️ Image cache cleared', 'color: #FFA500');
  }
}

// Export singleton instance
export const imageService = new ImageService();