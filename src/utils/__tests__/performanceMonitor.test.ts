import { PerformanceMonitor } from '../performanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    // Reset any state
    PerformanceMonitor.stop();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start/stop', () => {
    it('should start monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      PerformanceMonitor.start();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance monitoring started'));
      consoleSpy.mockRestore();
    });

    it('should stop monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      PerformanceMonitor.start();
      PerformanceMonitor.stop();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance monitoring stopped'));
      consoleSpy.mockRestore();
    });

    it('should not start multiple times', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      PerformanceMonitor.start();
      PerformanceMonitor.start();
      // Should only see one "started" message
      const startMessages = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes('Performance monitoring started')
      );
      expect(startMessages).toHaveLength(1);
      consoleSpy.mockRestore();
    });
  });

  describe('measureTiming', () => {
    it('should measure operation timing', () => {
      const startTime = performance.now();
      // Simulate some work
      const endTime = startTime + 150; // 150ms operation
      
      jest.spyOn(performance, 'now').mockReturnValue(endTime);
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Measure multiple times to trigger the warning
      for (let i = 0; i < 11; i++) {
        PerformanceMonitor.measureTiming('testOperation', startTime);
      }
      
      // Should warn about slow operation (avg > 100ms)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected: testOperation')
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current metrics', () => {
      const metrics = PerformanceMonitor.getCurrentMetrics();
      
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('domMetrics');
      expect(metrics).toHaveProperty('extensionMetrics');
      
      expect(metrics.domMetrics).toHaveProperty('nodeCount');
      expect(metrics.domMetrics).toHaveProperty('listenerCount');
      expect(metrics.domMetrics).toHaveProperty('detachedNodes');
      
      expect(metrics.extensionMetrics).toHaveProperty('buttonsInjected');
      expect(metrics.extensionMetrics).toHaveProperty('observersActive');
      expect(metrics.extensionMetrics).toHaveProperty('cacheSize');
    });
  });

  describe('forceReport', () => {
    it('should force a performance report', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      PerformanceMonitor.forceReport();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Report'),
        expect.any(Object)
      );
      
      logSpy.mockRestore();
    });
  });
});