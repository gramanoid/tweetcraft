/**
 * Cache Debug Statistics View
 * Shows comprehensive cache statistics and debugging information
 */

import { CacheService } from '../services/cache';
import { PromptCache } from '../services/promptCache';
import { DOMCache } from '../utils/domCache';

export interface CacheDebugStats {
  replyCache: {
    size: number;
    entries: string[];
  };
  promptCache: {
    hits: number;
    misses: number;
    evictions: number;
    currentSize: number;
    maxSize: number;
    entryCount: number;
    hitRate: number;
  };
  domCache: {
    hits: number;
    misses: number;
    weakHits: number;
    weakMisses: number;
    size: number;
    hitRate: number;
  };
  totalMemoryEstimate: number;
}

export class CacheDebugView {
  private container: HTMLElement | null = null;
  private refreshInterval: number | null = null;
  private promptCache: PromptCache;

  constructor() {
    // Initialize prompt cache instance
    this.promptCache = new PromptCache();
  }

  /**
   * Create the cache debug view
   */
  create(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tweetcraft-cache-debug';
    container.innerHTML = this.generateHTML();
    
    this.container = container;
    this.attachEventListeners();
    this.loadCacheStats();
    this.startAutoRefresh();
    
    return container;
  }

  /**
   * Generate HTML structure
   */
  private generateHTML(): string {
    return `
      <div class="cache-debug-container">
        <div class="cache-header">
          <h3>🔍 Cache Debug Statistics</h3>
          <div class="cache-controls">
            <button class="refresh-btn" title="Refresh Stats">🔄</button>
            <button class="clear-all-btn" title="Clear All Caches">🗑️ Clear All</button>
            <label class="auto-refresh">
              <input type="checkbox" checked> Auto-refresh
            </label>
          </div>
        </div>
        
        <div class="cache-summary">
          <div class="summary-card total-memory">
            <span class="summary-label">Total Memory</span>
            <span class="summary-value" id="total-memory">--</span>
          </div>
          <div class="summary-card overall-hit-rate">
            <span class="summary-label">Overall Hit Rate</span>
            <span class="summary-value" id="overall-hit-rate">--%</span>
          </div>
          <div class="summary-card active-caches">
            <span class="summary-label">Active Caches</span>
            <span class="summary-value" id="active-caches">3</span>
          </div>
        </div>
        
        <div class="cache-sections">
          <!-- Reply Cache Section -->
          <div class="cache-section reply-cache">
            <div class="section-header">
              <h4>💬 Reply Cache</h4>
              <button class="clear-cache-btn" data-cache="reply">Clear</button>
            </div>
            <div class="section-stats">
              <div class="stat-item">
                <span class="stat-label">Entries:</span>
                <span class="stat-value" id="reply-entries">0</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Cache Duration:</span>
                <span class="stat-value">30 min</span>
              </div>
            </div>
            <div class="cache-entries" id="reply-cache-entries">
              <div class="no-entries">No cached entries</div>
            </div>
          </div>
          
          <!-- Prompt Cache Section -->
          <div class="cache-section prompt-cache">
            <div class="section-header">
              <h4>📝 Prompt Cache (LRU)</h4>
              <button class="clear-cache-btn" data-cache="prompt">Clear</button>
            </div>
            <div class="section-stats">
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Hits:</span>
                  <span class="stat-value success" id="prompt-hits">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Misses:</span>
                  <span class="stat-value error" id="prompt-misses">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Hit Rate:</span>
                  <span class="stat-value" id="prompt-hit-rate">0%</span>
                </div>
              </div>
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Size:</span>
                  <span class="stat-value" id="prompt-size">0/100</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Memory:</span>
                  <span class="stat-value" id="prompt-memory">0 KB</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Evictions:</span>
                  <span class="stat-value warning" id="prompt-evictions">0</span>
                </div>
              </div>
            </div>
            <div class="cache-visualization">
              <div class="memory-bar">
                <div class="memory-used" id="prompt-memory-bar" style="width: 0%"></div>
              </div>
              <span class="memory-label">Memory Usage</span>
            </div>
          </div>
          
          <!-- DOM Cache Section -->
          <div class="cache-section dom-cache">
            <div class="section-header">
              <h4>🌐 DOM Cache</h4>
              <button class="clear-cache-btn" data-cache="dom">Clear</button>
            </div>
            <div class="section-stats">
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Regular Hits:</span>
                  <span class="stat-value success" id="dom-hits">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Regular Misses:</span>
                  <span class="stat-value error" id="dom-misses">0</span>
                </div>
              </div>
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Weak Hits:</span>
                  <span class="stat-value success" id="dom-weak-hits">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Weak Misses:</span>
                  <span class="stat-value error" id="dom-weak-misses">0</span>
                </div>
              </div>
              <div class="stat-row">
                <div class="stat-item">
                  <span class="stat-label">Hit Rate:</span>
                  <span class="stat-value" id="dom-hit-rate">0%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Cache Size:</span>
                  <span class="stat-value" id="dom-size">0</span>
                </div>
              </div>
            </div>
            <div class="cache-info">
              <small>TTL: 5 seconds | Auto-invalidates on DOM mutations</small>
            </div>
          </div>
        </div>
        
        <div class="debug-actions">
          <button class="export-stats-btn">📊 Export Stats</button>
          <button class="performance-test-btn">⚡ Run Performance Test</button>
        </div>
      </div>
    `;
  }

  /**
   * Load and display cache statistics
   */
  private async loadCacheStats(): Promise<void> {
    try {
      const stats = this.collectCacheStats();
      this.displayStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  }

  /**
   * Collect statistics from all cache services
   */
  private collectCacheStats(): CacheDebugStats {
    // Reply cache stats
    const replyCacheStats = CacheService.getCacheStats();
    
    // Prompt cache stats
    const promptCacheStats = this.promptCache.getStats();
    const promptHitRate = promptCacheStats.hits + promptCacheStats.misses > 0
      ? Math.round((promptCacheStats.hits / (promptCacheStats.hits + promptCacheStats.misses)) * 100)
      : 0;
    
    // DOM cache stats
    const domCacheStats = DOMCache.getMetrics();
    const domTotalQueries = domCacheStats.cacheHits + domCacheStats.cacheMisses + 
                            domCacheStats.weakCacheHits + domCacheStats.weakCacheMisses;
    const domTotalHits = domCacheStats.cacheHits + domCacheStats.weakCacheHits;
    const domHitRate = domTotalQueries > 0
      ? Math.round((domTotalHits / domTotalQueries) * 100)
      : 0;
    
    // Estimate total memory usage (DOM cache size not directly available)
    const estimatedDomCacheSize = domCacheStats.cacheHits + domCacheStats.cacheMisses; // Estimate by total queries
    const totalMemory = 
      (replyCacheStats.size * 2000) + // Estimate 2KB per reply
      (promptCacheStats.currentSize) +
      (estimatedDomCacheSize * 100); // Estimate 100 bytes per DOM entry
    
    return {
      replyCache: replyCacheStats,
      promptCache: {
        ...promptCacheStats,
        hitRate: promptHitRate
      },
      domCache: {
        hits: domCacheStats.cacheHits,
        misses: domCacheStats.cacheMisses,
        weakHits: domCacheStats.weakCacheHits,
        weakMisses: domCacheStats.weakCacheMisses,
        size: estimatedDomCacheSize,
        hitRate: domHitRate
      },
      totalMemoryEstimate: totalMemory
    };
  }

  /**
   * Display statistics in the UI
   */
  private displayStats(stats: CacheDebugStats): void {
    if (!this.container) return;

    // Update summary
    this.updateElement('#total-memory', this.formatBytes(stats.totalMemoryEstimate));
    
    const overallHits = stats.promptCache.hits + stats.domCache.hits + stats.domCache.weakHits;
    const overallTotal = overallHits + stats.promptCache.misses + 
                        stats.domCache.misses + stats.domCache.weakMisses;
    const overallHitRate = overallTotal > 0 
      ? Math.round((overallHits / overallTotal) * 100) 
      : 0;
    this.updateElement('#overall-hit-rate', `${overallHitRate}%`);

    // Update reply cache
    this.updateElement('#reply-entries', stats.replyCache.size.toString());
    this.displayReplyCacheEntries(stats.replyCache.entries);

    // Update prompt cache
    this.updateElement('#prompt-hits', stats.promptCache.hits.toString());
    this.updateElement('#prompt-misses', stats.promptCache.misses.toString());
    this.updateElement('#prompt-hit-rate', `${stats.promptCache.hitRate}%`);
    this.updateElement('#prompt-size', `${stats.promptCache.entryCount}/${stats.promptCache.maxSize}`);
    this.updateElement('#prompt-memory', this.formatBytes(stats.promptCache.currentSize));
    this.updateElement('#prompt-evictions', stats.promptCache.evictions.toString());
    
    // Update memory bar
    const memoryPercent = Math.min(100, (stats.promptCache.currentSize / (5 * 1024 * 1024)) * 100);
    const memoryBar = this.container.querySelector('#prompt-memory-bar') as HTMLElement;
    if (memoryBar) {
      memoryBar.style.width = `${memoryPercent}%`;
      memoryBar.className = `memory-used ${memoryPercent > 80 ? 'warning' : memoryPercent > 90 ? 'danger' : ''}`;
    }

    // Update DOM cache
    this.updateElement('#dom-hits', stats.domCache.hits.toString());
    this.updateElement('#dom-misses', stats.domCache.misses.toString());
    this.updateElement('#dom-weak-hits', stats.domCache.weakHits.toString());
    this.updateElement('#dom-weak-misses', stats.domCache.weakMisses.toString());
    this.updateElement('#dom-hit-rate', `${stats.domCache.hitRate}%`);
    this.updateElement('#dom-size', stats.domCache.size.toString());
  }

  /**
   * Display reply cache entries
   */
  private displayReplyCacheEntries(entries: string[]): void {
    const container = this.container?.querySelector('#reply-cache-entries');
    if (!container) return;

    if (entries.length === 0) {
      container.innerHTML = '<div class="no-entries">No cached entries</div>';
      return;
    }

    container.innerHTML = entries.slice(0, 5).map(entry => `
      <div class="cache-entry">
        <span class="entry-key">${entry}</span>
      </div>
    `).join('');

    if (entries.length > 5) {
      container.innerHTML += `<div class="more-entries">...and ${entries.length - 5} more</div>`;
    }
  }

  /**
   * Update element text content
   */
  private updateElement(selector: string, text: string): void {
    const element = this.container?.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    this.refreshInterval = window.setInterval(() => {
      const autoRefresh = this.container?.querySelector('.auto-refresh input') as HTMLInputElement;
      if (autoRefresh?.checked) {
        this.loadCacheStats();
      }
    }, 2000);
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Run performance test
   */
  private runPerformanceTest(): void {
    console.log('%c⚡ Running cache performance test...', 'color: #FFD700; font-weight: bold');
    
    const testResults = {
      replyCacheSpeed: 0,
      promptCacheSpeed: 0,
      domCacheSpeed: 0
    };

    // Test reply cache
    const start1 = performance.now();
    for (let i = 0; i < 100; i++) {
      CacheService.get(`test-${i}`, 'professional');
    }
    testResults.replyCacheSpeed = performance.now() - start1;

    // Test prompt cache
    const start2 = performance.now();
    for (let i = 0; i < 100; i++) {
      this.promptCache.get({ templateId: `test-${i}`, toneId: 'professional' });
    }
    testResults.promptCacheSpeed = performance.now() - start2;

    // Test DOM cache
    const start3 = performance.now();
    for (let i = 0; i < 100; i++) {
      DOMCache.querySelector('.test-selector');
    }
    testResults.domCacheSpeed = performance.now() - start3;

    console.log('%c📊 Performance Test Results:', 'color: #17BF63; font-weight: bold');
    console.table(testResults);

    alert(`Cache Performance Test Results:
    • Reply Cache: ${testResults.replyCacheSpeed.toFixed(2)}ms
    • Prompt Cache: ${testResults.promptCacheSpeed.toFixed(2)}ms  
    • DOM Cache: ${testResults.domCacheSpeed.toFixed(2)}ms
    
    Total: ${(testResults.replyCacheSpeed + testResults.promptCacheSpeed + testResults.domCacheSpeed).toFixed(2)}ms for 300 operations`);
  }

  /**
   * Export statistics as JSON
   */
  private exportStats(): void {
    const stats = this.collectCacheStats();
    const dataStr = JSON.stringify(stats, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-stats-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('%c📊 Cache stats exported', 'color: #17BF63; font-weight: bold');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Refresh button
    const refreshBtn = this.container.querySelector('.refresh-btn');
    refreshBtn?.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      this.loadCacheStats();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });

    // Clear all caches button
    this.container.querySelector('.clear-all-btn')?.addEventListener('click', () => {
      if (confirm('Clear all caches? This will remove all cached data.')) {
        CacheService.clear();
        this.promptCache.clear();
        DOMCache.clear();
        this.loadCacheStats();
        console.log('%c🗑️ All caches cleared', 'color: #FF6B6B; font-weight: bold');
      }
    });

    // Individual cache clear buttons
    this.container.querySelectorAll('.clear-cache-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cache = (e.target as HTMLElement).dataset.cache;
        switch(cache) {
          case 'reply':
            CacheService.clear();
            break;
          case 'prompt':
            this.promptCache.clear();
            break;
          case 'dom':
            DOMCache.clear();
            break;
        }
        this.loadCacheStats();
        console.log(`%c🗑️ ${cache} cache cleared`, 'color: #FF6B6B; font-weight: bold');
      });
    });

    // Auto-refresh checkbox
    this.container.querySelector('.auto-refresh input')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      if (checked) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });

    // Export stats button
    this.container.querySelector('.export-stats-btn')?.addEventListener('click', () => {
      this.exportStats();
    });

    // Performance test button
    this.container.querySelector('.performance-test-btn')?.addEventListener('click', () => {
      this.runPerformanceTest();
    });
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.container = null;
  }
}

// Export singleton instance
export const cacheDebugView = new CacheDebugView();