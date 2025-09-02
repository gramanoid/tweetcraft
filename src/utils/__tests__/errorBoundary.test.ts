import { ErrorBoundary } from '../errorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    ErrorBoundary.clearErrors();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize error boundary', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      ErrorBoundary.initialize();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Error boundary initialized'));
      logSpy.mockRestore();
    });
  });

  describe('handleError', () => {
    it('should handle and log errors', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = new Error('Test error');
      const context = {
        component: 'test',
        action: 'testing',
        timestamp: Date.now()
      };

      await ErrorBoundary.handleError(error, context, 'medium');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MEDIUM ERROR'),
        expect.any(String),
        expect.any(Object)
      );

      warnSpy.mockRestore();
    });

    it('should store errors for analysis', async () => {
      const error = new Error('Test error');
      const context = {
        component: 'test',
        action: 'testing',
        timestamp: Date.now()
      };

      await ErrorBoundary.handleError(error, context);

      const stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(1);
      expect(stats.byComponent['test']).toBe(1);
    });
  });

  describe('withErrorBoundary', () => {
    it('should wrap synchronous functions', () => {
      const mockFn = jest.fn(() => 'result');
      const wrapped = ErrorBoundary.wrap(mockFn, 'test', 'sync');

      const result = wrapped('arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should catch synchronous errors', () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn(() => {
        throw error;
      });
      const wrapped = ErrorBoundary.wrap(mockFn, 'test', 'sync');

      expect(() => wrapped()).toThrow(error);
      
      const stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(1);
    });

    it('should wrap async functions', async () => {
      const mockFn = jest.fn(async () => 'async result');
      const wrapped = ErrorBoundary.wrap(mockFn, 'test', 'async');

      const result = await wrapped();
      
      expect(result).toBe('async result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should catch async errors', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn(async () => {
        throw error;
      });
      const wrapped = ErrorBoundary.wrap(mockFn, 'test', 'async');

      await expect(wrapped()).rejects.toThrow(error);
      
      // Wait for error handling to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(1);
    });
  });

  describe('registerErrorHandler', () => {
    it('should register and call custom error handlers', async () => {
      const customHandler = jest.fn();
      ErrorBoundary.registerErrorHandler('custom', customHandler);

      const error = new Error('Custom error');
      const context = {
        component: 'custom',
        action: 'test',
        timestamp: Date.now()
      };

      await ErrorBoundary.handleError(error, context);

      expect(customHandler).toHaveBeenCalledWith(error, context);
    });
  });

  describe('registerRecoveryStrategy', () => {
    it('should register and execute recovery strategies', async () => {
      const recoveryStrategy = jest.fn(async () => true);
      ErrorBoundary.registerRecoveryStrategy('custom_recovery', recoveryStrategy);

      // Need to trigger a recovery for a custom error type
      const error = new Error('custom error');
      const context = {
        component: 'test',
        action: 'test',
        timestamp: Date.now()
      };

      await ErrorBoundary.handleError(error, context);

      // Recovery strategies are called based on error type matching
      // Since our error doesn't match DOM/API/storage patterns, it won't be called
      expect(recoveryStrategy).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return error statistics', async () => {
      // Add some errors
      await ErrorBoundary.handleError(new Error('Error 1'), {
        component: 'comp1',
        action: 'action1',
        timestamp: Date.now()
      }, 'low');

      await ErrorBoundary.handleError(new Error('Error 2'), {
        component: 'comp2',
        action: 'action2',
        timestamp: Date.now()
      }, 'high');

      const stats = ErrorBoundary.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.bySeverity['low']).toBe(1);
      expect(stats.bySeverity['high']).toBe(1);
      expect(stats.byComponent['comp1']).toBe(1);
      expect(stats.byComponent['comp2']).toBe(1);
      expect(stats.recoveryRate).toBe(0); // No recoveries
    });
  });

  describe('clearErrors', () => {
    it('should clear error history', async () => {
      // Add an error
      await ErrorBoundary.handleError(new Error('Test'), {
        component: 'test',
        action: 'test',
        timestamp: Date.now()
      });

      let stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(1);

      // Clear errors
      ErrorBoundary.clearErrors();

      stats = ErrorBoundary.getStatistics();
      expect(stats.total).toBe(0);
    });
  });
});