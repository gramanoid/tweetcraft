/**
 * Comprehensive Export Service
 * Provides unified export functionality for all TweetCraft data
 */

import { smartDefaults } from './smartDefaults';
import { usageTracker } from './usageTracker';
import { arsenalService } from './arsenalService';
import { CacheService } from './cache';
import { statsAggregator } from './statsAggregator';
import { visualFeedback } from '../ui/visualFeedback';

export interface ExportOptions {
  includeUsageStats?: boolean;
  includeArsenalData?: boolean;
  includeWeeklyStats?: boolean;
  includeCacheStats?: boolean;
  includeSettings?: boolean;
  formatType?: 'json' | 'csv';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportData {
  metadata: {
    version: string;
    timestamp: string;
    exportType: string;
  };
  usageStats?: any;
  arsenalData?: any;
  weeklyStats?: any;
  cacheStats?: any;
  settings?: any;
}

/**
 * Comprehensive Export Service for TweetCraft Data
 */
class ExportService {
  /**
   * Export all TweetCraft data in comprehensive format
   */
  async exportComprehensiveData(options: ExportOptions = {}): Promise<void> {
    const {
      includeUsageStats = true,
      includeArsenalData = true,
      includeWeeklyStats = true,
      includeCacheStats = true,
      includeSettings = true,
      formatType = 'json',
      dateRange
    } = options;

    try {
      console.log('%c📊 Starting comprehensive data export', 'color: #1DA1F2; font-weight: bold');
      
      const exportData: ExportData = {
        metadata: {
          version: '0.0.20',
          timestamp: new Date().toISOString(),
          exportType: 'comprehensive'
        }
      };

      // Collect usage statistics
      if (includeUsageStats) {
        const stats = usageTracker.getStats();
        const dashboardStats = await statsAggregator.getDashboardStats();
        exportData.usageStats = {
          basic: stats,
          dashboard: dashboardStats,
          patterns: await smartDefaults.getTimeOfDayPatterns()
        };
        console.log('%c  ✓ Usage stats collected', 'color: #657786');
      }

      // Collect Arsenal data
      if (includeArsenalData) {
        const categories = arsenalService.getCategories();
        const replies = Array.from(arsenalService['arsenal'].values()); // Access private property
        exportData.arsenalData = {
          categories,
          replies,
          usage: arsenalService.getStats()
        };
        console.log('%c  ✓ Arsenal data collected', 'color: #657786');
      }

      // Collect weekly statistics
      if (includeWeeklyStats) {
        const weeklyStats = [];
        // Export last 12 weeks of data
        for (let i = 0; i >= -12; i--) {
          const weekData = smartDefaults.getWeeklyStats(i);
          if (weekData.totalReplies > 0) {
            weeklyStats.push({
              weekOffset: i,
              ...weekData
            });
          }
        }
        exportData.weeklyStats = weeklyStats;
        console.log('%c  ✓ Weekly stats collected', 'color: #657786');
      }

      // Collect cache statistics  
      if (includeCacheStats) {
        // CacheService is a static class
        exportData.cacheStats = {
          replyCache: {
            size: CacheService['cache']?.size || 0,
            entries: Array.from(CacheService['cache']?.keys() || [])
          }
        };
        console.log('%c  ✓ Cache stats collected', 'color: #657786');
      }

      // Collect settings
      if (includeSettings) {
        const settings = await chrome.storage.local.get(null);
        // Filter out sensitive data
        const filteredSettings = { ...settings };
        delete filteredSettings.apiKey;
        exportData.settings = filteredSettings;
        console.log('%c  ✓ Settings collected', 'color: #657786');
      }

      // Export data in requested format
      if (formatType === 'csv') {
        await this.exportAsCSV(exportData);
      } else {
        await this.exportAsJSON(exportData);
      }

      console.log('%c✅ Comprehensive export completed', 'color: #17BF63; font-weight: bold');
      visualFeedback.showToast('Data export completed successfully', { type: 'success' });
    } catch (error) {
      console.error('%c❌ Export failed:', 'color: #DC3545', error);
      visualFeedback.showToast('Export failed: ' + (error as Error).message, { type: 'error' });
    }
  }

  /**
   * Export usage analytics in detailed format
   */
  async exportUsageAnalytics(): Promise<void> {
    try {
      const stats = usageTracker.getStats();
      const patterns = await smartDefaults.getTimeOfDayPatterns();
      
      const analyticsData = {
        metadata: {
          version: '0.0.20',
          timestamp: new Date().toISOString(),
          exportType: 'usage_analytics'
        },
        summary: {
          totalEvents: stats.totalEvents,
          successRate: Math.round(stats.successRate * 100)
        },
        personalityUsage: Object.fromEntries(stats.personalityUsage || new Map()),
        vocabularyUsage: Object.fromEntries(stats.vocabularyUsage || new Map()),
        lengthPacingUsage: Object.fromEntries(stats.lengthPacingUsage || new Map()),
        combinationUsage: stats.combinationUsage || {},
        timePatterns: patterns,
        weeklyBreakdown: this.generateWeeklyBreakdown()
      };

      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, `tweetcraft-analytics-${new Date().toISOString().split('T')[0]}.json`);
      
      console.log('%c📊 Usage analytics exported', 'color: #17BF63; font-weight: bold');
      visualFeedback.showToast('Usage analytics exported', { type: 'success' });
    } catch (error) {
      console.error('Failed to export analytics:', error);
      visualFeedback.showToast('Analytics export failed', { type: 'error' });
    }
  }

  /**
   * Export Arsenal data with categories and usage stats
   */
  async exportArsenalData(): Promise<void> {
    try {
      const categories = arsenalService.getCategories();
      const replies = Array.from(arsenalService['arsenal'].values());
      const usage = arsenalService.getStats();
      
      const arsenalData = {
        metadata: {
          version: '0.0.20',
          timestamp: new Date().toISOString(),
          exportType: 'arsenal_data'
        },
        summary: {
          totalReplies: replies.length,
          totalCategories: categories.length,
          totalUsage: Object.values(usage).reduce((sum: number, count: any) => sum + count, 0)
        },
        categories,
        replies,
        usage
      };

      const blob = new Blob([JSON.stringify(arsenalData, null, 2)], { type: 'application/json' });
      this.downloadFile(blob, `tweetcraft-arsenal-${new Date().toISOString().split('T')[0]}.json`);
      
      console.log('%c🎯 Arsenal data exported', 'color: #17BF63; font-weight: bold');
      visualFeedback.showToast('Arsenal data exported', { type: 'success' });
    } catch (error) {
      console.error('Failed to export arsenal:', error);
      visualFeedback.showToast('Arsenal export failed', { type: 'error' });
    }
  }

  /**
   * Export data as JSON file
   */
  private async exportAsJSON(data: ExportData): Promise<void> {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = `tweetcraft-export-${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(blob, filename);
  }

  /**
   * Export data as CSV file
   */
  private async exportAsCSV(data: ExportData): Promise<void> {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const filename = `tweetcraft-export-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadFile(blob, filename);
  }

  /**
   * Convert export data to CSV format
   */
  private convertToCSV(data: ExportData): string {
    const rows: string[] = [];
    
    // Add metadata
    rows.push('TweetCraft Data Export');
    rows.push(`Generated: ${data.metadata.timestamp}`);
    rows.push(`Version: ${data.metadata.version}`);
    rows.push('');

    // Add usage stats if available
    if (data.usageStats) {
      rows.push('Usage Statistics');
      rows.push('Metric,Value');
      rows.push(`Total Events,${data.usageStats.basic.totalEvents}`);
      rows.push(`Success Rate,${data.usageStats.basic.successRate}%`);
      
      if (data.usageStats.basic.personalityUsage) {
        rows.push('');
        rows.push('Personality Usage');
        rows.push('Personality,Count');
        for (const [personality, count] of Object.entries(data.usageStats.basic.personalityUsage)) {
          rows.push(`${personality},${count}`);
        }
      }
    }

    // Add weekly stats if available
    if (data.weeklyStats) {
      rows.push('');
      rows.push('Weekly Statistics');
      rows.push('Week Offset,Total Replies,Success Rate,Top Personality,Most Active Day');
      for (const week of data.weeklyStats) {
        rows.push(`${week.weekOffset},${week.totalReplies},${week.successRate}%,${week.topPersonality || 'N/A'},${week.mostActiveDay || 'N/A'}`);
      }
    }

    return rows.join('\n');
  }

  /**
   * Generate weekly breakdown for analytics
   */
  private generateWeeklyBreakdown(): any[] {
    const breakdown = [];
    for (let i = 0; i >= -8; i--) {
      const weekStats = smartDefaults.getWeeklyStats(i);
      breakdown.push({
        weekOffset: i,
        label: i === 0 ? 'This Week' : i === -1 ? 'Last Week' : `${Math.abs(i)} weeks ago`,
        ...weekStats
      });
    }
    return breakdown;
  }

  /**
   * Download file to user's system
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get export capabilities and current data sizes
   */
  async getExportInfo(): Promise<{
    availableExports: string[];
    dataSizes: Record<string, number>;
    recommendations: string[];
  }> {
    const stats = usageTracker.getStats();
    const replies = Array.from(arsenalService['arsenal'].values());
    
    return {
      availableExports: [
        'Comprehensive Data Export',
        'Usage Analytics Only',
        'Arsenal Data Only',
        'Weekly Statistics',
        'Custom Templates',
        'Cache Statistics'
      ],
      dataSizes: {
        usageStats: JSON.stringify(stats).length,
        arsenalReplies: replies.length,
        weeklyStats: 12, // 12 weeks of data
        customTemplates: 0 // Would need to check actual templates
      },
      recommendations: [
        stats.totalEvents > 100 ? 'Full analytics export recommended' : 'Basic export sufficient',
        replies.length > 50 ? 'Arsenal backup recommended' : 'Arsenal backup optional',
        'Weekly CSV export for spreadsheet analysis'
      ]
    };
  }
}

// Export singleton instance
export const exportService = new ExportService();

// Export class for testing
export { ExportService };