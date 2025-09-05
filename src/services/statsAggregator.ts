/**
 * Stats Aggregator Service
 * Task 2.1: Personal Stats Dashboard
 * Aggregates and calculates usage statistics from usage tracker
 */

import { usageTracker } from './usageTracker';
import { MessageType } from '@/types/messages';

export interface DashboardStats {
  // Overall metrics
  totalReplies: number;
  repliesSent: number;
  successRate: number;
  
  // Top usage patterns (last 30 days)
  topPersonalities: { name: string; count: number; percentage: number }[];
  topVocabulary: { name: string; count: number; percentage: number }[];
  topRhetoric: { name: string; count: number; percentage: number }[];
  topCombinations: { combo: string; count: number }[];
  
  // Time patterns
  peakHours: { hour: number; count: number }[];
  dailyTrend: { date: string; count: number }[];
  
  // Performance metrics
  avgResponseTime: number;
  cacheHitRate: number;
  modelUsage: { model: string; count: number; percentage: number }[];
  
  // Engagement insights
  editRate: number; // How often users edit generated replies
  discardRate: number; // How often users discard replies
  favoriteRate: number; // How often users favorite combinations
}

interface StoredStats {
  events: any[];
  lastUpdated: number;
  aggregatedData?: DashboardStats;
}

class StatsAggregator {
  private readonly STORAGE_KEY = 'tweetcraft_stats';
  private readonly RETENTION_DAYS = 30;
  private cachedStats: DashboardStats | null = null;
  private lastCalculation: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('%c📊 StatsAggregator initialized', 'color: #17BF63; font-weight: bold');
  }

  /**
   * Get aggregated dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = Date.now();
    
    // Return cached stats if recent
    if (this.cachedStats && (now - this.lastCalculation) < this.CACHE_DURATION) {
      return this.cachedStats;
    }

    // Calculate fresh stats
    const stats = await this.calculateStats();
    this.cachedStats = stats;
    this.lastCalculation = now;
    
    return stats;
  }

  /**
   * Calculate statistics from stored events
   */
  private async calculateStats(): Promise<DashboardStats> {
    const storedData = await this.getStoredData();
    const events = this.filterRecentEvents(storedData.events || []);
    
    const stats: DashboardStats = {
      // Overall metrics
      totalReplies: this.countEventType(events, 'reply_generated'),
      repliesSent: this.countEventType(events, 'reply_sent'),
      successRate: 0,
      
      // Initialize empty arrays
      topPersonalities: [],
      topVocabulary: [],
      topRhetoric: [],
      topCombinations: [],
      peakHours: [],
      dailyTrend: [],
      
      // Performance
      avgResponseTime: 0,
      cacheHitRate: 0,
      modelUsage: [],
      
      // Engagement
      editRate: 0,
      discardRate: 0,
      favoriteRate: 0
    };

    // Calculate success rate
    if (stats.totalReplies > 0) {
      stats.successRate = (stats.repliesSent / stats.totalReplies) * 100;
    }

    // Calculate top usage patterns
    stats.topPersonalities = this.calculateTopItems(events, 'personality', 5);
    stats.topVocabulary = this.calculateTopItems(events, 'vocabulary', 5);
    stats.topRhetoric = this.calculateTopItems(events, 'rhetoric', 5);
    stats.topCombinations = this.calculateTopCombinations(events, 5);
    
    // Calculate time patterns
    stats.peakHours = this.calculatePeakHours(events);
    stats.dailyTrend = this.calculateDailyTrend(events);
    
    // Calculate performance metrics
    stats.avgResponseTime = this.calculateAvgResponseTime(events);
    stats.cacheHitRate = this.calculateCacheHitRate(events);
    stats.modelUsage = this.calculateModelUsage(events);
    
    // Calculate engagement metrics
    stats.editRate = this.calculateRate(events, 'reply_edited', 'reply_generated');
    stats.discardRate = this.calculateRate(events, 'reply_discarded', 'reply_generated');
    stats.favoriteRate = this.calculateRate(events, 'favorite_added', 'reply_generated');

    return stats;
  }

  /**
   * Get stored event data from chrome.storage
   */
  private async getStoredData(): Promise<StoredStats> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_STORAGE, key: this.STORAGE_KEY },
        (response) => {
          if (response?.data) {
            resolve(response.data);
          } else {
            resolve({ events: [], lastUpdated: Date.now() });
          }
        }
      );
    });
  }

  /**
   * Filter events to last N days
   */
  private filterRecentEvents(events: any[]): any[] {
    const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    return events.filter(event => {
      const timestamp = event.timestamp || event.data?.timestamp;
      return timestamp && timestamp > cutoffTime;
    });
  }

  /**
   * Count events of a specific type
   */
  private countEventType(events: any[], type: string): number {
    return events.filter(e => e.type === type).length;
  }

  /**
   * Calculate top items by property
   */
  private calculateTopItems(events: any[], property: string, limit: number): any[] {
    const counts = new Map<string, number>();
    
    events.forEach(event => {
      const value = event.data?.[property];
      if (value) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    });

    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  /**
   * Calculate top combinations
   */
  private calculateTopCombinations(events: any[], limit: number): any[] {
    const comboCounts = new Map<string, number>();
    
    events.forEach(event => {
      if (event.type === 'reply_generated' && event.data) {
        const combo = `${event.data.personality || ''}+${event.data.vocabulary || ''}+${event.data.rhetoric || ''}`;
        if (combo !== '++') {
          comboCounts.set(combo, (comboCounts.get(combo) || 0) + 1);
        }
      }
    });

    return Array.from(comboCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([combo, count]) => ({ combo, count }));
  }

  /**
   * Calculate peak usage hours
   */
  private calculatePeakHours(events: any[]): any[] {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const timestamp = event.timestamp || event.data?.timestamp;
      if (timestamp) {
        const hour = new Date(timestamp).getHours();
        hourCounts[hour]++;
      }
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  /**
   * Calculate daily trend (last 7 days)
   */
  private calculateDailyTrend(events: any[]): any[] {
    const dailyCounts = new Map<string, number>();
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      dailyCounts.set(dateStr, 0);
    }

    // Count events per day
    events.forEach(event => {
      const timestamp = event.timestamp || event.data?.timestamp;
      if (timestamp) {
        const dateStr = new Date(timestamp).toLocaleDateString();
        if (dailyCounts.has(dateStr)) {
          dailyCounts.set(dateStr, dailyCounts.get(dateStr)! + 1);
        }
      }
    });

    return Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }));
  }

  /**
   * Calculate average response time
   */
  private calculateAvgResponseTime(events: any[]): number {
    const apiEvents = events.filter(e => e.type === 'api_call' && e.data?.duration);
    if (apiEvents.length === 0) return 0;
    
    const total = apiEvents.reduce((sum, e) => sum + e.data.duration, 0);
    return Math.round(total / apiEvents.length);
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(events: any[]): number {
    const cacheHits = this.countEventType(events, 'cache_hit');
    const cacheMisses = this.countEventType(events, 'cache_miss');
    const total = cacheHits + cacheMisses;
    
    return total > 0 ? (cacheHits / total) * 100 : 0;
  }

  /**
   * Calculate model usage distribution
   */
  private calculateModelUsage(events: any[]): any[] {
    const modelCounts = new Map<string, number>();
    
    events.forEach(event => {
      if (event.type === 'api_call' && event.data?.model) {
        const model = event.data.model;
        modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      }
    });

    const total = Array.from(modelCounts.values()).reduce((a, b) => a + b, 0);
    
    return Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([model, count]) => ({
        model,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));
  }

  /**
   * Calculate rate between two event types
   */
  private calculateRate(events: any[], numeratorType: string, denominatorType: string): number {
    const numerator = this.countEventType(events, numeratorType);
    const denominator = this.countEventType(events, denominatorType);
    
    return denominator > 0 ? (numerator / denominator) * 100 : 0;
  }

  /**
   * Create CSS-only mini chart
   */
  createMiniBarChart(data: { label: string; value: number }[], maxHeight: number = 60): string {
    if (data.length === 0) return '<div class="no-data">No data available</div>';
    
    const maxValue = Math.max(...data.map(d => d.value));
    if (maxValue === 0) return '<div class="no-data">No activity</div>';
    
    return `
      <div class="mini-chart" style="height: ${maxHeight}px;">
        ${data.map(item => `
          <div class="chart-bar" title="${item.label}: ${item.value}">
            <div class="bar-fill" style="height: ${(item.value / maxValue) * 100}%;"></div>
            <div class="bar-label">${item.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Create CSS-only sparkline
   */
  createSparkline(data: number[], width: number = 100, height: number = 30): string {
    if (data.length === 0) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return `
      <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polyline points="${points}" fill="none" stroke="#1DA1F2" stroke-width="2"/>
      </svg>
    `;
  }
}

export const statsAggregator = new StatsAggregator();