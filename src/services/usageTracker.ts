/**
 * Usage Tracking Service for TweetCraft
 * Analytics and usage patterns tracking
 */

import { TemplateId, ToneId, Timestamp, createTimestamp } from '@/types/branded';

interface UsageEvent {
  id: string;
  type: UsageEventType;
  timestamp: Timestamp;
  data: Record<string, any>;
  sessionId: string;
}

type UsageEventType = 
  | 'template_selected'
  | 'tone_selected'
  | 'reply_generated'
  | 'reply_sent'
  | 'reply_edited'
  | 'reply_discarded'
  | 'arsenal_used'
  | 'suggestion_accepted'
  | 'suggestion_rejected'
  | 'favorite_added'
  | 'favorite_removed'
  | 'intensity_changed'
  | 'cache_hit'
  | 'cache_miss'
  | 'api_call'
  | 'error';

interface UsageStats {
  totalEvents: number;
  eventsByType: Record<UsageEventType, number>;
  templateUsage: Map<TemplateId, number>;
  toneUsage: Map<ToneId, number>;
  personalityUsage: Map<string, number>;
  vocabularyUsage: Map<string, number>;
  lengthPacingUsage: Map<string, number>;
  combinationUsage: Map<string, number>;
  successRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  peakUsageHours: number[];
  dailyUsage: Map<string, number>;
}

interface PerformanceMetrics {
  apiCallDuration: number[];
  cacheRetrievalTime: number[];
  renderingTime: number[];
  totalMemoryUsed: number;
}

export class UsageTracker {
  private events: UsageEvent[] = [];
  private sessionId: string;
  private performanceMetrics: PerformanceMetrics = {
    apiCallDuration: [],
    cacheRetrievalTime: [],
    renderingTime: [],
    totalMemoryUsed: 0
  };
  private readonly MAX_EVENTS = 1000;
  private readonly STORAGE_KEY = 'tweetcraft_usage';
  private saveTimeout: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
    this.startMemoryMonitoring();
    console.log('%c📊 UsageTracker initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Track a usage event
   */
  track(type: UsageEventType, data: Record<string, any> = {}): void {
    const event: UsageEvent = {
      id: this.generateEventId(),
      type,
      timestamp: createTimestamp(),
      data,
      sessionId: this.sessionId
    };

    this.events.push(event);
    
    // Rotate events if too many
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    console.log(`%c📊 Event tracked: ${type}`, 'color: #657786', data);
    
    this.scheduleSave();
  }

  /**
   * Track template selection
   */
  trackTemplateSelection(templateId: TemplateId, source: 'manual' | 'suggestion' | 'favorite'): void {
    this.track('template_selected', { templateId, source });
  }

  /**
   * Track tone selection
   */
  trackToneSelection(toneId: ToneId, intensity: number, source: 'manual' | 'suggestion' | 'favorite'): void {
    this.track('tone_selected', { toneId, intensity, source });
  }

  /**
   * Track persona selection
   */
  trackPersonaSelection(personaId: string, source: 'manual' | 'suggestion' | 'favorite'): void {
    this.track('template_selected', { templateId: personaId as TemplateId, source });
  }

  /**
   * Track reply generation
   */
  trackReplyGeneration(
    templateId: TemplateId,
    toneId: ToneId,
    duration: number,
    cached: boolean
  ): void {
    this.track('reply_generated', {
      templateId,
      toneId,
      duration,
      cached,
      combination: `${templateId}:${toneId}`
    });

    if (!cached) {
      this.performanceMetrics.apiCallDuration.push(duration);
    } else {
      this.performanceMetrics.cacheRetrievalTime.push(duration);
    }
  }

  /**
   * Track reply outcome
   */
  trackReplyOutcome(outcome: 'sent' | 'edited' | 'discarded', replyLength?: number): void {
    this.track(`reply_${outcome}` as UsageEventType, { replyLength });
  }

  /**
   * Track suggestion interaction
   */
  trackSuggestion(accepted: boolean, suggestionType: string, score: number): void {
    this.track(
      accepted ? 'suggestion_accepted' : 'suggestion_rejected',
      { suggestionType, score }
    );
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(hit: boolean, retrievalTime: number): void {
    this.track(hit ? 'cache_hit' : 'cache_miss', { retrievalTime });
    if (hit) {
      this.performanceMetrics.cacheRetrievalTime.push(retrievalTime);
    }
  }

  /**
   * Track error
   */
  trackError(error: string, context: Record<string, any>): void {
    this.track('error', { error, context });
  }

  /**
   * Track performance timing
   */
  trackTiming(operation: string, duration: number): void {
    if (operation === 'render') {
      this.performanceMetrics.renderingTime.push(duration);
    }
    
    this.track('api_call', { operation, duration });
  }

  /**
   * Get usage statistics
   */
  getStats(): UsageStats {
    const stats: UsageStats = {
      totalEvents: this.events.length,
      eventsByType: {} as Record<UsageEventType, number>,
      templateUsage: new Map(),
      toneUsage: new Map(),
      personalityUsage: new Map(),
      vocabularyUsage: new Map(),
      lengthPacingUsage: new Map(),
      combinationUsage: new Map(),
      successRate: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      peakUsageHours: [],
      dailyUsage: new Map()
    };

    // Count events by type
    this.events.forEach(event => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

      // Track template usage
      if (event.data.templateId) {
        const templateId = event.data.templateId as TemplateId;
        stats.templateUsage.set(templateId, (stats.templateUsage.get(templateId) || 0) + 1);
      }

      // Track tone usage
      if (event.data.toneId) {
        const toneId = event.data.toneId as ToneId;
        stats.toneUsage.set(toneId, (stats.toneUsage.get(toneId) || 0) + 1);
      }

      // Track personality, vocabulary, and length pacing usage
      // These would be tracked separately when implemented
      if (event.data.personalityId) {
        const personalityId = event.data.personalityId as string;
        stats.personalityUsage.set(personalityId, (stats.personalityUsage.get(personalityId) || 0) + 1);
      }
      
      if (event.data.vocabularyId) {
        const vocabularyId = event.data.vocabularyId as string;
        stats.vocabularyUsage.set(vocabularyId, (stats.vocabularyUsage.get(vocabularyId) || 0) + 1);
      }
      
      if (event.data.lengthPacingId) {
        const lengthPacingId = event.data.lengthPacingId as string;
        stats.lengthPacingUsage.set(lengthPacingId, (stats.lengthPacingUsage.get(lengthPacingId) || 0) + 1);
      }

      // Track combination usage
      if (event.data.combination) {
        const combo = event.data.combination;
        stats.combinationUsage.set(combo, (stats.combinationUsage.get(combo) || 0) + 1);
      }

      // Track daily usage
      const date = new Date(event.timestamp).toDateString();
      stats.dailyUsage.set(date, (stats.dailyUsage.get(date) || 0) + 1);
    });

    // Calculate success rate
    const generated = stats.eventsByType['reply_generated'] || 0;
    const sent = stats.eventsByType['reply_sent'] || 0;
    stats.successRate = generated > 0 ? (sent / generated) * 100 : 0;

    // Calculate average response time
    if (this.performanceMetrics.apiCallDuration.length > 0) {
      const sum = this.performanceMetrics.apiCallDuration.reduce((a, b) => a + b, 0);
      stats.averageResponseTime = sum / this.performanceMetrics.apiCallDuration.length;
    }

    // Calculate cache hit rate
    const cacheHits = stats.eventsByType['cache_hit'] || 0;
    const cacheMisses = stats.eventsByType['cache_miss'] || 0;
    const totalCacheAccess = cacheHits + cacheMisses;
    stats.cacheHitRate = totalCacheAccess > 0 ? (cacheHits / totalCacheAccess) * 100 : 0;

    // Calculate error rate
    const errors = stats.eventsByType['error'] || 0;
    stats.errorRate = stats.totalEvents > 0 ? (errors / stats.totalEvents) * 100 : 0;

    // Find peak usage hours
    const hourCounts = new Map<number, number>();
    this.events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    const sortedHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
    
    stats.peakUsageHours = sortedHours;

    return stats;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics = (): {
    averageApiCall: number;
    averageCacheRetrieval: number;
    averageRenderTime: number;
    memoryUsage: number;
    p95ApiCall: number;
    p95CacheRetrieval: number;
  } => {
    const calculateAverage = (arr: number[]) => 
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const calculateP95 = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * 0.95);
      return sorted[index];
    };

    return {
      averageApiCall: calculateAverage(this.performanceMetrics.apiCallDuration),
      averageCacheRetrieval: calculateAverage(this.performanceMetrics.cacheRetrievalTime),
      averageRenderTime: calculateAverage(this.performanceMetrics.renderingTime),
      memoryUsage: this.performanceMetrics.totalMemoryUsed,
      p95ApiCall: calculateP95(this.performanceMetrics.apiCallDuration),
      p95CacheRetrieval: calculateP95(this.performanceMetrics.cacheRetrievalTime)
    };
  }

  /**
   * Get insights and recommendations
   */
  getInsights(): string[] {
    const insights: string[] = [];
    const stats = this.getStats();
    const perf = this.getPerformanceMetrics();

    // Success rate insight
    if (stats.successRate < 50) {
      insights.push('Low success rate - consider adjusting tone or template selections');
    } else if (stats.successRate > 80) {
      insights.push('High success rate - your selections are working well!');
    }

    // Cache performance
    if (stats.cacheHitRate < 30) {
      insights.push('Low cache hit rate - consider pre-loading common combinations');
    } else if (stats.cacheHitRate > 70) {
      insights.push('Excellent cache performance - responses are fast');
    }

    // API performance
    if (perf.averageApiCall > 3000) {
      insights.push('Slow API responses - consider using a faster model');
    }

    // Popular combinations
    const topCombo = Array.from(stats.combinationUsage.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCombo) {
      insights.push(`Most used: ${topCombo[0]} (${topCombo[1]} times)`);
    }

    // Peak usage
    if (stats.peakUsageHours.length > 0) {
      insights.push(`Peak usage hours: ${stats.peakUsageHours.join(', ')}:00`);
    }

    // Error rate
    if (stats.errorRate > 5) {
      insights.push('High error rate detected - check your configuration');
    }

    return insights;
  }

  /**
   * Export data for analysis
   */
  exportData = (): {
    events: UsageEvent[];
    stats: UsageStats;
    performance: {
      averageApiCall: number;
      averageCacheRetrieval: number;
      averageRenderTime: number;
      memoryUsage: number;
      p95ApiCall: number;
      p95CacheRetrieval: number;
    };
    insights: string[];
    exportedAt: string;
  } => {
    return {
      events: this.events,
      stats: this.getStats(),
      performance: this.getPerformanceMetrics(),
      insights: this.getInsights(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Clear old events
   */
  clearOldEvents(daysToKeep: number = 30): void {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const oldCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp > cutoff);
    
    const removed = oldCount - this.events.length;
    if (removed > 0) {
      console.log(`%c📊 Cleared ${removed} old events`, 'color: #FFA500');
      this.saveToStorage();
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.performanceMetrics.totalMemoryUsed = memory.usedJSHeapSize;
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Schedule save to storage
   */
  private scheduleSave(): void {
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = window.setTimeout(() => {
      this.saveToStorage();
    }, 5000); // Save after 5 seconds of inactivity
  }

  /**
   * Save to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      // Keep only recent events to avoid quota issues
      const recentEvents = this.events.slice(-500);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: {
          events: recentEvents,
          metrics: this.performanceMetrics,
          savedAt: Date.now()
        }
      });
      
      console.log('%c📊 Usage data saved', 'color: #17BF63');
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  }

  /**
   * Load from Chrome storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      
      if (result[this.STORAGE_KEY]) {
        const data = result[this.STORAGE_KEY];
        this.events = data.events || [];
        this.performanceMetrics = data.metrics || this.performanceMetrics;
        
        console.log(`%c📊 Loaded ${this.events.length} events from storage`, 'color: #17BF63');
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  }

  /**
   * Reset all data
   */
  async reset(): Promise<void> {
    this.events = [];
    this.performanceMetrics = {
      apiCallDuration: [],
      cacheRetrievalTime: [],
      renderingTime: [],
      totalMemoryUsed: 0
    };
    
    await chrome.storage.local.remove([this.STORAGE_KEY]);
    console.log('%c📊 Usage data reset', 'color: #FFA500');
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();