import { TabComponent, TabManager } from './TabManager';
import UIStateManager from '@/services/uiStateManager';
import { logger } from '@/utils/logger';

interface EngagementMetrics {
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  bestPerformingReply: { text: string; engagements: number };
  worstPerformingReply: { text: string; engagements: number };
  averageResponseTime: number;
}

export class EngagementTab implements TabComponent {
  private container: HTMLElement | null = null;
  private tabManager: TabManager | null = null;
  private metrics: EngagementMetrics | null = null;

  constructor(tabManager?: TabManager) {
    this.tabManager = tabManager || null;
  }

  async onShow(): Promise<void> {
    await this.loadMetrics();
  }

  render(): string {
    if (!this.metrics) {
      this.loadMetricsSync();
    }

    return `
      <div class="engagement-tab">
        <div class="engagement-header">
          <h2>📊 Engagement Metrics</h2>
          <p class="engagement-subtitle">Track your reply performance</p>
        </div>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">👁️</div>
            <div class="metric-value">${this.metrics?.totalImpressions || 0}</div>
            <div class="metric-label">Total Impressions</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">💬</div>
            <div class="metric-value">${this.metrics?.totalEngagements || 0}</div>
            <div class="metric-label">Total Engagements</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-value">${this.metrics?.engagementRate || 0}%</div>
            <div class="metric-label">Engagement Rate</div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-value">${this.metrics?.averageResponseTime || 0}s</div>
            <div class="metric-label">Avg Response Time</div>
          </div>
        </div>

        <!-- Best/Worst Performing -->
        <div class="performance-section">
          <h3>Performance Highlights</h3>
          
          ${this.metrics?.bestPerformingReply ? `
            <div class="performance-card best">
              <div class="performance-header">
                <span class="performance-icon">🏆</span>
                <span class="performance-title">Best Performing Reply</span>
                <span class="performance-value">${this.metrics.bestPerformingReply.engagements} engagements</span>
              </div>
              <p class="performance-text">${this.metrics.bestPerformingReply.text}</p>
            </div>
          ` : ''}

          ${this.metrics?.worstPerformingReply ? `
            <div class="performance-card worst">
              <div class="performance-header">
                <span class="performance-icon">📉</span>
                <span class="performance-title">Needs Improvement</span>
                <span class="performance-value">${this.metrics.worstPerformingReply.engagements} engagements</span>
              </div>
              <p class="performance-text">${this.metrics.worstPerformingReply.text}</p>
            </div>
          ` : ''}
        </div>

        <!-- Actions -->
        <div class="engagement-actions">
          <button class="btn-refresh-metrics">🔄 Refresh Metrics</button>
          <button class="btn-export-metrics">📥 Export Data</button>
        </div>
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    this.container = container;

    // Refresh button
    const refreshBtn = container.querySelector('.btn-refresh-metrics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadMetrics());
    }

    // Export button
    const exportBtn = container.querySelector('.btn-export-metrics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportMetrics());
    }
  }

  destroy(): void {
    this.container = null;
    this.metrics = null;
  }

  private async loadMetrics(): Promise<void> {
    try {
      if (this.container) {
        UIStateManager.setLoading(this.container, true, {
          customText: 'Loading engagement metrics...',
          animationType: 'pulse'
        });
      }

      // Try to get metrics from TabManager/storage
      if (this.tabManager) {
        const storage = await this.tabManager.getStorage('engagementMetrics');
        if (storage) {
          this.metrics = storage;
        } else {
          this.metrics = this.getDefaultMetrics();
        }
      } else {
        this.metrics = this.getDefaultMetrics();
      }

      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        // Re-render with loaded metrics
        this.container.innerHTML = this.render();
        this.attachEventListeners(this.container);
      }
    } catch (error) {
      logger.error('Failed to load engagement metrics:', error);
      if (this.container) {
        UIStateManager.setLoading(this.container, false);
        UIStateManager.showError(this.container, 'Failed to load metrics');
      }
      this.metrics = this.getDefaultMetrics();
    }
  }

  private loadMetricsSync(): void {
    // For initial render, use default metrics
    this.metrics = this.getDefaultMetrics();
  }

  private getDefaultMetrics(): EngagementMetrics {
    return {
      totalImpressions: 0,
      totalEngagements: 0,
      engagementRate: 0,
      bestPerformingReply: { text: 'No data yet', engagements: 0 },
      worstPerformingReply: { text: 'No data yet', engagements: 0 },
      averageResponseTime: 0
    };
  }

  private async exportMetrics(): Promise<void> {
    if (!this.metrics) return;

    try {
      const dataStr = JSON.stringify(this.metrics, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `engagement-metrics-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      if (this.container) {
        UIStateManager.showSuccess(this.container, 'Metrics exported successfully');
      }
    } catch (error) {
      logger.error('Failed to export metrics:', error);
      if (this.container) {
        UIStateManager.showError(this.container, 'Failed to export metrics');
      }
    }
  }
}
