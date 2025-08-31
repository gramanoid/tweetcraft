/**
 * DOM Batching Utility for TweetCraft
 * Batch DOM updates for better performance
 */

interface DOMOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'style' | 'class';
  element?: HTMLElement;
  parent?: HTMLElement;
  updates?: Partial<HTMLElement>;
  styles?: Partial<CSSStyleDeclaration>;
  classes?: { add?: string[]; remove?: string[] };
  html?: string;
  callback?: () => void;
}

interface BatchStats {
  totalOperations: number;
  batchesExecuted: number;
  averageBatchSize: number;
  totalExecutionTime: number;
}

export class DOMBatcher {
  private pendingOperations: Map<string, DOMOperation> = new Map();
  private batchTimeout: number | null = null;
  private rafId: number | null = null;
  private stats: BatchStats = {
    totalOperations: 0,
    batchesExecuted: 0,
    averageBatchSize: 0,
    totalExecutionTime: 0
  };

  // Configuration
  private readonly BATCH_DELAY = 16; // ~1 frame at 60fps
  private readonly MAX_BATCH_SIZE = 50;
  private readonly USE_RAF = true;

  constructor() {
    console.log('%c🎯 DOMBatcher initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Queue a DOM operation
   */
  queue(operation: DOMOperation): void {
    // Merge with existing operation if same ID
    if (this.pendingOperations.has(operation.id)) {
      const existing = this.pendingOperations.get(operation.id)!;
      this.mergeOperations(existing, operation);
    } else {
      this.pendingOperations.set(operation.id, operation);
    }

    this.scheduleBatch();
  }

  /**
   * Create element with batching
   */
  createElement(
    tag: string,
    attributes?: Record<string, string>,
    parent?: HTMLElement,
    html?: string
  ): string {
    const id = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.queue({
      id,
      type: 'create',
      parent,
      html,
      callback: () => {
        const element = document.createElement(tag);
        if (attributes) {
          Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
          });
        }
        if (html) {
          element.innerHTML = html;
        }
        if (parent) {
          parent.appendChild(element);
        }
      }
    });

    return id;
  }

  /**
   * Update element with batching
   */
  updateElement(element: HTMLElement, updates: Partial<HTMLElement>): void {
    const id = `update_${element.id || element.className}_${Date.now()}`;
    
    this.queue({
      id,
      type: 'update',
      element,
      updates
    });
  }

  /**
   * Update styles with batching
   */
  updateStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    const id = `style_${element.id || element.className}_${Date.now()}`;
    
    this.queue({
      id,
      type: 'style',
      element,
      styles
    });
  }

  /**
   * Update classes with batching
   */
  updateClasses(
    element: HTMLElement,
    add?: string[],
    remove?: string[]
  ): void {
    const id = `class_${element.id || element.className}_${Date.now()}`;
    
    this.queue({
      id,
      type: 'class',
      element,
      classes: { add, remove }
    });
  }

  /**
   * Delete element with batching
   */
  deleteElement(element: HTMLElement): void {
    const id = `delete_${element.id || element.className}_${Date.now()}`;
    
    this.queue({
      id,
      type: 'delete',
      element
    });
  }

  /**
   * Batch update multiple elements
   */
  batchUpdate(updates: Array<{
    element: HTMLElement;
    changes: {
      props?: Partial<HTMLElement>;
      styles?: Partial<CSSStyleDeclaration>;
      classes?: { add?: string[]; remove?: string[] };
    };
  }>): void {
    updates.forEach(({ element, changes }, index) => {
      const id = `batch_${index}_${Date.now()}`;
      
      if (changes.props) {
        this.queue({
          id: `${id}_props`,
          type: 'update',
          element,
          updates: changes.props
        });
      }
      
      if (changes.styles) {
        this.queue({
          id: `${id}_styles`,
          type: 'style',
          element,
          styles: changes.styles
        });
      }
      
      if (changes.classes) {
        this.queue({
          id: `${id}_classes`,
          type: 'class',
          element,
          classes: changes.classes
        });
      }
    });
  }

  /**
   * Merge operations for the same element
   */
  private mergeOperations(existing: DOMOperation, newOp: DOMOperation): void {
    // Merge updates
    if (newOp.updates) {
      existing.updates = { ...existing.updates, ...newOp.updates };
    }
    
    // Merge styles
    if (newOp.styles) {
      existing.styles = { ...existing.styles, ...newOp.styles };
    }
    
    // Merge classes
    if (newOp.classes) {
      if (!existing.classes) existing.classes = {};
      if (newOp.classes.add) {
        existing.classes.add = [
          ...(existing.classes.add || []),
          ...newOp.classes.add
        ];
      }
      if (newOp.classes.remove) {
        existing.classes.remove = [
          ...(existing.classes.remove || []),
          ...newOp.classes.remove
        ];
      }
    }
    
    // Override callback
    if (newOp.callback) {
      existing.callback = newOp.callback;
    }
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatch(): void {
    // Cancel existing schedule
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    // Schedule based on configuration
    if (this.USE_RAF) {
      this.rafId = requestAnimationFrame(() => this.executeBatch());
    } else {
      this.batchTimeout = window.setTimeout(() => this.executeBatch(), this.BATCH_DELAY);
    }

    // Force execution if batch is too large
    if (this.pendingOperations.size >= this.MAX_BATCH_SIZE) {
      this.executeBatch();
    }
  }

  /**
   * Execute all pending operations
   */
  private executeBatch(): void {
    if (this.pendingOperations.size === 0) return;

    const startTime = performance.now();
    const operations = Array.from(this.pendingOperations.values());
    
    console.log(`%c🎯 Executing batch: ${operations.length} operations`, 'color: #657786');

    // Clear pending operations
    this.pendingOperations.clear();
    this.batchTimeout = null;
    this.rafId = null;

    // Group operations by type for better performance
    const grouped = this.groupOperations(operations);

    // Execute in optimal order
    this.executeGrouped(grouped);

    // Update stats
    const executionTime = performance.now() - startTime;
    this.updateStats(operations.length, executionTime);
    
    console.log(`%c🎯 Batch complete in ${executionTime.toFixed(2)}ms`, 'color: #17BF63');
  }

  /**
   * Group operations by type
   */
  private groupOperations(operations: DOMOperation[]): Map<string, DOMOperation[]> {
    const grouped = new Map<string, DOMOperation[]>();
    
    operations.forEach(op => {
      if (!grouped.has(op.type)) {
        grouped.set(op.type, []);
      }
      grouped.get(op.type)!.push(op);
    });
    
    return grouped;
  }

  /**
   * Execute grouped operations in optimal order
   */
  private executeGrouped(grouped: Map<string, DOMOperation[]>): void {
    // Order: delete -> create -> update -> style -> class
    const order = ['delete', 'create', 'update', 'style', 'class'];
    
    order.forEach(type => {
      const ops = grouped.get(type);
      if (ops) {
        ops.forEach(op => this.executeOperation(op));
      }
    });
  }

  /**
   * Execute a single operation
   */
  private executeOperation(op: DOMOperation): void {
    try {
      switch (op.type) {
        case 'create':
          if (op.callback) {
            op.callback();
          }
          break;
          
        case 'update':
          if (op.element && op.updates) {
            Object.assign(op.element, op.updates);
          }
          break;
          
        case 'style':
          if (op.element && op.styles) {
            Object.assign(op.element.style, op.styles);
          }
          break;
          
        case 'class':
          if (op.element && op.classes) {
            if (op.classes.add) {
              op.element.classList.add(...op.classes.add);
            }
            if (op.classes.remove) {
              op.element.classList.remove(...op.classes.remove);
            }
          }
          break;
          
        case 'delete':
          if (op.element && op.element.parentNode) {
            op.element.parentNode.removeChild(op.element);
          }
          break;
      }
      
      if (op.callback && op.type !== 'create') {
        op.callback();
      }
    } catch (error) {
      console.error('Error executing DOM operation:', error, op);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(batchSize: number, executionTime: number): void {
    this.stats.totalOperations += batchSize;
    this.stats.batchesExecuted++;
    this.stats.totalExecutionTime += executionTime;
    
    // Calculate average
    this.stats.averageBatchSize = 
      this.stats.totalOperations / this.stats.batchesExecuted;
  }

  /**
   * Force immediate execution
   */
  flush(): void {
    if (this.pendingOperations.size > 0) {
      console.log('%c🎯 Force flushing batch', 'color: #FFA500');
      this.executeBatch();
    }
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      batchesExecuted: 0,
      averageBatchSize: 0,
      totalExecutionTime: 0
    };
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    this.pendingOperations.clear();
    console.log('%c🎯 Cleared all pending operations', 'color: #FFA500');
  }

  /**
   * Debug: Print pending operations
   */
  debug(): void {
    console.group('%c🎯 DOMBatcher Debug', 'color: #1DA1F2; font-weight: bold');
    console.log('Pending Operations:', this.pendingOperations.size);
    console.log('Stats:', this.getStats());
    
    if (this.pendingOperations.size > 0) {
      console.group('Operations:');
      this.pendingOperations.forEach((op, id) => {
        console.log(`${id}: ${op.type}`, op);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Export singleton instance
export const domBatcher = new DOMBatcher();