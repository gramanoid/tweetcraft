/**
 * Trend Service for fetching trending topics and content suggestions
 */

import { logger } from '@/utils/logger';
import { API_CONFIG } from '@/config/apiConfig';

export interface TrendingTopic {
  topic: string;
  description?: string;
  volume?: number;
  category?: string;
  relatedKeywords?: string[];
}

export interface ContentSuggestion {
  title: string;
  summary?: string;
  url?: string;
  publishedDate?: string;
  score?: number;
  snippet?: string;
}

interface CacheEntry {
  data: TrendingTopic[] | ContentSuggestion[] | string[];
  timestamp: number;
}

export class TrendService {
  private static readonly EXA_API_KEY = API_CONFIG.EXA_API_KEY || '';
  private static readonly EXA_API_URL = 'https://api.exa.ai/search';
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_CACHE_SIZE = 50; // Maximum number of cache entries
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private static trendCache: Map<string, CacheEntry> = new Map();
  private static lastCleanup = Date.now();

  /**
   * Search for content using EXA API
   */
  static async searchContent(query: string, options?: {
    numResults?: number;
    useAutoprompt?: boolean;
    type?: 'neural' | 'keyword';
    category?: string;
  }): Promise<ContentSuggestion[]> {
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    const cached = this.getCachedData<ContentSuggestion[]>(cacheKey);
    if (cached) return cached;

    // Return empty array if no API key is configured
    if (!this.EXA_API_KEY) {
      logger.warn('EXA API key not configured, returning empty results');
      return [];
    }

    try {
      const response = await fetch(this.EXA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.EXA_API_KEY
        },
        body: JSON.stringify({
          query,
          num_results: options?.numResults || 10,
          use_autoprompt: options?.useAutoprompt !== false,
          type: options?.type || 'neural',
          contents: {
            text: true,
            highlights: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`EXA API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestions: ContentSuggestion[] = data.results?.map((result: any) => ({
        title: result.title,
        summary: result.text?.substring(0, 200),
        url: result.url,
        publishedDate: result.published_date,
        score: result.score,
        snippet: result.highlights?.[0]
      })) || [];

      this.setCachedData(cacheKey, suggestions);
      logger.log('trend', `Fetched ${suggestions.length} content suggestions for: ${query}`);
      return suggestions;
    } catch (error) {
      logger.error('trend', 'Failed to fetch content suggestions:', error);
      return [];
    }
  }

  /**
   * Get trending topics based on category
   */
  static async getTrendingTopics(category?: string): Promise<TrendingTopic[]> {
    const cacheKey = `trends_${category || 'all'}`;
    const cached = this.getCachedData<TrendingTopic[]>(cacheKey);
    if (cached) return cached;

    try {
      // Search for current trending topics
      const queries = category ? 
        [`trending ${category} topics today`, `viral ${category} news`] :
        ['trending on twitter today', 'viral topics social media'];
      
      const results = await Promise.all(
        queries.map(q => this.searchContent(q, { numResults: 5 }))
      );
      
      const topics: TrendingTopic[] = [];
      const seen = new Set<string>();
      
      results.flat().forEach(suggestion => {
        const topicWords = suggestion.title
          ?.split(/[\s-]+/)
          .filter(w => w.length > 3)
          .slice(0, 3)
          .join(' ');
        
        if (topicWords && !seen.has(topicWords.toLowerCase())) {
          seen.add(topicWords.toLowerCase());
          topics.push({
            topic: topicWords,
            description: suggestion.summary,
            category: category || 'general'
          });
        }
      });

      this.setCachedData(cacheKey, topics);
      logger.log('trend', `Fetched ${topics.length} trending topics`);
      return topics;
    } catch (error) {
      logger.error('trend', 'Failed to fetch trending topics:', error);
      // Return fallback topics
      return this.getFallbackTopics(category);
    }
  }

  /**
   * Get AI writing suggestions for a topic
   */
  static async getWritingSuggestions(topic: string): Promise<string[]> {
    try {
      const suggestions = await this.searchContent(
        `interesting takes opinions about ${topic}`,
        { numResults: 5, type: 'neural' }
      );
      
      return suggestions
        .map(s => s.snippet || s.summary)
        .filter(Boolean)
        .slice(0, 3) as string[];
    } catch (error) {
      logger.error('trend', 'Failed to get writing suggestions:', error);
      return [];
    }
  }

  /**
   * Get related hashtags for a topic
   */
  static async getRelatedHashtags(topic: string): Promise<string[]> {
    const cacheKey = `hashtags_${topic}`;
    const cached = this.getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const suggestions = await this.searchContent(
        `${topic} trending hashtags twitter`,
        { numResults: 3, type: 'keyword' }
      );
      
      const hashtags: string[] = [];
      const hashtagRegex = /#\w+/g;
      
      suggestions.forEach(s => {
        const text = `${s.title} ${s.summary || ''}`;
        const matches = text.match(hashtagRegex);
        if (matches) {
          hashtags.push(...matches);
        }
      });
      
      // Generate hashtags from topic if none found
      if (hashtags.length === 0) {
        const words = topic.toLowerCase().split(/\s+/);
        hashtags.push(
          `#${words.join('')}`,
          ...words.map(w => `#${w}`)
        );
      }
      
      const unique = [...new Set(hashtags)].slice(0, 5);
      this.setCachedData(cacheKey, unique);
      return unique;
    } catch (error) {
      logger.error('trend', 'Failed to get hashtags:', error);
      return [];
    }
  }

  /**
   * Check and perform periodic cache cleanup
   */
  private static checkAndCleanupCache(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanupCache();
      this.lastCleanup = now;
    }
  }

  private static getCachedData<T extends TrendingTopic[] | ContentSuggestion[] | string[]>(key: string): T | null {
    // Periodic cleanup check
    this.checkAndCleanupCache();
    const cached = this.trendCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    // Remove expired entry
    if (cached) {
      this.trendCache.delete(key);
    }
    return null;
  }

  private static setCachedData(key: string, data: TrendingTopic[] | ContentSuggestion[] | string[]): void {
    // Periodic cleanup check
    this.checkAndCleanupCache();
    
    // Enforce cache size limit using LRU strategy
    if (this.trendCache.size >= this.MAX_CACHE_SIZE && !this.trendCache.has(key)) {
      // Remove oldest entry (first in map)
      const firstKey = this.trendCache.keys().next().value;
      if (firstKey) {
        this.trendCache.delete(firstKey);
      }
    }
    
    // If updating existing entry, delete and re-add to move to end (LRU)
    if (this.trendCache.has(key)) {
      this.trendCache.delete(key);
    }
    
    this.trendCache.set(key, { data, timestamp: Date.now() });
  }
  
  /**
   * Clear expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.trendCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        entriesToDelete.push(key);
      }
    });
    
    entriesToDelete.forEach(key => this.trendCache.delete(key));
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;
    
    this.trendCache.forEach(entry => {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });
    
    return {
      size: this.trendCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      oldestEntry: oldestTimestamp
    };
  }

  private static getFallbackTopics(category?: string): TrendingTopic[] {
    const fallbacks: Record<string, TrendingTopic[]> = {
      tech: [
        { topic: 'AI Agents', category: 'tech' },
        { topic: 'Web3 Gaming', category: 'tech' },
        { topic: 'Quantum Computing', category: 'tech' }
      ],
      business: [
        { topic: 'Remote Work', category: 'business' },
        { topic: 'Startup Funding', category: 'business' },
        { topic: 'Market Trends', category: 'business' }
      ],
      general: [
        { topic: 'Climate Action', category: 'general' },
        { topic: 'Mental Health', category: 'general' },
        { topic: 'Space Exploration', category: 'general' }
      ]
    };
    
    return fallbacks[category || 'general'] || fallbacks.general;
  }
}

export const trendService = new TrendService();