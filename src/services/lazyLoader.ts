/**
 * Lazy Loading Service for TweetCraft
 * Efficient loading of templates and resources on demand
 */

import { Template, Tone } from '@/config/templatesAndTones';
import { configManager } from '@/config/configurationManager';

interface LoaderConfig {
  chunkSize: number;
  preloadDelay: number;
  priorityItems: string[];
}

interface LoadingState {
  isLoading: boolean;
  loadedChunks: Set<number>;
  totalChunks: number;
  loadedItems: Set<string>;
}

export class LazyLoader {
  private config: LoaderConfig = {
    chunkSize: 6, // Load 6 items at a time
    preloadDelay: 100, // Delay between chunks
    priorityItems: [] // IDs of items to load first
  };

  private loadingState: LoadingState = {
    isLoading: false,
    loadedChunks: new Set(),
    totalChunks: 0,
    loadedItems: new Set()
  };

  private intersectionObserver: IntersectionObserver | null = null;
  private idleCallback: number | null = null;

  constructor() {
    this.initializeObserver();
    console.log('%c⚡ LazyLoader initialized', 'color: #1DA1F2; font-weight: bold');
  }

  /**
   * Initialize intersection observer for viewport-based loading
   */
  private initializeObserver(): void {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              this.loadElement(element);
            }
          });
        },
        {
          root: null,
          rootMargin: '50px', // Start loading 50px before entering viewport
          threshold: 0.01
        }
      );
    }
  }

  /**
   * Load templates in chunks
   */
  async loadTemplates(
    templates: Template[],
    container: HTMLElement,
    renderCallback: (templates: Template[]) => void
  ): Promise<void> {
    console.log('%c⚡ Loading templates lazily', 'color: #1DA1F2', `${templates.length} total`);
    
    this.loadingState.isLoading = true;
    this.loadingState.totalChunks = Math.ceil(templates.length / this.config.chunkSize);

    // Sort by priority
    const sortedTemplates = this.sortByPriority(templates);

    // Load first chunk immediately
    const firstChunk = sortedTemplates.slice(0, this.config.chunkSize);
    renderCallback(firstChunk);
    this.markAsLoaded(firstChunk.map(t => t.id));
    this.loadingState.loadedChunks.add(0);

    // Load remaining chunks progressively
    for (let i = 1; i < this.loadingState.totalChunks; i++) {
      await this.loadChunkWhenIdle(
        sortedTemplates,
        i,
        renderCallback
      );
    }

    this.loadingState.isLoading = false;
    console.log('%c⚡ All templates loaded', 'color: #17BF63');
  }

  /**
   * Load tones with lazy loading
   */
  async loadTones(
    tones: Tone[],
    container: HTMLElement,
    renderCallback: (tones: Tone[]) => void
  ): Promise<void> {
    console.log('%c⚡ Loading tones lazily', 'color: #1DA1F2', `${tones.length} total`);

    // Tones are usually fewer, load in 2 chunks
    const midPoint = Math.ceil(tones.length / 2);
    
    // Load first half immediately
    const firstHalf = tones.slice(0, midPoint);
    renderCallback(firstHalf);
    this.markAsLoaded(firstHalf.map(t => t.id));

    // Load second half when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const secondHalf = tones.slice(midPoint);
        renderCallback(secondHalf);
        this.markAsLoaded(secondHalf.map(t => t.id));
      });
    } else {
      setTimeout(() => {
        const secondHalf = tones.slice(midPoint);
        renderCallback(secondHalf);
        this.markAsLoaded(secondHalf.map(t => t.id));
      }, 100);
    }
  }

  /**
   * Load chunk when browser is idle
   */
  private async loadChunkWhenIdle(
    items: (Template | Tone)[],
    chunkIndex: number,
    renderCallback: (items: any[]) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      const loadChunk = () => {
        const start = chunkIndex * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, items.length);
        const chunk = items.slice(start, end);
        
        renderCallback(chunk);
        this.markAsLoaded(chunk.map(item => item.id));
        this.loadingState.loadedChunks.add(chunkIndex);
        
        console.log(`%c⚡ Loaded chunk ${chunkIndex + 1}/${this.loadingState.totalChunks}`, 'color: #657786');
        resolve();
      };

      if ('requestIdleCallback' in window) {
        this.idleCallback = requestIdleCallback(loadChunk, { timeout: 500 });
      } else {
        setTimeout(loadChunk, this.config.preloadDelay);
      }
    });
  }

  /**
   * Sort items by priority (favorites first, then by usage)
   */
  private sortByPriority(items: (Template | Tone)[]): (Template | Tone)[] {
    return items.sort((a, b) => {
      // Priority items first
      const aPriority = this.config.priorityItems.includes(a.id);
      const bPriority = this.config.priorityItems.includes(b.id);
      
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      
      // Then by category (for templates)
      if ('category' in a && 'category' in b) {
        const categoryOrder = ['engagement', 'value', 'conversation', 'humor', 'debate', 'viral'];
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        return aIndex - bIndex;
      }
      
      return 0;
    });
  }

  /**
   * Mark items as loaded
   */
  private markAsLoaded(ids: string[]): void {
    ids.forEach(id => this.loadingState.loadedItems.add(id));
  }

  /**
   * Check if item is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadingState.loadedItems.has(id);
  }

  /**
   * Observe element for lazy loading
   */
  observeElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop observing element
   */
  unobserveElement(element: HTMLElement): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Load element when it enters viewport
   */
  private async loadElement(element: HTMLElement): Promise<void> {
    const itemId = element.dataset.lazyId;
    if (!itemId || this.isLoaded(itemId)) return;

    console.log('%c⚡ Loading element', 'color: #1DA1F2', itemId);

    // Add loading state
    element.classList.add('loading');

    // Load the actual content
    const template = configManager.getTemplate(itemId);
    const tone = configManager.getTone(itemId);
    
    if (template || tone) {
      // Update element with full content
      element.classList.remove('loading');
      element.classList.add('loaded');
      this.markAsLoaded([itemId]);
      
      // Stop observing
      this.unobserveElement(element);
    }
  }

  /**
   * Preload items based on user behavior
   */
  async preloadBasedOnBehavior(favoriteIds: string[]): Promise<void> {
    console.log('%c⚡ Preloading favorites', 'color: #1DA1F2', favoriteIds.length);
    
    this.config.priorityItems = favoriteIds;
    
    // Preload favorites in background
    for (const id of favoriteIds) {
      if (!this.isLoaded(id)) {
        await new Promise(resolve => setTimeout(resolve, 50));
        this.markAsLoaded([id]);
      }
    }
  }

  /**
   * Cancel pending operations
   */
  cancelPending(): void {
    if (this.idleCallback !== null) {
      cancelIdleCallback(this.idleCallback);
      this.idleCallback = null;
    }
    
    this.loadingState.isLoading = false;
    console.log('%c⚡ Cancelled pending loads', 'color: #FFA500');
  }

  /**
   * Get loading progress
   */
  getProgress(): number {
    if (this.loadingState.totalChunks === 0) return 100;
    return (this.loadingState.loadedChunks.size / this.loadingState.totalChunks) * 100;
  }

  /**
   * Clean up observer
   */
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.cancelPending();
    this.loadingState.loadedItems.clear();
    this.loadingState.loadedChunks.clear();
    
    console.log('%c⚡ LazyLoader destroyed', 'color: #FFA500');
  }
}

// Export singleton instance
export const lazyLoader = new LazyLoader();