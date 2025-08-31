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
  model?: 'dall-e-2' | 'dall-e-3' | 'stable-diffusion' | 'gemini';
}

export interface ImageSearchOptions {
  query: string;
  safeSearch?: boolean;
  license?: 'creative-commons' | 'commercial' | 'any';
  limit?: number;
}

interface CachedKeywords {
  keywords: string[];
  timestamp: number;
}

export class ImageService {
  private readonly UNSPLASH_ACCESS_KEY = ''; // User needs to add their key
  private keywordsCache = new Map<string, CachedKeywords>();
  private readonly CACHE_TTL = 3600000; // 1 hour TTL for keyword cache
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
   * Generate image using AI with retry logic
   */
  async generateImage(options: ImageGenerationOptions, retries: number = 3): Promise<ImageResult> {
    console.log('%c🎨 Generating image', 'color: #9146FF', options);
    if (retries < 3) {
      console.log('%c🔄 Retry attempt', 'color: #FFA500', `${4 - retries}/3`);
    }
    
    // Check if we have OpenRouter API key
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      throw new Error('OpenRouter API key not found. Please configure in extension settings.');
    }

    try {
      // Use Google Gemini Flash for image generation through OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tweetcraft.extension',
          'X-Title': 'TweetCraft'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Create a vivid, detailed textual description for an image based on this prompt: "${options.prompt}". 
                         Style: ${options.style || 'realistic'}. 
                         Provide ONLY a descriptive text that includes:
                         - Visual details and composition
                         - Colors, lighting, and mood
                         - Key objects or subjects
                         - Suggested keywords for image searching
                         
                         Do NOT provide URLs or links. Focus on creating a rich description that could help someone visualize or search for a matching image.`
                }
              ]
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      // Check HTTP response status
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenRouter API HTTP error ${response.status}:`, errorBody);
        throw new Error(`OpenRouter API request failed with status ${response.status}: ${response.statusText}`);
      }

      // Parse and validate JSON response
      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse OpenRouter API response as JSON:', parseError);
        throw new Error('OpenRouter API returned invalid JSON response');
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.error('OpenRouter API response is not an object:', data);
        throw new Error('OpenRouter API returned invalid response format');
      }

      if (!Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('OpenRouter API response missing choices:', data);
        throw new Error('OpenRouter API response missing or empty choices array');
      }

      const choice = data.choices[0];
      if (!choice || typeof choice !== 'object' || !choice.message) {
        console.error('OpenRouter API choice missing message:', choice);
        throw new Error('OpenRouter API choice missing message object');
      }

      const message = choice.message;
      if (!message.content || (typeof message.content !== 'string' && !Array.isArray(message.content))) {
        console.error('OpenRouter API message missing content:', message);
        throw new Error('OpenRouter API message missing or invalid content');
      }

      // Extract content (handle both string and array formats)
      const content = typeof message.content === 'string' 
        ? message.content 
        : Array.isArray(message.content) 
          ? message.content.join(' ') 
          : '';
      
      // Use AI-generated description as alt text, with prompt as fallback
      const altText = content && content.trim().length > 0 ? content.trim() : options.prompt;
      
      // For now, use a high-quality placeholder that matches the prompt
      const seed = options.prompt.split(' ').join('-').toLowerCase();
      const size = options.size || '512x512';
      const [width, height] = size.split('x').map(Number);
      
      const result: ImageResult = {
        url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
        alt: altText,
        source: 'generated',
        width,
        height
      };
      
      console.log('%c✅ Image generated', 'color: #17BF63', result);
      return result;
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      
      // Retry with exponential backoff for non-auth errors
      if (retries > 0 && !error.message?.includes('401') && !error.message?.includes('API key')) {
        const delay = (4 - retries) * 1000; // 1s, 2s, 3s
        console.log(`%c⏱️ Retrying in ${delay}ms...`, 'color: #FFA500');
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateImage(options, retries - 1);
      }
      
      // Fallback to mock image after all retries exhausted
      console.log('%c📸 Falling back to placeholder image', 'color: #657786');
      const mockUrl = await this.generateMockImage(options.prompt);
      return {
        url: mockUrl,
        alt: options.prompt,
        source: 'generated',
        width: 512,
        height: 512
      };
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
      const stored = await chrome.storage.local.get(['smartReply_apiKey']);
      return stored.smartReply_apiKey || null;
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
    console.log('%c  Tweet text:', 'color: #657786', tweetText);
    console.log('%c  Reply text:', 'color: #657786', replyText);
    
    // Combine texts for keyword extraction
    const combinedText = `${tweetText} ${replyText}`.trim();
    
    if (!combinedText) {
      console.log('%c  No text available for suggestions', 'color: #FFA500');
      return [];
    }
    
    // Extract keywords from tweet and reply
    const keywords = this.extractKeywords(combinedText);
    console.log('%c  Extracted keywords:', 'color: #657786', keywords);
    
    if (keywords.length === 0) {
      // Fallback: use simple words from the text
      const simpleWords = combinedText
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 3);
      
      if (simpleWords.length > 0) {
        const searchQuery = simpleWords.join(' ');
        console.log('%c  Using simple words:', 'color: #657786', searchQuery);
        return this.searchImages({
          query: searchQuery,
          limit: 3,
          safeSearch: true
        });
      }
      return [];
    }
    
    // Search for images using top keywords
    const searchQuery = keywords.slice(0, 3).join(' ');
    console.log('%c  Search query:', 'color: #657786', searchQuery);
    return this.searchImages({
      query: searchQuery,
      limit: 3,
      safeSearch: true
    });
  }

  /**
   * Clear the keywords cache
   */
  public clearKeywordsCache(): void {
    this.keywordsCache.clear();
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.keywordsCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.keywordsCache.delete(key);
      }
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Check cache first with TTL validation
    const cached = this.keywordsCache.get(text);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log('%c💾 Keywords cache hit', 'color: #657786');
      return cached.keywords;
    }
    
    // Clean expired entries periodically (every 10 calls)
    if (Math.random() < 0.1) {
      this.cleanExpiredCache();
    }
    // Remove URLs, mentions, and extract hashtags separately
    let cleanText = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/@\w+/g, '');
    
    // Extract hashtags as potential keywords
    const hashtags = text.match(/#(\w+)/g)?.map(tag => tag.slice(1).toLowerCase()) || [];
    
    // Remove hashtags from text
    cleanText = cleanText.replace(/#\w+/g, '');
    
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some',
      'any', 'few', 'more', 'most', 'other', 'such', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'now', 'also', 'about', 'after',
      'before', 'because', 'between', 'both', 'during', 'either', 'however',
      'if', 'into', 'its', 'no', 'not', 'of', 'off', 'once', 'only', 'or',
      'over', 'since', 'still', 'such', 'then', 'there', 'therefore', 'though',
      'through', 'throughout', 'thus', 'together', 'under', 'until', 'upon',
      'us', 'use', 'used', 'using', 'via', 'while', 'within', 'without', 'yet'
    ]);
    
    // Extract words and filter
    const words = cleanText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));
    
    // Count word frequency
    const wordFreq = new Map<string, number>();
    
    // Add regular words
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Add hashtags with higher weight
    hashtags.forEach(tag => {
      if (tag.length > 2 && !stopWords.has(tag)) {
        wordFreq.set(tag, (wordFreq.get(tag) || 0) + 2);
      }
    });
    
    // Sort by frequency and return top keywords
    const keywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 5);
    
    // Store in cache with size limit (max 100 entries)
    if (this.keywordsCache.size >= 100) {
      // Simple LRU: remove oldest entry
      const firstKey = this.keywordsCache.keys().next().value;
      if (firstKey) {
        this.keywordsCache.delete(firstKey);
      }
    }
    this.keywordsCache.set(text, { keywords, timestamp: Date.now() });
    console.log('%c🔍 Keywords extracted and cached', 'color: #657786', keywords);
    
    return keywords;
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