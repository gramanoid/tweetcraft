/**
 * Performance Benchmarks for TweetCraft
 * Measures performance of critical operations
 */

import { UnifiedApiService } from '@/services/unifiedApiService';
import { cleanupReply, truncateText, countTwitterCharacters } from '@/utils/textUtils';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

// Mock APIs
jest.mock('@/services/openRouter', () => ({
  OpenRouterService: {
    generateReply: jest.fn().mockResolvedValue({ reply: 'Test reply' })
  }
}));

describe('Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  
  beforeAll(() => {
    console.log('\n📊 Running Performance Benchmarks...\n');
    console.log(`Iterations per test: ${ITERATIONS}`);
    console.log('─'.repeat(50));
  });

  describe('Text Processing Benchmarks', () => {
    it('should benchmark cleanupReply performance', () => {
      const testCases = [
        'Simple reply text',
        '"Reply: This is a longer reply with #hashtags and @mentions"',
        'A'.repeat(280), // Max length tweet
        'Multiple\n\nlines\n\nwith\n\nbreaks',
        'Text with emojis 😀 🎉 🚀 and special chars!@#$%'
      ];

      const startTime = performance.now();
      
      for (let i = 0; i < ITERATIONS; i++) {
        testCases.forEach(text => cleanupReply(text));
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (ITERATIONS * testCases.length);
      
      console.log(`cleanupReply: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg per operation`);
      
      // Performance assertion - should be under 0.1ms per operation
      expect(avgTime).toBeLessThan(0.1);
    });

    it('should benchmark truncateText performance', () => {
      const longText = 'Lorem ipsum '.repeat(100);
      
      const startTime = performance.now();
      
      for (let i = 0; i < ITERATIONS; i++) {
        truncateText(longText, 280);
        truncateText(longText, 100);
        truncateText(longText, 50);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (ITERATIONS * 3);
      
      console.log(`truncateText: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg per operation`);
      
      // Should be under 0.05ms per operation
      expect(avgTime).toBeLessThan(0.05);
    });

    it('should benchmark countTwitterCharacters performance', () => {
      const testCases = [
        'Simple text',
        'Text with https://example.com/url',
        'Multiple https://example.com and https://another.com URLs',
        'A'.repeat(500) // Long text
      ];
      
      const startTime = performance.now();
      
      for (let i = 0; i < ITERATIONS; i++) {
        testCases.forEach(text => countTwitterCharacters(text));
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / (ITERATIONS * testCases.length);
      
      console.log(`countTwitterCharacters: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg per operation`);
      
      // Should be under 0.1ms per operation
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe('API Service Benchmarks', () => {
    it('should benchmark cache performance', async () => {
      UnifiedApiService.clearCache();
      UnifiedApiService.resetMetrics();
      
      const params = {
        context: 'Benchmark test',
        tone: 'professional'
      };
      
      // First call - hits API
      const apiStartTime = performance.now();
      await UnifiedApiService.generateReply(params);
      const apiEndTime = performance.now();
      const apiTime = apiEndTime - apiStartTime;
      
      // Subsequent calls - hit cache
      const cacheStartTime = performance.now();
      for (let i = 0; i < 100; i++) {
        await UnifiedApiService.generateReply(params);
      }
      const cacheEndTime = performance.now();
      const avgCacheTime = (cacheEndTime - cacheStartTime) / 100;
      
      console.log(`API call: ${apiTime.toFixed(2)}ms`);
      console.log(`Cache hit: ${avgCacheTime.toFixed(4)}ms avg per operation`);
      console.log(`Cache speedup: ${(apiTime / avgCacheTime).toFixed(2)}x faster`);
      
      // Cache should be at least 10x faster than API
      expect(avgCacheTime).toBeLessThan(apiTime / 10);
      
      // Verify cache was actually used
      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.cachedRequests).toBe(100);
    });

    it('should benchmark deduplication performance', async () => {
      UnifiedApiService.clearCache();
      UnifiedApiService.resetMetrics();
      
      const params = {
        context: 'Dedup test',
        tone: 'casual'
      };
      
      // Create a slow mock response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
        setTimeout(() => resolve({ reply: 'Slow reply' }), 50);
      });
      
      jest.spyOn(global as any, 'fetch').mockReturnValue(slowPromise);
      
      // Start multiple concurrent requests
      const startTime = performance.now();
      const requests = Array(10).fill(null).map(() => 
        UnifiedApiService.generateReply(params)
      );
      
      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Deduplicated 10 concurrent requests: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per request: ${(totalTime / 10).toFixed(2)}ms`);
      
      // All should return the same result
      expect(new Set(results).size).toBe(1);
      
      // Check deduplication worked
      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.dedupedRequests).toBeGreaterThan(0);
      
      // Should be faster than running sequentially (50ms * 10 = 500ms)
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Performance Monitor Benchmarks', () => {
    it('should benchmark metric collection overhead', () => {
      const operations = ['op1', 'op2', 'op3', 'op4', 'op5'];
      
      const startTime = performance.now();
      
      for (let i = 0; i < ITERATIONS; i++) {
        const opStart = performance.now();
        // Simulate some work
        Math.sqrt(i);
        // Measure timing
        PerformanceMonitor.measureTiming(
          operations[i % operations.length], 
          opStart
        );
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgOverhead = totalTime / ITERATIONS;
      
      console.log(`Performance monitoring overhead: ${avgOverhead.toFixed(4)}ms per measurement`);
      
      // Overhead should be minimal (under 0.1ms)
      expect(avgOverhead).toBeLessThan(0.1);
    });

    it('should benchmark getCurrentMetrics performance', () => {
      // Mock DOM for testing
      document.body.innerHTML = '<div>'.repeat(1000) + '</div>'.repeat(1000);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        PerformanceMonitor.getCurrentMetrics();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 100;
      
      console.log(`getCurrentMetrics: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg per call`);
      
      // Should be under 5ms per call even with large DOM
      expect(avgTime).toBeLessThan(5);
      
      // Cleanup
      document.body.innerHTML = '';
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should measure memory efficiency of cache', () => {
      if (!(performance as any).memory) {
        console.log('Memory API not available, skipping memory benchmark');
        return;
      }
      
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // Fill cache with data
      for (let i = 0; i < 100; i++) {
        UnifiedApiService['requestCache'].set(
          `key_${i}`,
          { data: 'x'.repeat(1000), timestamp: Date.now() }
        );
      }
      
      const afterCacheMemory = (performance as any).memory.usedJSHeapSize;
      const memoryUsed = (afterCacheMemory - initialMemory) / 1024 / 1024; // Convert to MB
      
      console.log(`Cache memory usage for 100 entries: ${memoryUsed.toFixed(2)}MB`);
      
      // Clear cache
      UnifiedApiService.clearCache();
      
      // Should use less than 1MB for 100 small entries
      expect(memoryUsed).toBeLessThan(1);
    });
  });

  afterAll(() => {
    console.log('─'.repeat(50));
    console.log('✅ Benchmarks completed\n');
  });
});