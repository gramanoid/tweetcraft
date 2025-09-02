/**
 * DOM Resilience System for TweetCraft
 * Implements 4+ fallback strategies for robust DOM querying
 * Handles Twitter's frequent DOM changes gracefully
 */

import { logger } from '@/utils/logger';
import { DOMCache } from '@/utils/domCache';

interface FallbackStrategy {
  name: string;
  selector: string | (() => string);
  validator?: (element: Element) => boolean;
}

interface QueryOptions {
  parent?: Element | Document;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  waitForElement?: boolean;
}

export class DOMResilience {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 100;
  private static readonly OBSERVER_TIMEOUT = 5000;
  
  // Track successful selectors for optimization
  private static selectorSuccess = new Map<string, string[]>();
  
  /**
   * Query with multiple fallback strategies
   */
  static async queryWithFallbacks<T extends Element>(
    strategies: FallbackStrategy[],
    options: QueryOptions = {}
  ): Promise<T | null> {
    const {
      parent = document,
      timeout = this.OBSERVER_TIMEOUT,
      retries = this.MAX_RETRIES,
      cache = true,
      waitForElement = false
    } = options;
    
    // Try each strategy
    for (const strategy of strategies) {
      const selector = typeof strategy.selector === 'function' 
        ? strategy.selector() 
        : strategy.selector;
      
      try {
        // Try cache first if enabled
        let element: T | null = null;
        
        if (cache) {
          element = DOMCache.querySelector<T>(selector, parent);
        } else {
          element = parent.querySelector<T>(selector);
        }
        
        // Validate element if validator provided
        if (element && strategy.validator) {
          if (!strategy.validator(element)) {
            logger.debug(`Fallback ${strategy.name} found element but validation failed`);
            continue;
          }
        }
        
        if (element) {
          // Track successful strategy
          this.trackSuccess(strategies[0].name, strategy.name);
          logger.debug(`DOM query succeeded with strategy: ${strategy.name}`);
          return element;
        }
      } catch (error) {
        logger.debug(`Fallback strategy ${strategy.name} failed:`, error);
      }
    }
    
    // If no immediate result and waitForElement is true, use mutation observer
    if (waitForElement) {
      logger.debug('No element found, waiting with mutation observer...');
      return this.waitForElement<T>(strategies, options);
    }
    
    // Retry if configured
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
      return this.queryWithFallbacks<T>(strategies, { ...options, retries: retries - 1 });
    }
    
    logger.debug('All fallback strategies exhausted');
    return null;
  }
  
  /**
   * Wait for element using mutation observer
   */
  private static waitForElement<T extends Element>(
    strategies: FallbackStrategy[],
    options: QueryOptions
  ): Promise<T | null> {
    return new Promise((resolve) => {
      const { parent = document, timeout = this.OBSERVER_TIMEOUT } = options;
      let timeoutId: NodeJS.Timeout;
      
      const observer = new MutationObserver(() => {
        // Try strategies again
        for (const strategy of strategies) {
          const selector = typeof strategy.selector === 'function' 
            ? strategy.selector() 
            : strategy.selector;
          
          const element = parent.querySelector<T>(selector);
          
          if (element && (!strategy.validator || strategy.validator(element))) {
            clearTimeout(timeoutId);
            observer.disconnect();
            this.trackSuccess(strategies[0].name, strategy.name);
            resolve(element);
            return;
          }
        }
      });
      
      // Set timeout
      timeoutId = setTimeout(() => {
        observer.disconnect();
        logger.debug('Mutation observer timeout reached');
        resolve(null);
      }, timeout);
      
      // Start observing
      observer.observe(parent instanceof Document ? document.body : parent, {
        childList: true,
        subtree: true
      });
      
      // Try once immediately
      for (const strategy of strategies) {
        const selector = typeof strategy.selector === 'function' 
          ? strategy.selector() 
          : strategy.selector;
        
        const element = parent.querySelector<T>(selector);
        
        if (element && (!strategy.validator || strategy.validator(element))) {
          clearTimeout(timeoutId);
          observer.disconnect();
          this.trackSuccess(strategies[0].name, strategy.name);
          resolve(element);
          return;
        }
      }
    });
  }
  
  /**
   * Track successful selector strategies for optimization
   */
  private static trackSuccess(queryName: string, strategyName: string): void {
    const history = this.selectorSuccess.get(queryName) || [];
    
    // Move successful strategy to front
    const filtered = history.filter(s => s !== strategyName);
    filtered.unshift(strategyName);
    
    // Keep only last 5 successes
    if (filtered.length > 5) {
      filtered.pop();
    }
    
    this.selectorSuccess.set(queryName, filtered);
  }
  
  /**
   * Get optimized strategy order based on success history
   */
  static getOptimizedStrategies(
    queryName: string,
    strategies: FallbackStrategy[]
  ): FallbackStrategy[] {
    const history = this.selectorSuccess.get(queryName);
    
    if (!history || history.length === 0) {
      return strategies;
    }
    
    // Sort strategies based on success history
    return [...strategies].sort((a, b) => {
      const aIndex = history.indexOf(a.name);
      const bIndex = history.indexOf(b.name);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }
  
  /**
   * Common Twitter/X selector strategies
   */
  static readonly TWITTER_STRATEGIES = {
    COMPOSE_TWEET: [
      {
        name: 'contenteditable-div',
        selector: 'div[contenteditable="true"][data-testid="tweetTextarea_0"]'
      },
      {
        name: 'draft-editor',
        selector: '.DraftEditor-root div[contenteditable="true"]'
      },
      {
        name: 'role-textbox',
        selector: 'div[role="textbox"][contenteditable="true"]'
      },
      {
        name: 'reply-dialog',
        selector: '[data-testid="reply"] div[contenteditable="true"]'
      },
      {
        name: 'any-contenteditable',
        selector: 'div[contenteditable="true"]',
        validator: (el: Element) => {
          // Validate it's actually a tweet compose area
          const parent = el.closest('[data-testid="toolBar"]');
          return parent !== null;
        }
      }
    ] as FallbackStrategy[],
    
    TOOLBAR: [
      {
        name: 'data-testid',
        selector: '[data-testid="toolBar"]'
      },
      {
        name: 'reply-toolbar',
        selector: '[data-testid="reply"] [role="group"]'
      },
      {
        name: 'bottom-bar',
        selector: '[data-testid="tweetButtonInline"]'
      },
      {
        name: 'role-group',
        selector: 'div[role="group"]:has([data-testid="tweetButtonInline"])'
      },
      {
        name: 'flex-row',
        selector: '.css-175oi2r.r-1iusvr4.r-16y2uox',
        validator: (el: Element) => {
          // Check if it contains tweet button
          return el.querySelector('[data-testid="tweetButtonInline"]') !== null;
        }
      }
    ] as FallbackStrategy[],
    
    TWEET_BUTTON: [
      {
        name: 'data-testid-inline',
        selector: '[data-testid="tweetButtonInline"]'
      },
      {
        name: 'data-testid-tweet',
        selector: '[data-testid="tweetButton"]'
      },
      {
        name: 'reply-button',
        selector: '[data-testid="reply"] button[type="button"]',
        validator: (el: Element) => {
          const text = el.textContent?.toLowerCase();
          return text?.includes('reply') || text?.includes('post') || false;
        }
      },
      {
        name: 'primary-button',
        selector: 'button[data-testid*="tweet"]'
      }
    ] as FallbackStrategy[]
  };
  
  /**
   * HypeFury selector strategies
   */
  static readonly HYPEFURY_STRATEGIES = {
    COMPOSE_AREA: [
      {
        name: 'textarea-primary',
        selector: 'textarea.composer-textarea'
      },
      {
        name: 'textarea-fallback',
        selector: 'textarea[placeholder*="Write"]'
      },
      {
        name: 'contenteditable',
        selector: '[contenteditable="true"]'
      }
    ] as FallbackStrategy[],
    
    TOOLBAR: [
      {
        name: 'composer-toolbar',
        selector: '.composer-toolbar'
      },
      {
        name: 'action-buttons',
        selector: '.composer-actions'
      },
      {
        name: 'button-container',
        selector: '.buttons-container'
      }
    ] as FallbackStrategy[]
  };
  
  /**
   * Clear success tracking
   */
  static clearTracking(): void {
    this.selectorSuccess.clear();
  }
  
  /**
   * Get statistics
   */
  static getStats(): object {
    const stats: any = {
      trackedQueries: this.selectorSuccess.size,
      strategies: {}
    };
    
    for (const [query, successes] of this.selectorSuccess.entries()) {
      stats.strategies[query] = {
        recentSuccesses: successes,
        mostSuccessful: successes[0] || 'none'
      };
    }
    
    return stats;
  }
}