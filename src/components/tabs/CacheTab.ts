/**
 * Cache Debug Tab Component
 * Handles cache debugging and management interface
 */

import { TabComponent } from './TabManager';

export class CacheTab implements TabComponent {
  private container: HTMLElement | null = null;

  render(): string {
    return `
      <div class="tweetcraft-cache-tab">
        <div class="cache-header">
          <h3>🗄️ Cache Debug</h3>
          <div class="cache-stats">
            <span class="cache-size">0 KB</span>
            <span class="cache-items">0 items</span>
            <span class="cache-hit-rate">0%</span>
          </div>
        </div>
        
        <div class="cache-actions">
          <button class="cache-clear-btn" title="Clear all cache">
            🗑️ Clear Cache
          </button>
          <button class="cache-refresh-btn" title="Refresh cache stats">
            🔄 Refresh Stats
          </button>
          <button class="cache-export-btn" title="Export cache data">
            📥 Export Data
          </button>
        </div>
        
        <div class="cache-sections">
          <div class="cache-section">
            <h4>Prompt Cache</h4>
            <div class="cache-entries prompt-cache-entries">
              <div class="loading">Loading cache entries...</div>
            </div>
          </div>
          
          <div class="cache-section">
            <h4>Template Cache</h4>
            <div class="cache-entries template-cache-entries">
              <div class="loading">Loading cache entries...</div>
            </div>
          </div>
          
          <div class="cache-section">
            <h4>API Response Cache</h4>
            <div class="cache-entries api-cache-entries">
              <div class="loading">Loading cache entries...</div>
            </div>
          </div>
        </div>
        
        <div class="cache-performance">
          <h4>Performance Metrics</h4>
          <div class="performance-grid">
            <div class="metric">
              <span class="metric-label">Hit Rate:</span>
              <span class="metric-value hit-rate">0%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Miss Rate:</span>
              <span class="metric-value miss-rate">0%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Load Time:</span>
              <span class="metric-value load-time">0ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">Memory Usage:</span>
              <span class="metric-value memory-usage">0 MB</span>
            </div>
          </div>
        </div>
        
        <div class="cache-log">
          <h4>Cache Activity Log</h4>
          <div class="log-entries">
            <div class="log-entry">
              <span class="log-time">--:--:--</span>
              <span class="log-message">Cache debug initialized</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners(): void {
    if (!this.container) {
      this.container = document.querySelector('.tweetcraft-cache-tab');
    }
    if (!this.container) return;

    // Clear cache button
    const clearBtn = this.container.querySelector('.cache-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCache());
    }

    // Refresh stats button
    const refreshBtn = this.container.querySelector('.cache-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshStats());
    }

    // Export data button
    const exportBtn = this.container.querySelector('.cache-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCacheData());
    }

    // Load initial cache data
    this.loadCacheData();
    
    // Set up auto-refresh every 5 seconds
    this.startAutoRefresh();
  }

  cleanup(): void {
    // Stop auto-refresh
    this.stopAutoRefresh();
    
    // Clear any active timers
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  destroy(): void {
    this.cleanup();
    this.container = null;
  }

  private refreshTimer: NodeJS.Timeout | null = null;

  private async clearCache(): Promise<void> {
    try {
      // Clear all cache types
      await chrome.runtime.sendMessage({ 
        type: 'CLEAR_CACHE',
        cacheType: 'all'
      });
      
      // Update UI
      this.addLogEntry('Cache cleared successfully');
      this.refreshStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.addLogEntry('Failed to clear cache', 'error');
    }
  }

  private async refreshStats(): Promise<void> {
    try {
      // Get cache stats from background
      const stats = await chrome.runtime.sendMessage({ 
        type: 'GET_CACHE_STATS' 
      });
      
      if (stats) {
        this.updateStats(stats);
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }

  private async exportCacheData(): Promise<void> {
    try {
      // Get all cache data
      const cacheData = await chrome.runtime.sendMessage({ 
        type: 'EXPORT_CACHE_DATA' 
      });
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(cacheData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tweetcraft-cache-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.addLogEntry('Cache data exported');
    } catch (error) {
      console.error('Failed to export cache:', error);
      this.addLogEntry('Failed to export cache data', 'error');
    }
  }

  private async loadCacheData(): Promise<void> {
    try {
      // Load cache entries for each type
      const promptCache = await this.getCacheEntries('prompt');
      const templateCache = await this.getCacheEntries('template');
      const apiCache = await this.getCacheEntries('api');
      
      // Update UI with cache entries
      this.displayCacheEntries('.prompt-cache-entries', promptCache);
      this.displayCacheEntries('.template-cache-entries', templateCache);
      this.displayCacheEntries('.api-cache-entries', apiCache);
      
      // Load and display stats
      await this.refreshStats();
    } catch (error) {
      console.error('Failed to load cache data:', error);
    }
  }

  private async getCacheEntries(cacheType: string): Promise<any[]> {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_CACHE_ENTRIES',
        cacheType 
      });
      return response?.entries || [];
    } catch (error) {
      console.error(`Failed to get ${cacheType} cache entries:`, error);
      return [];
    }
  }

  private displayCacheEntries(selector: string, entries: any[]): void {
    if (!this.container) return;
    
    const container = this.container.querySelector(selector);
    if (!container) return;
    
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty">No cache entries</div>';
      return;
    }
    
    container.innerHTML = entries.map(entry => `
      <div class="cache-entry">
        <span class="entry-key">${this.truncate(entry.key, 30)}</span>
        <span class="entry-size">${this.formatSize(entry.size)}</span>
        <span class="entry-hits">${entry.hits || 0} hits</span>
        <span class="entry-age">${this.formatAge(entry.timestamp)}</span>
      </div>
    `).join('');
  }

  private updateStats(stats: any): void {
    if (!this.container) return;
    
    // Update header stats
    const sizeEl = this.container.querySelector('.cache-size');
    if (sizeEl) sizeEl.textContent = this.formatSize(stats.totalSize || 0);
    
    const itemsEl = this.container.querySelector('.cache-items');
    if (itemsEl) itemsEl.textContent = `${stats.totalItems || 0} items`;
    
    const hitRateEl = this.container.querySelector('.cache-hit-rate');
    if (hitRateEl) hitRateEl.textContent = `${stats.hitRate || 0}%`;
    
    // Update performance metrics
    const metrics = {
      '.hit-rate': `${stats.hitRate || 0}%`,
      '.miss-rate': `${stats.missRate || 0}%`,
      '.load-time': `${stats.avgLoadTime || 0}ms`,
      '.memory-usage': this.formatSize(stats.memoryUsage || 0, 'MB')
    };
    
    for (const [selector, value] of Object.entries(metrics)) {
      const el = this.container.querySelector(selector);
      if (el) el.textContent = value;
    }
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshStats();
    }, 5000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private addLogEntry(message: string, type: string = 'info'): void {
    if (!this.container) return;
    
    const logContainer = this.container.querySelector('.log-entries');
    if (!logContainer) return;
    
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-message">${message}</span>
    `;
    
    // Add to top of log
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    // Keep only last 20 entries
    while (logContainer.children.length > 20 && logContainer.lastChild) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  private truncate(str: string, maxLength: number): string {
    return str.length > maxLength 
      ? str.substring(0, maxLength) + '...' 
      : str;
  }

  private formatSize(bytes: number, unit: string = 'KB'): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = units.indexOf(unit) || 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private formatAge(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
