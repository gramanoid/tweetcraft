/**
 * Performance Monitor for TweetCraft
 * Tracks memory usage, detects leaks, and monitors performance metrics
 */

import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  domMetrics: {
    nodeCount: number;
    listenerCount: number;
    detachedNodes: number;
  };
  extensionMetrics: {
    buttonsInjected: number;
    observersActive: number;
    cacheSize: number;
  };
}

interface MemorySnapshot {
  timestamp: number;
  heapSize: number;
  nodeCount: number;
}

export class PerformanceMonitor {
  private static snapshots: MemorySnapshot[] = [];
  private static readonly MAX_SNAPSHOTS = 20;
  private static readonly LEAK_THRESHOLD = 5 * 1024 * 1024; // 5MB growth threshold
  private static readonly MONITOR_INTERVAL = 30000; // 30 seconds
  private static monitorTimer: NodeJS.Timeout | null = null;
  
  // Metrics tracking
  private static metrics = {
    operationTimings: new Map<string, number[]>(),
    memoryWarnings: 0,
    performanceWarnings: 0,
    lastReport: Date.now()
  };
  
  /**
   * Start monitoring performance
   */
  static start(): void {
    if (this.monitorTimer) {
      return; // Already running
    }
    
    logger.log('🚀 Performance monitoring started');
    
    // Take initial snapshot
    this.takeSnapshot();
    
    // Set up periodic monitoring
    this.monitorTimer = setInterval(() => {
      this.checkPerformance();
    }, this.MONITOR_INTERVAL);
    
    // Monitor long tasks
    this.monitorLongTasks();
  }
  
  /**
   * Stop monitoring
   */
  static stop(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    logger.log('Performance monitoring stopped');
  }
  
  /**
   * Take a memory snapshot
   */
  private static takeSnapshot(): void {
    if (!(performance as any).memory) {
      return; // Not supported in this browser
    }
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapSize: (performance as any).memory.usedJSHeapSize,
      nodeCount: document.querySelectorAll('*').length
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
  }
  
  /**
   * Check for performance issues
   */
  private static checkPerformance(): void {
    this.takeSnapshot();
    
    // Check for memory leaks
    this.checkForMemoryLeaks();
    
    // Check DOM health
    this.checkDOMHealth();
    
    // Report metrics periodically
    const now = Date.now();
    if (now - this.metrics.lastReport > 300000) { // Every 5 minutes
      this.reportMetrics();
      this.metrics.lastReport = now;
    }
  }
  
  /**
   * Check for potential memory leaks
   */
  private static checkForMemoryLeaks(): void {
    if (this.snapshots.length < 3) {
      return; // Need at least 3 snapshots
    }
    
    // Check if memory is consistently growing
    let growthCount = 0;
    let totalGrowth = 0;
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const growth = this.snapshots[i].heapSize - this.snapshots[i - 1].heapSize;
      if (growth > 0) {
        growthCount++;
        totalGrowth += growth;
      }
    }
    
    // If memory grew in most snapshots and total growth exceeds threshold
    if (growthCount > this.snapshots.length * 0.7 && totalGrowth > this.LEAK_THRESHOLD) {
      this.metrics.memoryWarnings++;
      logger.warn(`⚠️ Potential memory leak detected! Growth: ${(totalGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Trigger cleanup
      this.performCleanup();
    }
  }
  
  /**
   * Check DOM health
   */
  private static checkDOMHealth(): void {
    const nodeCount = document.querySelectorAll('*').length;
    const detachedNodes = this.countDetachedNodes();
    const eventListeners = this.countEventListeners();
    
    // Warn if DOM is getting too large
    if (nodeCount > 10000) {
      this.metrics.performanceWarnings++;
      logger.warn(`⚠️ High DOM node count: ${nodeCount}`);
    }
    
    // Warn if too many detached nodes
    if (detachedNodes > 100) {
      logger.warn(`⚠️ High detached node count: ${detachedNodes}`);
    }
    
    // Warn if too many event listeners
    if (eventListeners > 500) {
      logger.warn(`⚠️ High event listener count: ${eventListeners}`);
    }
  }
  
  /**
   * Count detached DOM nodes
   */
  private static countDetachedNodes(): number {
    // This is an approximation - checking for nodes with WeakMap references
    const allNodes = document.querySelectorAll('*');
    let detached = 0;
    
    allNodes.forEach(node => {
      if (!document.body.contains(node)) {
        detached++;
      }
    });
    
    return detached;
  }
  
  /**
   * Count event listeners (approximation)
   */
  private static countEventListeners(): number {
    // Get all elements with data attributes that might have listeners
    const elementsWithListeners = document.querySelectorAll('[onclick], [onchange], [oninput], [data-listener]');
    
    // Estimate based on common patterns
    const buttonsWithListeners = document.querySelectorAll('button, [role="button"], .smart-reply-btn');
    
    return elementsWithListeners.length + buttonsWithListeners.length;
  }
  
  /**
   * Perform cleanup to free memory
   */
  private static performCleanup(): void {
    logger.log('🧹 Performing memory cleanup...');
    
    // Clear old cache entries
    if ((window as any).__smartReplyCache) {
      const cache = (window as any).__smartReplyCache;
      const now = Date.now();
      
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > 300000) { // 5 minutes
          cache.delete(key);
        }
      }
    }
    
    // Remove orphaned DOM elements
    const orphanedElements = document.querySelectorAll('.smart-reply-popup:not(.visible), .smart-reply-btn-duplicate');
    orphanedElements.forEach(el => el.remove());
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    logger.log('✅ Cleanup completed');
  }
  
  /**
   * Monitor long tasks that block the main thread
   */
  private static monitorLongTasks(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            logger.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Long task monitoring not supported
    }
  }
  
  /**
   * Measure operation timing
   */
  static measureTiming(operation: string, startTime: number): void {
    const duration = performance.now() - startTime;
    
    if (!this.metrics.operationTimings.has(operation)) {
      this.metrics.operationTimings.set(operation, []);
    }
    
    const timings = this.metrics.operationTimings.get(operation)!;
    timings.push(duration);
    
    // Keep only last 100 measurements
    if (timings.length > 100) {
      timings.shift();
    }
    
    // Warn if operation is consistently slow
    if (timings.length > 10) {
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      if (avgTime > 100) {
        logger.warn(`⚠️ Slow operation detected: ${operation} avg ${avgTime.toFixed(2)}ms`);
      }
    }
  }
  
  /**
   * Report performance metrics
   */
  private static reportMetrics(): void {
    const metrics: PerformanceMetrics = {
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      },
      domMetrics: {
        nodeCount: document.querySelectorAll('*').length,
        listenerCount: this.countEventListeners(),
        detachedNodes: this.countDetachedNodes()
      },
      extensionMetrics: {
        buttonsInjected: document.querySelectorAll('.smart-reply-btn').length,
        observersActive: document.querySelectorAll('[data-observer-active]').length,
        cacheSize: (window as any).__smartReplyCache?.size || 0
      }
    };
    
    logger.log('📊 Performance Report', metrics);
    
    // Log operation timings
    this.metrics.operationTimings.forEach((timings, operation) => {
      if (timings.length > 0) {
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        const max = Math.max(...timings);
        const min = Math.min(...timings);
        
        logger.log(`⏱️ ${operation}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
      }
    });
    
    // Log warnings summary
    if (this.metrics.memoryWarnings > 0 || this.metrics.performanceWarnings > 0) {
      logger.warn(`⚠️ Warnings: Memory=${this.metrics.memoryWarnings}, Performance=${this.metrics.performanceWarnings}`);
    }
  }
  
  /**
   * Get current metrics
   */
  static getCurrentMetrics(): PerformanceMetrics {
    return {
      memoryUsage: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      },
      domMetrics: {
        nodeCount: document.querySelectorAll('*').length,
        listenerCount: this.countEventListeners(),
        detachedNodes: this.countDetachedNodes()
      },
      extensionMetrics: {
        buttonsInjected: document.querySelectorAll('.smart-reply-btn').length,
        observersActive: document.querySelectorAll('[data-observer-active]').length,
        cacheSize: (window as any).__smartReplyCache?.size || 0
      }
    };
  }
  
  /**
   * Force a performance report
   */
  static forceReport(): void {
    this.reportMetrics();
  }
}