/**
 * Performance monitoring utility for tracking extension performance
 * Monitors API calls, DOM operations, and memory usage
 */

import { LOG_COLORS, TIMING } from '@/config/constants';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  averages: Record<string, number>;
  totals: Record<string, number>;
  counts: Record<string, number>;
  memoryUsage?: MemoryInfo;
  timestamp: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private readonly maxMetrics = 1000;
  private readonly reportInterval = 60000; // 1 minute
  private reportTimer: ReturnType<typeof setInterval> | null = null;
  private enabled = true;
  
  constructor() {
    // Check if performance API is available
    if (typeof performance === 'undefined') {
      this.enabled = false;
      console.warn('Performance API not available');
      return;
    }
    
    // Start periodic reporting
    this.startPeriodicReporting();
  }
  
  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>): string | undefined {
    if (!this.enabled) return undefined;
    
    const markName = `${name}_${Date.now()}_${Math.random()}`;
    this.marks.set(markName, performance.now());
    
    // Store metadata if provided
    if (metadata) {
      (this.marks as any)[`${markName}_metadata`] = metadata;
    }
    
    return markName;
  }
  
  /**
   * End measuring a performance metric
   */
  end(markName: string | undefined): number | undefined {
    if (!this.enabled || !markName) return undefined;
    
    const startTime = this.marks.get(markName);
    if (startTime === undefined) {
      console.warn(`Performance mark not found: ${markName}`);
      return undefined;
    }
    
    const duration = performance.now() - startTime;
    const name = markName.split('_')[0];
    const metadata = (this.marks as any)[`${markName}_metadata`];
    
    // Store metric
    this.addMetric({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });
    
    // Clean up
    this.marks.delete(markName);
    delete (this.marks as any)[`${markName}_metadata`];
    
    // Log if duration is significant
    if (duration > 1000) {
      console.log(
        `%c⚡ Performance: ${name} took ${duration.toFixed(2)}ms`,
        `color: ${duration > 3000 ? LOG_COLORS.WARNING : LOG_COLORS.INFO}`
      );
    }
    
    return duration;
  }
  
  /**
   * Measure a function's execution time
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) return fn();
    
    const mark = this.start(name, metadata);
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => {
          if (mark) this.end(mark);
        }) as T;
      }
      if (mark) this.end(mark);
      return result;
    } catch (error) {
      if (mark) this.end(mark);
      throw error;
    }
  }
  
  /**
   * Measure an async function's execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) return fn();
    
    const mark = this.start(name, metadata);
    try {
      const result = await fn();
      if (mark) this.end(mark);
      return result;
    } catch (error) {
      if (mark) this.end(mark);
      throw error;
    }
  }
  
  /**
   * Add a metric
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  /**
   * Get performance report
   */
  getReport(since?: number): PerformanceReport {
    const cutoff = since || Date.now() - this.reportInterval;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Calculate aggregates
    const aggregates: Record<string, { total: number; count: number; durations: number[] }> = {};
    
    relevantMetrics.forEach(metric => {
      if (!aggregates[metric.name]) {
        aggregates[metric.name] = { total: 0, count: 0, durations: [] };
      }
      aggregates[metric.name].total += metric.duration;
      aggregates[metric.name].count++;
      aggregates[metric.name].durations.push(metric.duration);
    });
    
    // Calculate averages and percentiles
    const averages: Record<string, number> = {};
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    
    Object.entries(aggregates).forEach(([name, data]) => {
      averages[name] = data.total / data.count;
      totals[name] = data.total;
      counts[name] = data.count;
    });
    
    // Get memory usage if available
    let memoryUsage: MemoryInfo | undefined;
    if ((performance as any).memory) {
      memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }
    
    return {
      metrics: relevantMetrics,
      averages,
      totals,
      counts,
      memoryUsage,
      timestamp: Date.now(),
    };
  }
  
  /**
   * Log performance report
   */
  logReport(): void {
    const report = this.getReport();
    
    console.log(
      '%c📊 Performance Report',
      `color: ${LOG_COLORS.PRIMARY}; font-weight: bold; font-size: 14px`
    );
    
    // Log top operations by total time
    const sortedByTotal = Object.entries(report.totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    console.log('%c  Top Operations by Total Time:', `color: ${LOG_COLORS.INFO}`);
    sortedByTotal.forEach(([name, total]) => {
      const avg = report.averages[name];
      const count = report.counts[name];
      console.log(
        `    ${name}: ${total.toFixed(2)}ms total, ${avg.toFixed(2)}ms avg (${count} calls)`
      );
    });
    
    // Log memory usage
    if (report.memoryUsage) {
      const used = (report.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const total = (report.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limit = (report.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      
      console.log('%c  Memory Usage:', `color: ${LOG_COLORS.INFO}`);
      console.log(`    Heap: ${used}MB / ${total}MB (limit: ${limit}MB)`);
    }
    
    // Log slow operations
    const slowOps = report.metrics
      .filter(m => m.duration > 1000)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    if (slowOps.length > 0) {
      console.log('%c  Slow Operations:', `color: ${LOG_COLORS.WARNING}`);
      slowOps.forEach(op => {
        console.log(
          `    ${op.name}: ${op.duration.toFixed(2)}ms`,
          op.metadata || ''
        );
      });
    }
  }
  
  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    if (!this.enabled) return;
    
    this.reportTimer = setInterval(() => {
      this.logReport();
    }, this.reportInterval);
  }
  
  /**
   * Stop periodic reporting
   */
  stopPeriodicReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }
  
  /**
   * Track DOM operation
   */
  trackDOM(operation: string, element?: Element): void {
    if (!this.enabled) return;
    
    this.addMetric({
      name: `DOM_${operation}`,
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        elementType: element?.tagName,
        elementId: element?.id,
        elementClass: element?.className,
      },
    });
  }
  
  /**
   * Track API call
   */
  trackAPI(endpoint: string, duration: number, success: boolean, metadata?: any): void {
    if (!this.enabled) return;
    
    this.addMetric({
      name: `API_${endpoint}`,
      duration,
      timestamp: Date.now(),
      metadata: {
        success,
        ...metadata,
      },
    });
  }
  
  /**
   * Track cache operation
   */
  trackCache(operation: 'hit' | 'miss' | 'set' | 'clear', key?: string): void {
    if (!this.enabled) return;
    
    this.addMetric({
      name: `Cache_${operation}`,
      duration: 0,
      timestamp: Date.now(),
      metadata: { key },
    });
  }
  
  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const report = this.getReport();
    let score = 100;
    
    // Deduct points for slow operations
    Object.entries(report.averages).forEach(([name, avg]) => {
      if (name.startsWith('API_') && avg > 3000) {
        score -= 10;
      } else if (name.startsWith('DOM_') && avg > 100) {
        score -= 5;
      } else if (avg > 5000) {
        score -= 15;
      }
    });
    
    // Deduct points for high memory usage
    if (report.memoryUsage) {
      const usage = report.memoryUsage.usedJSHeapSize / report.memoryUsage.jsHeapSizeLimit;
      if (usage > 0.8) {
        score -= 20;
      } else if (usage > 0.6) {
        score -= 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }
  
  /**
   * Export metrics for analysis
   */
  export(): string {
    const report = this.getReport(0); // Get all metrics
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Destroy the performance monitor
   */
  destroy(): void {
    this.stopPeriodicReporting();
    this.clear();
    this.enabled = false;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export decorator for automatic performance tracking
export function trackPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const className = target.constructor.name;
    const methodName = `${className}.${propertyName}`;
    
    return performanceMonitor.measureAsync(
      methodName,
      () => originalMethod.apply(this, args),
      { args: args.slice(0, 2) } // Only log first 2 args to avoid noise
    );
  };
  
  return descriptor;
}

// Export performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  API_CALL: 3000,
  DOM_OPERATION: 100,
  CACHE_OPERATION: 10,
  RENDER: 16, // 60fps
  SCRIPT_EXECUTION: 50,
} as const;