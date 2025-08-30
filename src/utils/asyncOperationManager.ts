/**
 * Async Operation Manager
 * Prevents race conditions by coordinating async operations with AbortController
 */

export class AsyncOperationManager {
  private operations = new Map<string, AbortController>();
  
  /**
   * Execute an async operation with automatic cancellation of conflicting operations
   */
  async execute<T>(key: string, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    console.log('%c🔄 ASYNC OPERATION MANAGER', 'color: #9146FF; font-weight: bold; font-size: 14px');
    console.log('%c  Starting operation:', 'color: #657786', key);
    
    // Cancel existing operation with same key
    if (this.operations.has(key)) {
      const existingController = this.operations.get(key)!;
      console.log('%c  ⚠️ Cancelling conflicting operation:', 'color: #FFA500; font-weight: bold', key);
      existingController.abort();
      this.operations.delete(key);
    }
    
    // Create new operation controller
    const controller = new AbortController();
    this.operations.set(key, controller);
    
    console.log('%c  ✅ Operation registered:', 'color: #17BF63; font-weight: bold', 
               `Active operations: ${this.operations.size}`);
    
    try {
      const startTime = performance.now();
      const result = await operation(controller.signal);
      const duration = performance.now() - startTime;
      
      console.log('%c  🎯 Operation completed:', 'color: #17BF63; font-weight: bold', 
                 `${key} (${Math.round(duration)}ms)`);
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('%c  ⏹️ Operation cancelled:', 'color: #657786', key);
        throw new Error(`Operation ${key} was cancelled`);
      } else {
        console.log('%c  ❌ Operation failed:', 'color: #DC3545; font-weight: bold', key, error);
        throw error;
      }
    } finally {
      // Cleanup
      this.operations.delete(key);
      console.log('%c  🧹 Operation cleaned up:', 'color: #657786', 
                 `${key} - Active operations: ${this.operations.size}`);
    }
  }
  
  /**
   * Cancel a specific operation by key
   */
  cancel(key: string): boolean {
    const controller = this.operations.get(key);
    if (controller) {
      console.log('%c🛑 Manual cancellation:', 'color: #FFA500; font-weight: bold', key);
      controller.abort();
      this.operations.delete(key);
      return true;
    }
    return false;
  }
  
  /**
   * Cancel all active operations
   */
  cancelAll(): void {
    console.log('%c🛑 Cancelling all operations:', 'color: #DC3545; font-weight: bold', 
               `${this.operations.size} operations`);
    
    for (const [key, controller] of this.operations.entries()) {
      controller.abort();
      console.log('%c  Cancelled:', 'color: #657786', key);
    }
    
    this.operations.clear();
    console.log('%c✅ All operations cancelled', 'color: #17BF63; font-weight: bold');
  }
  
  /**
   * Check if an operation is currently active
   */
  isActive(key: string): boolean {
    return this.operations.has(key);
  }
  
  /**
   * Get count of active operations
   */
  getActiveCount(): number {
    return this.operations.size;
  }
  
  /**
   * Get list of active operation keys
   */
  getActiveOperations(): string[] {
    return Array.from(this.operations.keys());
  }
  
  /**
   * Get operation statistics
   */
  getStats() {
    const activeOperations = this.getActiveOperations();
    
    return {
      activeCount: this.operations.size,
      activeOperations,
      totalMemoryUsage: activeOperations.length * 64 // Rough estimate in bytes
    };
  }
}

// Global instance for extension-wide coordination
export const globalAsyncManager = new AsyncOperationManager();