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
  // Free API keys for basic functionality - users can replace with their own
  private UNSPLASH_ACCESS_KEY = ''; // User needs to add their key
  private keywordsCache = new Map<string, CachedKeywords>();
  private readonly CACHE_TTL = 3600000; // 1 hour TTL for keyword cache
  private PEXELS_API_KEY = ''; // User needs to add their key
  private imageCache = new Map<string, ImageResult[]>();
  
  constructor() {
    this.loadApiKeys();
    console.log('%c🖼️ ImageService initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Load API keys from storage via service worker
   */
  private async loadApiKeys(): Promise<void> {
    try {
      // Use message passing to avoid CSP issues with 5 second timeout
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('Image API keys load timeout after 5s');
          resolve();
        }, 5000);
        
        chrome.runtime.sendMessage({ type: 'GET_STORAGE', keys: ['imageApiKeys'] }, (response) => {
          clearTimeout(timeoutId);
          
          // Check for runtime errors first
          if (chrome.runtime.lastError) {
            console.error('Runtime error loading image API keys:', chrome.runtime.lastError.message);
            resolve();
            return;
          }
          
          if (response && response.success && response.data?.imageApiKeys) {
            Object.assign(this, response.data.imageApiKeys);
          }
          resolve();
        });
      });
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
      // Use Gemini Flash Image Preview to generate images
      const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tweetcraft.extension',
          'X-Title': 'TweetCraft'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: `Find or generate an image for: "${options.prompt}"
                       Style: ${options.style || 'realistic'}
                       
                       Return a JSON object with a direct image URL:
                       {
                         "url": "https://actual-image-url.jpg",
                         "alt": "description of the image"
                       }`
            }
          ],
          temperature: 0.3,
          max_tokens: 50
        })
      });

      // Check image generation response
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const imageData = await imageResponse.json();
      const aiResponse = imageData.choices?.[0]?.message?.content?.trim();
      
      console.log('%c🎨 AI Response:', 'color: #657786', aiResponse);
      
      // Now search for images using the generated keywords
      const searchPrompt = `Find high-quality ${options.style || 'realistic'} images for: "${options.prompt}"
      
Return a JSON array of 4-6 image results with this exact format:
[
  {
    "url": "direct image URL (must be a real, accessible image URL)",
    "alt": "brief description",
    "source": "website name"
  }
]

Focus on finding actual direct image URLs from sources like Unsplash, Pexels, Pixabay, or other free image sites. Return ONLY the JSON array.`;

      // Retry logic for OpenRouter calls
      let searchData: any = null;
      let lastError: Error | null = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
          // Exponential backoff: 100ms, 300ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(3, attempt - 1)));
        }
        
        try {
          const searchResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'chrome-extension://tweetcraft',
              'X-Title': 'TweetCraft Image Generation'
            },
            body: JSON.stringify({
              model: 'perplexity/llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'You are an image search assistant. Find and return real, accessible image URLs.'
                },
                {
                  role: 'user',
                  content: searchPrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 300  // Reduced for tighter responses
            })
          });
          
          // Don't retry on auth/permission/rate limit errors
          if (searchResponse.status === 401 || searchResponse.status === 403 || searchResponse.status === 429) {
            throw new Error(`API error: ${searchResponse.status} - ${searchResponse.statusText}`);
          }
          
          if (!searchResponse.ok) {
            throw new Error(`Image search failed: ${searchResponse.status}`);
          }
          
          searchData = await searchResponse.json();
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error as Error;
          
          // Don't retry on specific error codes
          if (error instanceof Error && error.message.includes('401')) break;
          if (error instanceof Error && error.message.includes('403')) break;
          if (error instanceof Error && error.message.includes('429')) break;
          
          if (attempt === maxRetries - 1) {
            throw lastError; // Final attempt failed
          }
        }
      }
      const searchResultContent = searchData.choices?.[0]?.message?.content;
      
      if (searchResultContent) {
        try {
          // First try to find fenced JSON blocks
          let jsonStr: string | null = null;
          const fencedMatch = searchResultContent.match(/```(?:json)?\s*([\s\S]*?)```/);
          
          if (fencedMatch) {
            jsonStr = fencedMatch[1].trim();
          } else {
            // Fallback to bracket matching
            const jsonMatch = searchResultContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              jsonStr = jsonMatch[0];
            }
          }
          
          if (jsonStr) {
            const results = JSON.parse(jsonStr);
            if (Array.isArray(results) && results.length > 0) {
              // Return the first result as the "generated" image
              const firstResult = results[0];
              const result: ImageResult = {
                url: firstResult.url,
                alt: firstResult.alt || options.prompt,
                source: 'generated',
                width: parseInt(options.size?.split('x')[0] || '512'),
                height: parseInt(options.size?.split('x')[1] || '512')
              };
              
              console.log('%c✅ Image found via AI search', 'color: #17BF63', result);
              return result;
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse image results:', parseError);
        }
      }
      
      // No fallback - throw error if we can't get real images
      throw new Error('Could not generate image from AI. Please try again.');
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      
      // Retry with exponential backoff for non-auth errors (but skip rate limits)
      if (retries > 0 && !error.message?.includes('401') && !error.message?.includes('API key') && !error.message?.includes('429')) {
        const delay = (4 - retries) * 1000; // 1s, 2s, 3s
        console.log(`%c⏱️ Retrying in ${delay}ms...`, 'color: #FFA500');
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateImage(options, retries - 1);
      }
      
      // No fallback - just throw the error
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
      // Try Perplexity via OpenRouter first
      const apiKey = await this.getOpenRouterApiKey();
      if (apiKey) {
        const results = await this.searchImagesPerplexity(options);
        if (results.length > 0) {
          this.imageCache.set(cacheKey, results);
          return results;
        }
      }
      
      // Try Unsplash if we have a key
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

      // No fallback to mock images - return empty array
      console.log('%c⚠️ Search failed, no results available', 'color: #FFA500');
      return [];
    } catch (error) {
      console.error('Failed to search images:', error);
      // No fallback to mock images - return empty array
      return [];
    }
  }

  /**
   * Search for images using Perplexity via OpenRouter
   */
  async searchImagesPerplexity(options: ImageSearchOptions): Promise<ImageResult[]> {
    console.log('%c🔍 IMAGE SEARCH (Perplexity)', 'color: #1DA1F2; font-weight: bold');
    console.log('%c  Query:', 'color: #657786', options.query);
    
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    
    const prompt = `Find and return real image URLs for: "${options.query}"

Search the web for actual images related to this query. Look for:
- News images from Reuters, AP, Getty Images
- Stock photos from Unsplash, Pexels, Shutterstock  
- Relevant memes or reaction images
- Political cartoons if applicable
- Real photographs that match the search terms

Return a JSON array with 4-6 REAL image URLs that actually exist:
[
  {
    "url": "https://actual-image-url.jpg",
    "thumbnail": "thumbnail URL or same as url",
    "alt": "what the image shows",
    "source": "website name"
  }
]

IMPORTANT: Return only REAL, working image URLs that you find on the web. No placeholders.
Return ONLY the JSON array, no explanations.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://tweetcraft',
          'X-Title': 'TweetCraft Image Search'
        },
        body: JSON.stringify({
          model: 'perplexity/sonar',
          messages: [
            {
              role: 'system',
              content: 'You are an image search assistant. Return only valid JSON arrays of image results.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Perplexity search error:', errorData);
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        try {
          // Extract JSON array from the response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            const imageResults = results.map((item: any) => ({
              url: item.url,
              thumbnail: item.thumbnail || item.url,
              alt: item.alt || item.description || options.query,
              source: 'web' as const,
              width: 800,
              height: 600
            }));
            
            console.log('%c✅ Found images:', 'color: #17BF63', imageResults.length);
            return imageResults;
          }
        } catch (parseError) {
          console.warn('Failed to parse search results:', parseError);
        }
      }
    } catch (error) {
      console.error('Perplexity search error:', error);
    }
    
    // No fallback to mock images - return empty array
    console.log('%c⚠️ No search results available', 'color: #FFA500');
    return [];
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
   * Get OpenRouter API key from storage via service worker
   */
  private async getOpenRouterApiKey(): Promise<string | null> {
    try {
      // Use message passing to service worker to avoid CSP issues
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to get API key:', chrome.runtime.lastError);
            resolve(null);
          } else if (response && response.success) {
            resolve(response.apiKey);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
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

  // searchFreeImages method has been removed - no mock images

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
   * Extract smart contextual search terms using AI
   */
  private async extractSmartContext(text: string): Promise<string | null> {
    try {
      const apiKey = await this.getOpenRouterApiKey();
      if (!apiKey) {
        return null;
      }
      
      const prompt = `Analyze this text and extract the most relevant image search terms. Focus on the underlying meaning, emotions, and implications rather than just literal keywords.

Text: "${text}"

Provide 3-5 highly relevant search terms that would find appropriate images for this context. Consider:
- The actual topic being discussed
- Emotional undertones and implications
- Visual metaphors that match the sentiment
- Related concepts that aren't explicitly mentioned

For example:
- "Trump is old and sick" → "elderly politician, hospital bed, medical care, frail leader"
- "Biden cognitive decline" → "confused elderly, dementia symptoms, nursing home, memory loss"
- "Economic collapse coming" → "stock market crash, recession graph, empty shelves, unemployment line"

Return ONLY the search terms, separated by commas. No explanation.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://tweetcraft',
          'X-Title': 'TweetCraft Context Analysis'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 150
        })
      });
      
      if (!response.ok) {
        console.error('Context extraction failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      const searchTerms = data.choices[0]?.message?.content?.trim();
      
      if (searchTerms) {
        // Clean up and return the first few terms
        const terms = searchTerms
          .split(',')
          .map((term: string) => term.trim())
          .filter((term: string) => term.length > 0)
          .slice(0, 4)
          .join(' ');
        return terms;
      }
    } catch (error) {
      console.error('Smart context extraction error:', error);
    }
    
    return null;
  }

  /**
   * Generate smart image prompt from context
   */
  async generateSmartPrompt(tweetText: string, replyText: string): Promise<string> {
    console.log('%c🎨 Generating smart image prompt', 'color: #1DA1F2');
    
    try {
      const apiKey = await this.getOpenRouterApiKey();
      if (!apiKey) {
        throw new Error('OpenRouter API key not found. Please configure your API key in the extension settings.');
      }
      
      const combinedText = `${tweetText} ${replyText}`.trim() || 'general topic';
      
      const prompt = `Based on this Twitter conversation, generate a creative and relevant image generation prompt that captures the essence of what's being discussed.

Context: "${combinedText}"

Create a detailed, visual prompt for image generation that:
- Captures the main theme or sentiment
- Includes relevant visual elements
- Specifies style, mood, and composition
- Is appropriate for social media

Example outputs:
- "Professional photo of elderly politician in hospital bed, concerned doctors nearby, dramatic lighting"
- "Digital art of stock market crash chart, red arrows pointing down, panicked traders in background"
- "Realistic photo of empty store shelves, dystopian atmosphere, worried shoppers"

Return ONLY the image generation prompt, no explanation.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'chrome-extension://tweetcraft',
          'X-Title': 'TweetCraft Prompt Generation'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        const errorMsg = `Prompt generation failed with status ${response.status}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      const generatedPrompt = data.choices[0]?.message?.content?.trim();
      
      if (generatedPrompt) {
        console.log('%c✅ Generated prompt:', 'color: #17BF63', generatedPrompt);
        return generatedPrompt;
      }
      
      throw new Error('Failed to generate prompt: No content in response');
    } catch (error) {
      console.error('Smart prompt generation error:', error);
      // Re-throw the error so the caller can handle it appropriately
      throw error;
    }
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