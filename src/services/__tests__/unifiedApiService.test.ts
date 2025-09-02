import { UnifiedApiService } from '../unifiedApiService';
import { OpenRouterService } from '../openRouter';

// Mock OpenRouterService
jest.mock('../openRouter', () => ({
  OpenRouterService: {
    generateReply: jest.fn()
  }
}));

// Mock chrome.runtime
global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  }
} as any;

describe('UnifiedApiService', () => {
  beforeEach(() => {
    UnifiedApiService.clearCache();
    UnifiedApiService.resetMetrics();
    jest.clearAllMocks();
  });

  describe('generateReply', () => {
    it('should generate a reply successfully', async () => {
      const mockReply = 'This is a test reply';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      const result = await UnifiedApiService.generateReply({
        context: 'Test context',
        tone: 'professional',
        temperature: 0.7
      });

      expect(result).toBe(mockReply);
      expect(OpenRouterService.generateReply).toHaveBeenCalled();
    });

    it('should use cache for duplicate requests', async () => {
      const mockReply = 'Cached reply';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      const params = {
        context: 'Test context',
        tone: 'professional'
      };

      // First request
      const result1 = await UnifiedApiService.generateReply(params);
      expect(result1).toBe(mockReply);

      // Second request (should use cache)
      const result2 = await UnifiedApiService.generateReply(params);
      expect(result2).toBe(mockReply);

      // API should only be called once
      expect(OpenRouterService.generateReply).toHaveBeenCalledTimes(1);

      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.cachedRequests).toBe(1);
    });

    it('should deduplicate concurrent requests', async () => {
      const mockReply = 'Deduped reply';
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (OpenRouterService.generateReply as jest.Mock).mockReturnValue(promise);

      const params = {
        context: 'Test context',
        tone: 'casual'
      };

      // Start two concurrent requests
      const request1 = UnifiedApiService.generateReply(params);
      const request2 = UnifiedApiService.generateReply(params);

      // Resolve the API call
      resolvePromise!({ reply: mockReply });

      const [result1, result2] = await Promise.all([request1, request2]);

      expect(result1).toBe(mockReply);
      expect(result2).toBe(mockReply);

      // API should only be called once due to deduplication
      expect(OpenRouterService.generateReply).toHaveBeenCalledTimes(1);

      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.dedupedRequests).toBeGreaterThan(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      (OpenRouterService.generateReply as jest.Mock).mockRejectedValue(error);

      await expect(UnifiedApiService.generateReply({
        context: 'Test',
        tone: 'professional'
      })).rejects.toThrow('API Error');
    });
  });

  describe('batchRequest', () => {
    it('should batch multiple requests', async () => {
      const mockReply = 'Batched reply';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      const requests = [
        { method: 'generateReply', params: { context: 'Test 1', tone: 'casual' }, timestamp: Date.now() },
        { method: 'generateReply', params: { context: 'Test 2', tone: 'formal' }, timestamp: Date.now() }
      ];

      const results = await Promise.all(
        requests.map(req => UnifiedApiService.batchRequest(req))
      );

      expect(results).toHaveLength(2);
      
      const metrics = UnifiedApiService.getMetrics();
      expect(metrics.batchedRequests).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return service metrics', async () => {
      const metrics = UnifiedApiService.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('dedupedRequests');
      expect(metrics).toHaveProperty('cachedRequests');
      expect(metrics).toHaveProperty('batchedRequests');
      expect(metrics).toHaveProperty('apiCalls');
      expect(metrics).toHaveProperty('dedupRate');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('apiReduction');
    });

    it('should calculate rates correctly', async () => {
      // Generate some activity
      const mockReply = 'Test';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      // Make a request
      await UnifiedApiService.generateReply({
        context: 'Test',
        tone: 'casual'
      });

      // Make the same request (should hit cache)
      await UnifiedApiService.generateReply({
        context: 'Test',
        tone: 'casual'
      });

      const metrics = UnifiedApiService.getMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cachedRequests).toBe(1);
      expect(metrics.apiCalls).toBe(1);
      expect(metrics.cacheHitRate).toBe('50.00%');
      expect(metrics.apiReduction).toBe('50.00%');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      const mockReply = 'Test';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      const params = {
        context: 'Test',
        tone: 'casual'
      };

      // Make a request
      await UnifiedApiService.generateReply(params);

      // Clear cache
      UnifiedApiService.clearCache();

      // Make the same request (should not hit cache)
      await UnifiedApiService.generateReply(params);

      // API should be called twice
      expect(OpenRouterService.generateReply).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      const mockReply = 'Test';
      (OpenRouterService.generateReply as jest.Mock).mockResolvedValue({
        reply: mockReply
      });

      // Generate some activity
      await UnifiedApiService.generateReply({
        context: 'Test',
        tone: 'casual'
      });

      let metrics = UnifiedApiService.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);

      // Reset metrics
      UnifiedApiService.resetMetrics();

      metrics = UnifiedApiService.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.apiCalls).toBe(0);
    });
  });
});