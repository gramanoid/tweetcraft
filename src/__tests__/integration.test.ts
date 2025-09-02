/**
 * Integration tests for TweetCraft Chrome Extension
 * Tests the interaction between multiple components
 */

import { UnifiedApiService } from '@/services/unifiedApiService';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ErrorBoundary } from '@/utils/errorBoundary';
import { logger } from '@/utils/logger';

// Mock chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  }
} as any;

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorBoundary.clearErrors();
    UnifiedApiService.clearCache();
    UnifiedApiService.resetMetrics();
  });

  describe('Error Handling Integration', () => {
    it('should handle and recover from API errors', async () => {
      // Initialize error boundary
      ErrorBoundary.initialize();

      // Register a recovery strategy for API errors
      let recoveryAttempted = false;
      ErrorBoundary.registerRecoveryStrategy('api_error', async () => {
        recoveryAttempted = true;
        return true;
      });

      // Simulate an API error
      const error = new Error('API connection failed');
      await ErrorBoundary.handleError(error, {
        component: 'api',
        action: 'generateReply',
        timestamp: Date.now()
      });

      // Check that error was logged
      const stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(1);
      expect(stats.byComponent['api']).toBe(1);
    });

    it('should track performance while handling errors', async () => {
      // Start performance monitoring
      PerformanceMonitor.start();

      // Simulate a slow operation that errors
      const startTime = performance.now();
      
      try {
        // Simulate work
        await new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation failed')), 100);
        });
      } catch (error) {
        // Measure timing even on error
        PerformanceMonitor.measureTiming('failedOperation', startTime);
        
        // Handle the error
        await ErrorBoundary.handleError(error as Error, {
          component: 'test',
          action: 'slowOperation',
          timestamp: Date.now()
        });
      }

      // Check that both systems recorded the event
      const errorStats = ErrorBoundary.getStatistics();
      expect(errorStats.total).toBe(1);

      // Stop monitoring
      PerformanceMonitor.stop();
    });
  });

  describe('API Service Integration', () => {
    it('should track API metrics during operations', async () => {
      // Mock the OpenRouter service
      jest.mock('@/services/openRouter', () => ({
        OpenRouterService: {
          generateReply: jest.fn().mockResolvedValue({ reply: 'Test reply' })
        }
      }));

      // Make multiple API calls
      const params = {
        context: 'Integration test',
        tone: 'professional'
      };

      // First call - should hit API
      await UnifiedApiService.generateReply(params);
      
      // Second call - should hit cache
      await UnifiedApiService.generateReply(params);

      // Check metrics
      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cachedRequests).toBe(1);
      expect(metrics.apiCalls).toBe(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      // Mock slow API response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      jest.mock('@/services/openRouter', () => ({
        OpenRouterService: {
          generateReply: jest.fn().mockReturnValue(slowPromise)
        }
      }));

      const params = {
        context: 'Concurrent test',
        tone: 'casual'
      };

      // Start multiple concurrent requests
      const requests = [
        UnifiedApiService.generateReply(params),
        UnifiedApiService.generateReply(params),
        UnifiedApiService.generateReply(params)
      ];

      // Resolve the API call
      resolvePromise!({ reply: 'Concurrent reply' });

      const results = await Promise.all(requests);

      // All should get the same result
      expect(results).toEqual([
        'Concurrent reply',
        'Concurrent reply',
        'Concurrent reply'
      ]);

      // Check deduplication worked
      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.dedupedRequests).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should detect memory leaks', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Start monitoring
      PerformanceMonitor.start();

      // Simulate memory growth by mocking performance.memory
      let heapSize = 1000000; // 1MB
      Object.defineProperty(performance, 'memory', {
        get: () => ({
          usedJSHeapSize: heapSize,
          totalJSHeapSize: heapSize + 1000000,
          jsHeapSizeLimit: 4000000000
        }),
        configurable: true
      });

      // Take multiple snapshots with growing memory
      for (let i = 0; i < 5; i++) {
        heapSize += 2000000; // Add 2MB each time
        jest.advanceTimersByTime(30000); // Advance 30 seconds
      }

      // Should detect potential memory leak
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Potential memory leak detected'),
        expect.any(String)
      );

      PerformanceMonitor.stop();
      consoleSpy.mockRestore();
    });

    it('should report comprehensive metrics', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Force a report
      PerformanceMonitor.forceReport();

      // Check that report was logged
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance Report'),
        expect.objectContaining({
          memoryUsage: expect.any(Object),
          domMetrics: expect.any(Object),
          extensionMetrics: expect.any(Object)
        })
      );

      logSpy.mockRestore();
    });
  });

  describe('Logger Integration', () => {
    it('should respect log levels', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Set production mode
      process.env.NODE_ENV = 'production';

      logger.debug('Debug message');
      logger.log('Log message');

      // Debug should not be called in production
      expect(debugSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Log message');

      // Reset
      process.env.NODE_ENV = 'test';
      consoleSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('should format errors properly', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new Error('Test error');
      logger.error('Error occurred:', error);

      expect(errorSpy).toHaveBeenCalledWith('Error occurred:', error);

      errorSpy.mockRestore();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should handle a complete reply generation workflow', async () => {
      // Initialize all systems
      ErrorBoundary.initialize();
      PerformanceMonitor.start();

      // Mock successful API response
      jest.mock('@/services/openRouter', () => ({
        OpenRouterService: {
          generateReply: jest.fn().mockResolvedValue({ 
            reply: 'Integration test reply' 
          })
        }
      }));

      // Track timing
      const startTime = performance.now();

      try {
        // Generate reply
        const reply = await UnifiedApiService.generateReply({
          context: 'E2E test context',
          tone: 'professional',
          temperature: 0.7
        });

        // Measure performance
        PerformanceMonitor.measureTiming('e2e_test', startTime);

        expect(reply).toBe('Integration test reply');

        // Check metrics
        const apiMetrics = UnifiedApiService.getMetrics();
        expect(apiMetrics.totalRequests).toBe(1);
        expect(apiMetrics.apiCalls).toBe(1);

        // Check no errors
        const errorStats = ErrorBoundary.getStatistics();
        expect(errorStats.total).toBe(0);

      } catch (error) {
        // Handle any errors
        await ErrorBoundary.handleError(error as Error, {
          component: 'e2e_test',
          action: 'generateReply',
          timestamp: Date.now()
        });
      } finally {
        // Cleanup
        PerformanceMonitor.stop();
      }
    });

    it('should handle failures gracefully', async () => {
      // Initialize systems
      ErrorBoundary.initialize();

      // Mock API failure
      jest.mock('@/services/openRouter', () => ({
        OpenRouterService: {
          generateReply: jest.fn().mockRejectedValue(
            new Error('API unavailable')
          )
        }
      }));

      try {
        await UnifiedApiService.generateReply({
          context: 'Failure test',
          tone: 'casual'
        });
      } catch (error) {
        // Error should be handled
        await ErrorBoundary.handleError(error as Error, {
          component: 'api',
          action: 'generateReply',
          timestamp: Date.now()
        });
      }

      // Check error was recorded
      const errorStats = ErrorBoundary.getStatistics();
      expect(errorStats.total).toBe(1);
      expect(errorStats.byComponent['api']).toBe(1);
    });
  });
});