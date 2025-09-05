/**
 * TwitterAPI.io Integration Service (NOT official Twitter API)
 * Uses TwitterAPI.io for engagement tracking - no CORS issues
 * API calls should be made from service worker only
 */

import { API_CONFIG } from '@/config/apiConfig';

export interface TwitterAPIConfig {
  apiKey?: string;
  endpoint: string;
  rateLimit: number; // requests per day
  enabled: boolean;
}

export interface EngagementMetrics {
  tweetId: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions?: number;
  engagementRate?: number;
  timestamp: number;
}

export interface TrackedTweet {
  tweetId: string;
  combo: {
    personality: string;
    vocabulary: string;
    rhetoric: string;
    lengthPacing: string;
  };
  timestamp: number;
  checkAfter: number; // timestamp when to check performance
  metrics?: EngagementMetrics;
  lastChecked?: number;
}

export class TwitterAPIService {
  private readonly STORAGE_KEY = 'tweetcraft_twitter_config';
  private readonly TRACKED_TWEETS_KEY = 'tweetcraft_tracked_tweets';
  private readonly DAILY_REQUESTS_KEY = 'tweetcraft_daily_requests';
  
  private readonly DEFAULT_CONFIG: TwitterAPIConfig = {
    endpoint: API_CONFIG.TWITTERAPI_IO_BASE_URL || 'https://twitterapi.io/api/v1',
    rateLimit: 100, // Conservative limit for TwitterAPI.io free tier
    enabled: false
  };

  /**
   * Get TwitterAPI.io configuration
   */
  async getConfig(): Promise<TwitterAPIConfig> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return {
        ...this.DEFAULT_CONFIG,
        ...result[this.STORAGE_KEY]
      };
    } catch (error) {
      console.error('Failed to get TwitterAPI config:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  /**
   * Update TwitterAPI.io configuration
   */
  async updateConfig(config: Partial<TwitterAPIConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: newConfig
      });
      
      console.log('%c📈 TwitterAPI config updated', 'color: #1DA1F2; font-weight: bold', newConfig);
    } catch (error) {
      console.error('Failed to update TwitterAPI config:', error);
      throw error;
    }
  }

  /**
   * Test TwitterAPI.io connection
   */
  async testConnection(apiKey?: string): Promise<{ success: boolean; error?: string; plan?: string }> {
    try {
      const config = await this.getConfig();
      const testKey = apiKey || config.apiKey;
      
      if (!testKey) {
        return {
          success: false,
          error: 'API key is required'
        };
      }

      // Test with TwitterAPI.io endpoint
      // Note: TwitterAPI.io uses different auth and endpoints
      const response = await fetch(`${API_CONFIG.TWITTERAPI_IO_BASE_URL}/tweets/search`, {
        headers: {
          'X-API-KEY': testKey,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ 
          query: 'test', 
          limit: 1 
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          plan: 'Connection successful'
        };
      } else if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key or insufficient permissions'
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded - please try again later'
        };
      } else {
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Check if we can make API requests today
   */
  async canMakeRequest(): Promise<{ canRequest: boolean; requestsUsed: number; requestsRemaining: number }> {
    try {
      const config = await this.getConfig();
      if (!config.enabled || !config.apiKey) {
        return { canRequest: false, requestsUsed: 0, requestsRemaining: 0 };
      }

      const today = new Date().toDateString();
      const result = await chrome.storage.local.get([this.DAILY_REQUESTS_KEY]);
      const dailyData = result[this.DAILY_REQUESTS_KEY] || {};
      
      const requestsUsed = dailyData[today] || 0;
      const requestsRemaining = Math.max(0, config.rateLimit - requestsUsed);
      
      return {
        canRequest: requestsRemaining > 0,
        requestsUsed,
        requestsRemaining
      };
    } catch (error) {
      console.error('Failed to check request limits:', error);
      return { canRequest: false, requestsUsed: 0, requestsRemaining: 0 };
    }
  }

  /**
   * Track request usage
   */
  private async incrementRequestCount(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const result = await chrome.storage.local.get([this.DAILY_REQUESTS_KEY]);
      const dailyData = result[this.DAILY_REQUESTS_KEY] || {};
      
      dailyData[today] = (dailyData[today] || 0) + 1;
      
      // Clean up old data (keep last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      Object.keys(dailyData).forEach(date => {
        if (new Date(date) < sevenDaysAgo) {
          delete dailyData[date];
        }
      });
      
      await chrome.storage.local.set({
        [this.DAILY_REQUESTS_KEY]: dailyData
      });
    } catch (error) {
      console.error('Failed to increment request count:', error);
    }
  }

  /**
   * Track a tweet for engagement monitoring
   */
  async trackTweet(tweetId: string, combo: TrackedTweet['combo']): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config.enabled) {
        console.log('%c📈 TwitterAPI tracking disabled', 'color: #657786');
        return;
      }

      const trackedTweet: TrackedTweet = {
        tweetId,
        combo,
        timestamp: Date.now(),
        checkAfter: Date.now() + (24 * 60 * 60 * 1000) // Check after 24 hours
      };

      const result = await chrome.storage.local.get([this.TRACKED_TWEETS_KEY]);
      const trackedTweets: TrackedTweet[] = result[this.TRACKED_TWEETS_KEY] || [];
      
      trackedTweets.push(trackedTweet);
      
      // Limit to last 100 tracked tweets
      if (trackedTweets.length > 100) {
        trackedTweets.splice(0, trackedTweets.length - 100);
      }
      
      await chrome.storage.local.set({
        [this.TRACKED_TWEETS_KEY]: trackedTweets
      });

      console.log('%c📈 Tweet tracked for engagement monitoring', 'color: #1DA1F2', { tweetId, combo });
    } catch (error) {
      console.error('Failed to track tweet:', error);
    }
  }

  /**
   * Get engagement metrics for a tweet
   */
  async getEngagement(tweetId: string): Promise<EngagementMetrics | null> {
    try {
      const config = await this.getConfig();
      if (!config.enabled || !config.apiKey) {
        return null;
      }

      const rateLimitCheck = await this.canMakeRequest();
      if (!rateLimitCheck.canRequest) {
        console.warn('TwitterAPI rate limit reached, skipping engagement check');
        return null;
      }

      // TwitterAPI.io endpoint for tweet metrics
      const response = await fetch(`${API_CONFIG.TWITTERAPI_IO_BASE_URL}/tweets/${tweetId}/metrics`, {
        headers: {
          'X-API-KEY': config.apiKey || API_CONFIG.TWITTERAPI_IO_KEY,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });

      await this.incrementRequestCount();

      if (response.ok) {
        const data = await response.json();
        const metrics = data.data?.public_metrics;
        
        if (metrics) {
          return {
            tweetId,
            likes: metrics.like_count || 0,
            retweets: metrics.retweet_count || 0,
            replies: metrics.reply_count || 0,
            impressions: metrics.impression_count || 0,
            engagementRate: metrics.impression_count > 0 ? 
              ((metrics.like_count + metrics.retweet_count + metrics.reply_count) / metrics.impression_count) * 100 
              : 0,
            timestamp: Date.now()
          };
        }
      } else if (response.status === 429) {
        console.warn('TwitterAPI rate limit exceeded');
      } else {
        console.warn('TwitterAPI request failed:', response.status, response.statusText);
      }

      return null;
    } catch (error) {
      console.error('Failed to get engagement metrics:', error);
      return null;
    }
  }

  /**
   * Get all tracked tweets
   */
  async getTrackedTweets(): Promise<TrackedTweet[]> {
    try {
      const result = await chrome.storage.local.get([this.TRACKED_TWEETS_KEY]);
      return result[this.TRACKED_TWEETS_KEY] || [];
    } catch (error) {
      console.error('Failed to get tracked tweets:', error);
      return [];
    }
  }

  /**
   * Process pending engagement checks
   */
  async processPendingChecks(): Promise<void> {
    try {
      const trackedTweets = await this.getTrackedTweets();
      const now = Date.now();
      let updated = false;

      for (const tweet of trackedTweets) {
        // Check if it's time to check engagement and we haven't already
        if (tweet.checkAfter <= now && !tweet.metrics) {
          const metrics = await this.getEngagement(tweet.tweetId);
          if (metrics) {
            tweet.metrics = metrics;
            tweet.lastChecked = now;
            updated = true;
            
            console.log('%c📈 Engagement metrics updated', 'color: #17BF63', { tweetId: tweet.tweetId, metrics });
          }
          
          // Rate limiting - only check one tweet per call
          break;
        }
      }

      if (updated) {
        await chrome.storage.local.set({
          [this.TRACKED_TWEETS_KEY]: trackedTweets
        });
      }
    } catch (error) {
      console.error('Failed to process pending engagement checks:', error);
    }
  }

  /**
   * Get engagement statistics by combo
   */
  async getEngagementStats(): Promise<{
    totalTweets: number;
    totalEngagements: number;
    avgLikes: number;
    avgRetweets: number;
    bestCombo?: { combo: TrackedTweet['combo']; avgEngagement: number };
    worstCombo?: { combo: TrackedTweet['combo']; avgEngagement: number };
  }> {
    try {
      const trackedTweets = await this.getTrackedTweets();
      const tweetsWithMetrics = trackedTweets.filter(t => t.metrics);
      
      if (tweetsWithMetrics.length === 0) {
        return {
          totalTweets: 0,
          totalEngagements: 0,
          avgLikes: 0,
          avgRetweets: 0
        };
      }

      const totalLikes = tweetsWithMetrics.reduce((sum, t) => sum + (t.metrics?.likes || 0), 0);
      const totalRetweets = tweetsWithMetrics.reduce((sum, t) => sum + (t.metrics?.retweets || 0), 0);
      const totalEngagements = totalLikes + totalRetweets;

      // Group by combo
      const comboStats = new Map<string, { count: number; totalEngagement: number; combo: TrackedTweet['combo'] }>();
      
      tweetsWithMetrics.forEach(tweet => {
        const comboKey = `${tweet.combo.personality}:${tweet.combo.rhetoric}`;
        const engagement = (tweet.metrics?.likes || 0) + (tweet.metrics?.retweets || 0);
        
        if (!comboStats.has(comboKey)) {
          comboStats.set(comboKey, { count: 0, totalEngagement: 0, combo: tweet.combo });
        }
        
        const stats = comboStats.get(comboKey)!;
        stats.count++;
        stats.totalEngagement += engagement;
      });

      // Find best and worst combos
      let bestCombo, worstCombo;
      let bestAvg = 0, worstAvg = Infinity;
      
      comboStats.forEach((stats) => {
        const avgEngagement = stats.totalEngagement / stats.count;
        
        if (avgEngagement > bestAvg) {
          bestAvg = avgEngagement;
          bestCombo = { combo: stats.combo, avgEngagement };
        }
        
        if (avgEngagement < worstAvg) {
          worstAvg = avgEngagement;
          worstCombo = { combo: stats.combo, avgEngagement };
        }
      });

      return {
        totalTweets: tweetsWithMetrics.length,
        totalEngagements,
        avgLikes: totalLikes / tweetsWithMetrics.length,
        avgRetweets: totalRetweets / tweetsWithMetrics.length,
        bestCombo,
        worstCombo
      };
    } catch (error) {
      console.error('Failed to get engagement stats:', error);
      return {
        totalTweets: 0,
        totalEngagements: 0,
        avgLikes: 0,
        avgRetweets: 0
      };
    }
  }
}

// Export singleton instance
export const twitterAPI = new TwitterAPIService();