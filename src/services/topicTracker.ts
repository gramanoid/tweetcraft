/**
 * Topic Success Tracking Service - Task 5.3
 * Tracks what personality/vocabulary/rhetoric combinations work best for different topics
 */

import { MessageType } from '@/types/messages';

export interface TopicCategory {
  id: string;
  label: string;
  keywords: string[];
  color: string;
}

export interface ComboPerformance {
  personality: string;
  vocabulary: string;
  rhetoric: string;
  lengthPacing: string;
  successRate: number;
  totalUses: number;
  successfulUses: number;
  averageEngagement?: number;
  lastUsed: number;
}

export interface TopicAnalysis {
  topicId: string;
  confidence: number;
  matchedKeywords: string[];
  alternatives: string[];
}

export interface TopicSuccessData {
  topicId: string;
  performances: ComboPerformance[];
  lastUpdated: number;
  totalTrackedReplies: number;
}

class TopicTracker {
  private readonly STORAGE_KEY = 'tweetcraft-topic-success';
  private isInitialized = false;
  private topicData: Map<string, TopicSuccessData> = new Map();

  // Predefined topic categories based on common Twitter content types
  private readonly TOPIC_CATEGORIES: TopicCategory[] = [
    {
      id: 'tech',
      label: 'Tech & Programming',
      keywords: ['code', 'programming', 'software', 'api', 'javascript', 'python', 'react', 'ai', 'ml', 'tech', 'developer', 'coding', 'github', 'startup', 'saas'],
      color: '#00D2FF'
    },
    {
      id: 'business',
      label: 'Business & Career',
      keywords: ['business', 'career', 'job', 'work', 'startup', 'entrepreneur', 'leadership', 'management', 'productivity', 'meeting', 'corporate', 'strategy', 'revenue', 'growth'],
      color: '#32CD32'
    },
    {
      id: 'personal',
      label: 'Personal & Lifestyle',
      keywords: ['life', 'personal', 'family', 'health', 'fitness', 'food', 'travel', 'hobby', 'weekend', 'morning', 'coffee', 'book', 'music', 'movie', 'relationships'],
      color: '#FF6B6B'
    },
    {
      id: 'news',
      label: 'News & Current Events',
      keywords: ['news', 'breaking', 'update', 'election', 'politics', 'government', 'policy', 'economy', 'market', 'crisis', 'announcement', 'report', 'study', 'research'],
      color: '#FFD93D'
    },
    {
      id: 'creative',
      label: 'Creative & Entertainment',
      keywords: ['art', 'design', 'creative', 'music', 'movie', 'game', 'streaming', 'content', 'video', 'photo', 'meme', 'funny', 'humor', 'entertainment', 'show'],
      color: '#9B59B6'
    },
    {
      id: 'social',
      label: 'Social & Community',
      keywords: ['community', 'social', 'help', 'support', 'share', 'thank', 'congratulations', 'advice', 'question', 'discussion', 'opinion', 'thought', 'experience', 'story'],
      color: '#FF9500'
    },
    {
      id: 'educational',
      label: 'Educational & Learning',
      keywords: ['learn', 'education', 'tutorial', 'tip', 'guide', 'how to', 'lesson', 'course', 'skill', 'knowledge', 'study', 'university', 'school', 'teaching', 'explain'],
      color: '#1ABC9C'
    }
  ];

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('%c🎯 Initializing Topic Tracker', 'color: #9B59B6; font-weight: bold');
    
    try {
      await this.loadTopicData();
      this.isInitialized = true;
      console.log('%c✅ Topic Tracker initialized', 'color: #17BF63', `${this.topicData.size} topics tracked`);
    } catch (error) {
      console.error('Failed to initialize Topic Tracker:', error);
    }
  }

  private async loadTopicData(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_STORAGE,
        keys: [this.STORAGE_KEY]
      });

      if (response?.success && response.data?.[this.STORAGE_KEY]) {
        const data = response.data[this.STORAGE_KEY];
        this.topicData = new Map(Object.entries(data));
        console.log('%c📊 Loaded topic data:', 'color: #657786', this.topicData.size, 'topics');
      } else {
        console.log('%c📊 No topic data found, starting fresh', 'color: #657786');
      }
    } catch (error) {
      console.error('Failed to load topic data:', error);
    }
  }

  private async saveTopicData(): Promise<void> {
    try {
      const dataObject = Object.fromEntries(this.topicData);
      await chrome.runtime.sendMessage({
        type: MessageType.SET_STORAGE,
        data: {
          [this.STORAGE_KEY]: dataObject
        }
      });
      console.log('%c💾 Topic data saved', 'color: #17BF63');
    } catch (error) {
      console.error('Failed to save topic data:', error);
      throw error;
    }
  }

  /**
   * Analyze tweet content to determine its topic category
   */
  analyzeTopic(tweetText: string): TopicAnalysis {
    const cleanText = tweetText.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanText.split(/\s+/);
    
    const topicScores = new Map<string, { score: number; matchedKeywords: string[] }>();
    
    // Score each topic category
    for (const category of this.TOPIC_CATEGORIES) {
      let score = 0;
      const matchedKeywords: string[] = [];
      
      for (const keyword of category.keywords) {
        const keywordWords = keyword.split(' ');
        
        // Check for exact keyword match
        if (cleanText.includes(keyword)) {
          score += keywordWords.length * 2; // Bonus for multi-word keywords
          matchedKeywords.push(keyword);
        }
        
        // Check for individual word matches
        for (const keywordWord of keywordWords) {
          if (words.includes(keywordWord)) {
            score += 1;
            if (!matchedKeywords.includes(keywordWord)) {
              matchedKeywords.push(keywordWord);
            }
          }
        }
      }
      
      if (score > 0) {
        topicScores.set(category.id, { score, matchedKeywords });
      }
    }
    
    if (topicScores.size === 0) {
      // Default to 'social' for general content
      return {
        topicId: 'social',
        confidence: 0.3,
        matchedKeywords: [],
        alternatives: []
      };
    }
    
    // Find the highest scoring topic
    const sortedTopics = Array.from(topicScores.entries())
      .sort((a, b) => b[1].score - a[1].score);
    
    const [topTopicId, topScore] = sortedTopics[0];
    const maxPossibleScore = Math.max(10, words.length * 0.5); // Reasonable max score
    const confidence = Math.min(0.95, topScore.score / maxPossibleScore);
    
    const alternatives = sortedTopics.slice(1, 3).map(([id]) => id);
    
    return {
      topicId: topTopicId,
      confidence,
      matchedKeywords: topScore.matchedKeywords,
      alternatives
    };
  }

  /**
   * Track the performance of a combo for a specific topic
   */
  async trackComboPerformance(
    topicId: string,
    combo: {
      personality: string;
      vocabulary: string;
      rhetoric: string;
      lengthPacing: string;
    },
    wasSuccessful: boolean,
    engagement?: number
  ): Promise<void> {
    await this.init();
    
    // Get or create topic data
    let topicData = this.topicData.get(topicId);
    if (!topicData) {
      topicData = {
        topicId,
        performances: [],
        lastUpdated: Date.now(),
        totalTrackedReplies: 0
      };
      this.topicData.set(topicId, topicData);
    }
    
    // Find or create combo performance record
    let performance = topicData.performances.find(p =>
      p.personality === combo.personality &&
      p.vocabulary === combo.vocabulary &&
      p.rhetoric === combo.rhetoric &&
      p.lengthPacing === combo.lengthPacing
    );
    
    if (!performance) {
      performance = {
        ...combo,
        successRate: 0,
        totalUses: 0,
        successfulUses: 0,
        lastUsed: Date.now()
      };
      topicData.performances.push(performance);
    }
    
    // Update performance metrics
    performance.totalUses++;
    if (wasSuccessful) {
      performance.successfulUses++;
    }
    performance.successRate = performance.successfulUses / performance.totalUses;
    performance.lastUsed = Date.now();
    
    // Update engagement if provided
    if (engagement !== undefined) {
      if (performance.averageEngagement === undefined) {
        performance.averageEngagement = engagement;
      } else {
        // Weighted average with recent data having more weight
        performance.averageEngagement = 
          (performance.averageEngagement * 0.7) + (engagement * 0.3);
      }
    }
    
    topicData.totalTrackedReplies++;
    topicData.lastUpdated = Date.now();
    
    await this.saveTopicData();
    
    console.log('%c🎯 Tracked combo performance:', 'color: #9B59B6', {
      topic: topicId,
      combo: `${combo.personality}/${combo.vocabulary}`,
      success: wasSuccessful,
      newSuccessRate: Math.round(performance.successRate * 100) + '%'
    });
  }

  /**
   * Get the best performing combos for a specific topic
   */
  async getBestCombosForTopic(topicId: string, limit: number = 5): Promise<ComboPerformance[]> {
    await this.init();
    
    const topicData = this.topicData.get(topicId);
    if (!topicData || topicData.performances.length === 0) {
      return [];
    }
    
    // Sort by success rate, then by total uses (for statistical significance)
    return topicData.performances
      .filter(p => p.totalUses >= 2) // Only consider combos with at least 2 uses
      .sort((a, b) => {
        // Prioritize higher success rates
        if (Math.abs(a.successRate - b.successRate) > 0.1) {
          return b.successRate - a.successRate;
        }
        // If success rates are similar, prefer more frequently used combos
        return b.totalUses - a.totalUses;
      })
      .slice(0, limit);
  }

  /**
   * Get topic-aware recommendations for a given tweet
   */
  async getTopicRecommendations(tweetText: string): Promise<{
    analysis: TopicAnalysis;
    recommendations: ComboPerformance[];
    fallbackRecommendations: ComboPerformance[];
  }> {
    await this.init();
    
    const analysis = this.analyzeTopic(tweetText);
    const recommendations = await this.getBestCombosForTopic(analysis.topicId, 3);
    
    // Get fallback recommendations from alternative topics
    let fallbackRecommendations: ComboPerformance[] = [];
    for (const altTopicId of analysis.alternatives) {
      const altRecs = await this.getBestCombosForTopic(altTopicId, 2);
      fallbackRecommendations = fallbackRecommendations.concat(altRecs);
    }
    
    return {
      analysis,
      recommendations,
      fallbackRecommendations: fallbackRecommendations.slice(0, 2)
    };
  }

  /**
   * Get all topic categories
   */
  getTopicCategories(): TopicCategory[] {
    return [...this.TOPIC_CATEGORIES];
  }

  /**
   * Get topic statistics for analytics
   */
  async getTopicStats(): Promise<{
    totalTopics: number;
    totalTrackedReplies: number;
    topPerformingTopics: Array<{ topic: TopicCategory; avgSuccessRate: number; totalReplies: number }>;
    recentActivity: Array<{ topicId: string; lastUsed: number; recentSuccessRate: number }>;
  }> {
    await this.init();
    
    let totalTrackedReplies = 0;
    const topicPerformance: Array<{ topic: TopicCategory; avgSuccessRate: number; totalReplies: number }> = [];
    const recentActivity: Array<{ topicId: string; lastUsed: number; recentSuccessRate: number }> = [];
    
    for (const [topicId, data] of this.topicData) {
      const topicCategory = this.TOPIC_CATEGORIES.find(c => c.id === topicId);
      if (!topicCategory) continue;
      
      totalTrackedReplies += data.totalTrackedReplies;
      
      // Calculate average success rate across all combos for this topic
      const totalSuccesses = data.performances.reduce((sum, p) => sum + p.successfulUses, 0);
      const totalUses = data.performances.reduce((sum, p) => sum + p.totalUses, 0);
      const avgSuccessRate = totalUses > 0 ? totalSuccesses / totalUses : 0;
      
      topicPerformance.push({
        topic: topicCategory,
        avgSuccessRate,
        totalReplies: data.totalTrackedReplies
      });
      
      // Recent activity (last 7 days)
      const recentPerformances = data.performances.filter(
        p => Date.now() - p.lastUsed < 7 * 24 * 60 * 60 * 1000
      );
      
      if (recentPerformances.length > 0) {
        const recentSuccesses = recentPerformances.reduce((sum, p) => sum + p.successfulUses, 0);
        const recentUses = recentPerformances.reduce((sum, p) => sum + p.totalUses, 0);
        const recentSuccessRate = recentUses > 0 ? recentSuccesses / recentUses : 0;
        
        recentActivity.push({
          topicId,
          lastUsed: Math.max(...recentPerformances.map(p => p.lastUsed)),
          recentSuccessRate
        });
      }
    }
    
    return {
      totalTopics: this.topicData.size,
      totalTrackedReplies,
      topPerformingTopics: topicPerformance
        .sort((a, b) => b.avgSuccessRate - a.avgSuccessRate)
        .slice(0, 5),
      recentActivity: recentActivity
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 5)
    };
  }

  /**
   * Clear all topic tracking data
   */
  async clearAllData(): Promise<void> {
    await this.init();
    this.topicData.clear();
    await this.saveTopicData();
    console.log('%c🗑️ All topic data cleared', 'color: #DC3545');
  }
}

// Export singleton instance
export const topicTracker = new TopicTracker();