import { TwitterContext } from '@/types';
import { URLCleaner } from '@/utils/urlCleaner';

// Performance Optimization Suite: DOM Query Caching
class DOMCache {
  private cache = new WeakMap<Element, Map<string, Element | null>>();
  private queryCount = 0;
  private cacheHits = 0;
  private mutationObserver: MutationObserver | null = null;
  private observedElements = new WeakSet<Element>();
  
  constructor() {
    // Set up mutation observer for auto-invalidation
    this.mutationObserver = new MutationObserver((mutations) => {
      // Invalidate cache for mutated elements
      mutations.forEach(mutation => {
        const target = mutation.target as Element;
        if (this.cache.has(target)) {
          this.cache.delete(target);
        }
      });
    });
  }
  
  query(parent: Element, selector: string): Element | null {
    this.queryCount++;
    
    if (!this.cache.has(parent)) {
      this.cache.set(parent, new Map());
      // Start observing this parent for mutations if not already
      if (!this.observedElements.has(parent) && this.mutationObserver) {
        this.mutationObserver.observe(parent, {
          childList: true,
          subtree: true,
          attributes: true
        });
        this.observedElements.add(parent);
      }
    }
    
    const cache = this.cache.get(parent)!;
    
    if (cache.has(selector)) {
      this.cacheHits++;
      const hitRate = Math.round((this.cacheHits / this.queryCount) * 100);
      if (this.queryCount % 50 === 0) { // Log every 50 queries
        console.log(`%c⚡ DOM Cache Performance:`, 'color: #17BF63; font-weight: bold', 
                   `${hitRate}% hit rate (${this.cacheHits}/${this.queryCount})`);
      }
      return cache.get(selector)!;
    }
    
    const result = parent.querySelector(selector);
    cache.set(selector, result);
    
    return result;
  }
  
  queryAll(parent: Element, selector: string): NodeListOf<Element> {
    // For queryAll, we don't cache as NodeList can change frequently
    return parent.querySelectorAll(selector);
  }
  
  invalidate(parent?: Element): void {
    if (parent) {
      this.cache.delete(parent);
    } else {
      this.cache = new WeakMap();
      console.log('%c🔄 DOM cache cleared', 'color: #1DA1F2; font-weight: bold');
    }
  }
  
  getStats() {
    return {
      totalQueries: this.queryCount,
      cacheHits: this.cacheHits,
      hitRate: this.queryCount > 0 ? Math.round((this.cacheHits / this.queryCount) * 100) : 0
    };
  }
  
  destroy(): void {
    // Stop observing all elements
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Clear all caches
    this.cache = new WeakMap();
    this.observedElements = new WeakSet();
    this.queryCount = 0;
    this.cacheHits = 0;
    
    console.log('%c🗑️ DOM cache destroyed', 'color: #DC3545; font-weight: bold');
  }
}

// Global DOM cache instance
const domCache = new DOMCache();

// Export for external access (e.g., cleanup)
export { domCache as DOMCache };

// Centralized selector configuration with fallback chains
interface SelectorChain {
  primary: string;
  fallbacks: string[];
}

const SELECTOR_CHAINS: Record<string, SelectorChain> = {
  replyTextarea: {
    primary: '[data-testid^="tweetTextarea_"][contenteditable="true"]',
    fallbacks: [
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][aria-label*="tweet"]',
      '[contenteditable="true"][aria-label*="Tweet"]',
      '[contenteditable="true"][aria-label*="Post"]',
      '[contenteditable="true"][aria-label*="Reply"]',
      '[contenteditable="true"][aria-multiline="true"]',
      '[contenteditable="true"][spellcheck="true"]',
      'div[contenteditable="true"][dir="auto"]',
      'div[contenteditable="true"]:not([aria-label*="Search"])'
    ]
  },
  toolbar: {
    primary: '[data-testid="toolBar"]',
    fallbacks: [
      '[role="group"]:has(button[data-testid="reply"])',
      '[role="group"]:has(svg[data-testid="reply"])',
      '[role="group"]:has(button[aria-label*="reply" i])',
      '[role="group"]:has(button[aria-label*="Reply" i])',
      '[role="group"][aria-label*="toolbar" i]',
      'div[role="group"]:has(button[role="button"])',
      'div:has(> button[aria-label*="emoji" i])',
      'div:has(> button[aria-label*="gif" i])',
      // Structure-based fallback for reply contexts
      '[contenteditable="true"] ~ div[role="group"]',
      '[contenteditable="true"] ~ * div[role="group"]'
    ]
  },
  tweetText: {
    primary: '[data-testid="tweetText"]',
    fallbacks: [
      '[data-testid="tweetText"] span',
      'article [lang][dir="auto"]:not([contenteditable])',
      'article div[lang]:not([contenteditable])',
      'article div[dir="auto"] span',
      'article div[lang] span',
      // Structure fallback for tweet content
      'article > div > div > div > div > div[lang]',
      'article div[style*="color"] span',
      'article div[class*="css-"] span[class*="css-"]'
    ]
  },
  originalTweet: {
    primary: 'article[data-testid="tweet"][tabindex="-1"]',
    fallbacks: [
      'article[data-testid="tweet"]:first-of-type',
      'article[data-testid="tweet"]',
      'article[role="article"]:has([data-testid="tweetText"])',
      'article[role="article"]:has(time)',
      'article:has(a[href*="/status/"])',
      'div[data-testid="cellInnerDiv"] article',
      'main article:has([data-testid="tweetText"])',
      'main article:has(div[lang])',
      // Last resort: any article with tweet-like structure
      'article:has(time):has(div[lang])'
    ]
  },
  authorHandle: {
    primary: '[data-testid="User-Name"] a[href^="/"]',
    fallbacks: [
      '[data-testid="User-Name"] a',
      'a[href^="/"][dir="ltr"]:has(span)',
      'a[href^="/"]:has(div > span[dir])',
      'article a[href^="/"]:has(@)',
      'article a[tabindex="-1"][href^="/"]',
      // Username pattern matching
      'a[href^="/"]:not([href*="/status/"]):not([href="/home"])',
      'div[dir="ltr"] a[href^="/"]'
    ]
  },
  replyButton: {
    primary: 'button[data-testid="reply"]',
    fallbacks: [
      'button[aria-label*="Reply" i]',
      'div[role="button"][aria-label*="Reply" i]',
      'button[role="button"]:has(svg path[d*="M1.751"])',
      'button:has(svg path[d*="M12 3.786"])',
      // Icon-based detection
      'button:has(svg[viewBox="0 0 24 24"])',
      '[role="group"] > div:first-child button[role="button"]'
    ]
  }
};

/**
 * Enhanced fallback strategies for DOM selection
 * Task 1.4: Implement 4-strategy fallback system
 */
class FallbackStrategies {
  /**
   * Strategy 1: Try primary selector (data-testid, aria-label)
   */
  static tryPrimarySelector(container: Element, selector: string): Element | null {
    try {
      return domCache.query(container, selector);
    } catch (e) {
      console.log(`%c⚠️ Primary selector failed: ${selector}`, 'color: #FFA500');
      return null;
    }
  }

  /**
   * Strategy 2: Try by class combinations
   */
  static tryByClassCombination(container: Element, elementType: string): Element | null {
    const classCombinations: Record<string, string[]> = {
      replyTextarea: [
        'div.DraftEditor-root div[contenteditable="true"]',
        'div[class*="DraftEditor"] [contenteditable="true"]',
        'div[class*="public-DraftEditor"] [contenteditable="true"]',
        '[class*="tweet"][class*="text"] [contenteditable="true"]',
        '[class*="compose"] [contenteditable="true"]'
      ],
      toolbar: [
        'div[class*="toolbar"]',
        'div[class*="ToolBar"]',
        'div[class*="actions"]',
        '[class*="tweet"][class*="action"]',
        '[class*="engagement"] [role="group"]'
      ],
      replyButton: [
        'button[class*="reply"]',
        '[class*="reply"][role="button"]',
        '[class*="action"][class*="reply"]',
        'div[class*="reply"] button'
      ]
    };

    const combinations = classCombinations[elementType] || [];
    for (const selector of combinations) {
      const element = container.querySelector(selector);
      if (element) {
        console.log(`%c✅ Found by class combination: ${selector}`, 'color: #17BF63');
        return element as Element;
      }
    }
    return null;
  }

  /**
   * Strategy 3: Try by structure/position
   */
  static tryByStructure(container: Element, elementType: string): Element | null {
    const structuralPatterns: Record<string, () => Element | null> = {
      replyTextarea: () => {
        // Look for contenteditable that's a sibling of toolbar elements
        const toolbars = container.querySelectorAll('[role="group"]');
        for (const toolbar of toolbars) {
          const sibling = toolbar.previousElementSibling || toolbar.parentElement?.querySelector('[contenteditable="true"]');
          if (sibling && sibling.getAttribute('contenteditable') === 'true') {
            console.log('%c✅ Found textarea by structure', 'color: #17BF63');
            return sibling;
          }
        }
        
        // Look for contenteditable within compose areas
        const composeAreas = container.querySelectorAll('form, [role="dialog"], [aria-modal="true"]');
        for (const area of composeAreas) {
          const editable = area.querySelector('[contenteditable="true"]');
          if (editable) {
            console.log('%c✅ Found textarea in compose area', 'color: #17BF63');
            return editable;
          }
        }
        return null;
      },
      toolbar: () => {
        // Find toolbar near contenteditable
        const editables = container.querySelectorAll('[contenteditable="true"]');
        for (const editable of editables) {
          // Check siblings
          let sibling = editable.nextElementSibling;
          while (sibling) {
            if (sibling.getAttribute('role') === 'group' || sibling.querySelector('[role="group"]')) {
              console.log('%c✅ Found toolbar by structure', 'color: #17BF63');
              return sibling.querySelector('[role="group"]') || sibling;
            }
            sibling = sibling.nextElementSibling;
          }
          // Check parent's siblings
          const parent = editable.parentElement;
          if (parent) {
            const toolbar = parent.querySelector('[role="group"]') || 
                          parent.nextElementSibling?.querySelector('[role="group"]');
            if (toolbar) {
              console.log('%c✅ Found toolbar in parent structure', 'color: #17BF63');
              return toolbar;
            }
          }
        }
        return null;
      },
      replyButton: () => {
        // Find first button in toolbar groups
        const groups = container.querySelectorAll('[role="group"]');
        for (const group of groups) {
          const firstButton = group.querySelector('button, [role="button"]');
          if (firstButton) {
            // Verify it's likely a reply button by position (usually first)
            const allButtons = group.querySelectorAll('button, [role="button"]');
            if (allButtons[0] === firstButton) {
              console.log('%c✅ Found reply button by position', 'color: #17BF63');
              return firstButton;
            }
          }
        }
        return null;
      }
    };

    const finder = structuralPatterns[elementType];
    return finder ? finder() : null;
  }

  /**
   * Strategy 4: Try by text content search
   */
  static tryByTextContent(container: Element, elementType: string): Element | null {
    const textPatterns: Record<string, string[]> = {
      replyButton: ['Reply', 'reply', '回复', 'Responder', 'Répondre', 'Antworten'],
      toolbar: ['Reply', 'Retweet', 'Like', 'Share']
    };

    const patterns = textPatterns[elementType];
    if (!patterns) return null;

    // Search for elements containing the text
    const allElements = container.querySelectorAll('button, [role="button"], [role="group"]');
    for (const element of allElements) {
      const text = element.textContent || '';
      const ariaLabel = element.getAttribute('aria-label') || '';
      
      for (const pattern of patterns) {
        if (text.includes(pattern) || ariaLabel.includes(pattern)) {
          console.log(`%c✅ Found by text content: "${pattern}"`, 'color: #17BF63');
          return element;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if we should warn about missing element based on context
   */
  static shouldWarnForMissingElement(elementType: string): boolean {
    switch (elementType) {
      case 'replyTextarea':
      case 'toolbar':
        // Only warn if we're in a compose/reply context
        const hasComposeModal = !!document.querySelector('[aria-label*="Compose"]');
        const hasReplyContext = !!document.querySelector('[data-testid*="reply"]');
        const isReplyPage = window.location.pathname.includes('/compose') || 
                           window.location.href.includes('reply');
        return hasComposeModal || hasReplyContext || isReplyPage;
      
      case 'tweetText':
      case 'originalTweet':
        // Only warn if we're on a page with tweets
        return !!document.querySelector('article');
      
      default:
        // For other elements, don't warn unless we're on Twitter
        return window.location.hostname.includes('twitter.com') || 
               window.location.hostname.includes('x.com');
    }
  }

  /**
   * Main fallback method that tries all strategies
   */
  static findWithFallback(container: Element, elementType: string): Element | null {
    const chain = SELECTOR_CHAINS[elementType];
    if (!chain) {
      console.warn(`%c⚠️ No fallback chain for: ${elementType}`, 'color: #FFA500');
      return null;
    }

    // Strategy 1: Try primary selector
    let element = this.tryPrimarySelector(container, chain.primary);
    if (element) return element;

    // Try CSS fallbacks from the chain
    for (const fallback of chain.fallbacks) {
      element = this.tryPrimarySelector(container, fallback);
      if (element) {
        console.log(`%c✅ Found with CSS fallback: ${fallback}`, 'color: #17BF63');
        return element;
      }
    }

    // Strategy 2: Try class combinations
    element = this.tryByClassCombination(container, elementType);
    if (element) return element;

    // Strategy 3: Try structural patterns
    element = this.tryByStructure(container, elementType);
    if (element) return element;

    // Strategy 4: Try text content (last resort)
    element = this.tryByTextContent(container, elementType);
    if (element) return element;

    // Only log error if we're in a context where we'd expect this element
    if (this.shouldWarnForMissingElement(elementType)) {
      console.warn(`%c❌ All fallback strategies failed for: ${elementType}`, 'color: #DC3545');
    }
    return null;
  }
}

export class DOMUtils {
  // Legacy selectors for backward compatibility
  static readonly REPLY_TEXTAREA_SELECTOR = SELECTOR_CHAINS.replyTextarea.primary;
  static readonly TOOLBAR_SELECTOR = SELECTOR_CHAINS.toolbar.primary;
  static readonly TWEET_TEXT_SELECTOR = SELECTOR_CHAINS.tweetText.primary;
  static readonly ORIGINAL_TWEET_SELECTOR = SELECTOR_CHAINS.originalTweet.primary;
  
  // Track selector performance
  private static selectorStats = new Map<string, { primary: number; fallback: number; failed: number }>();
  private static lastReportTime = Date.now();

  /**
   * Resilient selector finder with automatic fallback
   * Enhanced with 4-strategy fallback system (Task 1.4)
   */
  static findWithFallback(selectorType: keyof typeof SELECTOR_CHAINS, parent?: Element): Element | null {
    const searchRoot = parent || document;
    
    // Initialize stats if needed
    if (!this.selectorStats.has(selectorType)) {
      this.selectorStats.set(selectorType, { primary: 0, fallback: 0, failed: 0 });
    }
    const stats = this.selectorStats.get(selectorType)!;
    
    // Use the enhanced fallback system (cast document to Element for compatibility)
    const element = FallbackStrategies.findWithFallback(searchRoot as Element, selectorType);
    
    if (element) {
      // Determine if it was primary or fallback based on the selector
      const chain = SELECTOR_CHAINS[selectorType];
      const isPrimary = searchRoot.querySelector(chain.primary) === element;
      
      if (isPrimary) {
        stats.primary++;
      } else {
        stats.fallback++;
        // Log when fallback is used (only first time or every 10 uses)
        if (stats.fallback === 1 || stats.fallback % 10 === 0) {
          console.log(`%c⚠️ DOM Resilience: Using fallback for ${selectorType}`, 'color: #FFA500');
        }
      }
      return element;
    }
    
    // Failed to find element
    stats.failed++;
    
    // Report stats periodically (every 5 minutes)
    const now = Date.now();
    if (now - this.lastReportTime > 300000) {
      this.reportSelectorStats();
      this.lastReportTime = now;
    }
    
    return null;
  }
  
  /**
   * Report selector performance statistics
   */
  private static reportSelectorStats(): void {
    console.log('%c📊 DOM Selector Resilience Report', 'color: #1DA1F2; font-weight: bold');
    
    this.selectorStats.forEach((stats, type) => {
      const total = stats.primary + stats.fallback + stats.failed;
      if (total > 0) {
        const primaryRate = Math.round((stats.primary / total) * 100);
        const fallbackRate = Math.round((stats.fallback / total) * 100);
        const failRate = Math.round((stats.failed / total) * 100);
        
        console.log(`%c  ${type}:`, 'color: #657786', 
          `Primary: ${primaryRate}%`, 
          `Fallback: ${fallbackRate}%`,
          `Failed: ${failRate}%`
        );
      }
    });
  }
  
  /**
   * Test selector health on startup
   */
  static testSelectorHealth(): void {
    console.log('%c🔍 Testing DOM Selector Health', 'color: #1DA1F2; font-weight: bold');
    
    const results: { [key: string]: string } = {};
    
    // Test each selector chain
    Object.keys(SELECTOR_CHAINS).forEach(selectorType => {
      const chain = SELECTOR_CHAINS[selectorType as keyof typeof SELECTOR_CHAINS];
      
      // Test primary
      let element = document.querySelector(chain.primary);
      if (element) {
        results[selectorType] = '✅ Primary';
      } else {
        // Test fallbacks
        let fallbackIndex = -1;
        for (let i = 0; i < chain.fallbacks.length; i++) {
          try {
            element = document.querySelector(chain.fallbacks[i]);
            if (element) {
              fallbackIndex = i;
              break;
            }
          } catch (e) {
            // Selector might be invalid (e.g., :has() not supported)
          }
        }
        
        if (fallbackIndex >= 0) {
          results[selectorType] = `⚠️ Fallback #${fallbackIndex + 1}`;
        } else {
          results[selectorType] = '❌ Not found';
        }
      }
    });
    
    // Log results
    Object.entries(results).forEach(([type, status]) => {
      const color = status.includes('✅') ? '#17BF63' : 
                    status.includes('⚠️') ? '#FFA500' : '#DC3545';
      console.log(`%c  ${type}: ${status}`, `color: ${color}`);
    });
  }

  /**
   * Determine if we should expect an element to exist based on current context
   */
  private static shouldExpectElement(selectorType: keyof typeof SELECTOR_CHAINS): boolean {
    switch (selectorType) {
      case 'replyTextarea': {
        // Only expect reply textarea when we're in compose/reply mode
        // Check for compose tweet modal, reply modal, or inline reply
        const hasComposeModal = !!document.querySelector('[data-testid="tweetTextarea_0"]');
        const hasReplyModal = !!document.querySelector('[data-testid="tweetTextarea_1"]');
        const isReplyPage = window.location.pathname.includes('/compose/tweet') || 
                           window.location.href.includes('reply');
        return hasComposeModal || hasReplyModal || isReplyPage;
      }
      case 'toolbar':
        // Only expect toolbar in tweet contexts, not on profile pages or other pages
        return !!document.querySelector('article[data-testid="tweet"]') || 
               window.location.pathname.includes('/status/');
      case 'tweetText':
        // Only expect tweet text when we're on a tweet page with actual tweets
        return !!document.querySelector('article[data-testid="tweet"]');
      case 'originalTweet':
        // Only expect original tweet when we're on a specific tweet page
        return window.location.pathname.includes('/status/');
      default:
        return true;
    }
  }

  static findClosestTextarea(element: Element): HTMLElement | null {
    // Determine if we should be silent based on context
    const silent = !this.shouldExpectElement('replyTextarea');
    
    // Use resilient selector with fallback
    let textarea = this.findWithFallback('replyTextarea', element) as HTMLElement;
    if (textarea) {
      return textarea;
    }

    // Search upward in the DOM tree with fallback selectors
    let parent = element.parentElement;
    while (parent) {
      textarea = this.findWithFallback('replyTextarea', parent) as HTMLElement;
      if (textarea) {
        return textarea;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  static extractTwitterContext(): TwitterContext {
    const context: TwitterContext = {
      isReply: false
    };

    // Check if this is a reply by looking for the original tweet
    const originalTweetElement = this.findWithFallback('originalTweet');
    
    if (originalTweetElement) {
      context.isReply = true;
      
      // Extract original tweet text
      const tweetTextElement = this.findWithFallback('tweetText', originalTweetElement);
      if (tweetTextElement) {
        const rawText = tweetTextElement.textContent || '';
        // Clean tracking parameters from any URLs in the tweet
        context.tweetText = URLCleaner.cleanTextURLs(rawText);
        if (rawText !== context.tweetText) {
          console.log('%c🧽 URL Tracking Cleaned', 'color: #FFAD1F; font-weight: bold');
        }
        console.log('%c🔍 Tweet Extraction', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
        console.log(`%c  Text: "${context.tweetText?.substring(0, 100)}${(context.tweetText?.length || 0) > 100 ? '...' : ''}"`, 'color: #FFFFFF');
      } else {
        console.warn('%c⚠️ Tweet text element not found in DOM', 'color: #E0245E; font-weight: bold');
      }

      // Extract author handle (if needed for future features)
      const handleElement = originalTweetElement.querySelector('[data-testid="User-Name"] a');
      if (handleElement) {
        const href = handleElement.getAttribute('href');
        if (href) {
          context.authorHandle = href.replace('/', '');
          console.log(`%c  Author: @${context.authorHandle}`, 'color: #657786');
        }
      }
      
      // Extract tweet ID from the tweet link (avoid quoted/embedded tweets)
      // First try to find the timestamp anchor which is more reliable
      const timeElement = originalTweetElement.querySelector('time');
      const tweetLink = timeElement?.closest('a') as HTMLAnchorElement | null;
      
      if (tweetLink) {
        const match = tweetLink.href.match(/\/status\/(\d+)/);
        if (match && match[1]) {
          context.tweetId = match[1];
          console.log(`%c  Tweet ID: ${context.tweetId}`, 'color: #657786');
        }
      } else {
        // Fallback to the previous selector if no time element found
        const fallbackLink = originalTweetElement.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
        if (fallbackLink) {
          const match = fallbackLink.href.match(/\/status\/(\d+)/);
          if (match && match[1]) {
            context.tweetId = match[1];
            console.log(`%c  Tweet ID (fallback): ${context.tweetId}`, 'color: #657786');
          }
        }
      }

      // Extract thread context (3 additional tweets for more context)
      const threadContext = this.extractThreadContext();
      if (threadContext && threadContext.length > 0) {
        context.threadContext = threadContext;
        console.log('%c🧵 Thread Detection', 'color: #17BF63; font-weight: bold; font-size: 14px');
        console.log(`%c  Found ${threadContext.length} additional tweets for context`, 'color: #657786');
        console.groupCollapsed('%c  Click to view thread details', 'color: #794BC4; cursor: pointer');
        threadContext.forEach((tweet, index) => {
          console.log(`%c  Context Tweet ${index + 1}: ${tweet.author}`, 'color: #1DA1F2');
          console.log(`%c    "${tweet.text.substring(0, 80)}${tweet.text.length > 80 ? '...' : ''}"`, 'color: #657786; font-style: italic');
        });
        console.groupEnd();
      }
    } else {
      console.log('%c💬 Not a reply context', 'color: #657786; font-style: italic');
    }

    return context;
  }

  /**
   * Optimized thread context extraction with improved performance
   * @returns Array of tweet objects with author and text (up to 3 tweets for context)
   */
  static extractThreadContext(): Array<{author: string, text: string}> | null {
    const startTime = performance.now();
    const threadTweets: Array<{author: string, text: string}> = [];
    const seenTexts = new Set<string>();
    
    try {
      console.log('%c🧵 Thread Context: Starting optimized extraction', 'color: #794BC4; font-weight: bold');
      
      // Pre-cache selectors for better performance
      const tweetSelector = 'article[data-testid="tweet"]';
      const authorSelector = '[data-testid="User-Name"] a';
      
      // Use querySelectorAll once and cache the result
      const allTweetArticles = document.querySelectorAll(tweetSelector);
      console.log(`%c  Found ${allTweetArticles.length} tweet articles to process`, 'color: #657786');
      
      // Batch process tweets with early termination
      let processedCount = 0;
      const maxTweets = Math.min(3, allTweetArticles.length);
      
      for (let i = 0; i < allTweetArticles.length && threadTweets.length < maxTweets; i++) {
        const article = allTweetArticles[i];
        processedCount++;
        
        // Extract tweet text using resilient selector (already optimized)
        const tweetTextEl = this.findWithFallback('tweetText', article);
        if (!tweetTextEl) continue;
        
        const tweetText = URLCleaner.cleanTextURLs(tweetTextEl.textContent || '');
        
        // Skip empty or duplicate tweets
        if (!tweetText.trim() || seenTexts.has(tweetText)) continue;
        seenTexts.add(tweetText);
        
        // Extract author info with cached selector
        const authorEl = article.querySelector(authorSelector);
        let author = 'Unknown';
        if (authorEl) {
          const href = authorEl.getAttribute('href');
          if (href) {
            author = href.replace('/', '@');
          }
        }
        
        // Add to thread context
        threadTweets.push({ author, text: tweetText });
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      console.log('%c🚀 Thread Context: Extraction complete', 'color: #17BF63; font-weight: bold');
      console.log(`%c  Processed ${processedCount} articles in ${processingTime.toFixed(1)}ms`, 'color: #657786');
      console.log(`%c  Found ${threadTweets.length} valid thread tweets`, 'color: #657786');
      
      // Return in chronological order (oldest first)
      return threadTweets.reverse();
      
    } catch (error) {
      console.error('%c❌ Error extracting thread context', 'color: #E0245E; font-weight: bold');
      console.error(error);
      return null;
    }
  }

  static setTextareaValue(textarea: HTMLElement, text: string): void {
    try {
      // Focus the textarea first
      textarea.focus();
      
      // Check if this is a standard HTML textarea (HypeFury) or contentEditable (Twitter)
      if (textarea instanceof HTMLTextAreaElement) {
        // HypeFury uses standard textareas
        textarea.value = text;
        
        // Trigger proper events for React/Vue/Angular frameworks
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(textarea, text);
        }
        
        // Dispatch input event to trigger framework updates
        const inputEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(inputEvent);
        
        // Also dispatch change event for good measure
        const changeEvent = new Event('change', { bubbles: true });
        textarea.dispatchEvent(changeEvent);
        
        return;
      }
      
      // Twitter's contentEditable approach
      // Use the paste event approach (proven to work in TweetGPT)
      const dataTransfer = new DataTransfer();
      
      // Set the text data
      dataTransfer.setData("text/plain", text);
      
      // Create and dispatch paste event
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      
      // Dispatch the paste event
      textarea.dispatchEvent(pasteEvent);
      
      // Clear DataTransfer data
      dataTransfer.clearData();
      
      // Also try to trigger an input event for good measure
      setTimeout(() => {
        const inputEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(inputEvent);
      }, 100);

    } catch (error) {
      console.error('Failed to set textarea value:', error);
      
      // Fallback: Try the simpler approach for contentEditable with proper sanitization
      try {
        const innerDiv = textarea.querySelector('div');
        if (innerDiv) {
          // Create span element safely without innerHTML to prevent XSS
          const span = document.createElement('span');
          span.setAttribute('data-text', 'true');
          span.textContent = text; // Use textContent to prevent HTML injection
          innerDiv.innerHTML = ''; // Clear existing content
          innerDiv.appendChild(span);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  static createSmartReplyButton(isRewriteMode: boolean = false): HTMLElement {
    const button = document.createElement('button');
    button.className = 'smart-reply-btn';
    
    if (isRewriteMode) {
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
          <path d="M13 17.5v2h5v-2h-5zm0-12v2h7v-2h-7zm0 6v2h7v-2h-7z" opacity="0.7"/>
        </svg>
        <span>AI Rewrite ✨</span>
      `;
      button.setAttribute('title', 'Rewrite your draft with AI');
      button.setAttribute('data-mode', 'rewrite');
    } else {
      button.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>AI Reply</span>
      `;
      button.setAttribute('title', 'Generate AI reply');
      button.setAttribute('data-mode', 'generate');
    }
    
    button.type = 'button';
    
    return button;
  }

  /**
   * Get the text content from a textarea (contentEditable div)
   */
  static getTextFromTextarea(textarea: HTMLElement): string {
    // For Twitter's contentEditable divs, we need to get innerText
    // Remove any zero-width spaces and trim
    const text = (textarea.innerText || textarea.textContent || '')
      .replace(/\u200B/g, '') // Remove zero-width spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .trim();
    
    return text;
  }

  /**
   * Check if a textarea has user-entered text
   */
  static hasUserText(textarea: HTMLElement): boolean {
    const text = DOMUtils.getTextFromTextarea(textarea);
    // Check if there's meaningful text (not just placeholder or empty)
    return text.length > 0 && 
           !text.toLowerCase().includes('post your reply') && 
           !text.toLowerCase().includes('add another tweet');
  }

  static async createToneDropdown(onToneSelect: (tone: string) => void): Promise<HTMLElement> {
    const dropdown = document.createElement('div');
    dropdown.className = 'smart-reply-dropdown';
    dropdown.id = `smart-reply-dropdown-${Date.now()}`; // Unique ID
    dropdown.style.display = 'none';
    
    // Get last used tone from session storage via service worker
    let lastTone: string | undefined;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_LAST_TONE' });
      if (response?.success) {
        lastTone = response.lastTone;
      }
    } catch (error) {
      console.log('Smart Reply: Could not get last tone:', error);
    }

    // Character count only (no status messages)
    const charCountContainer = document.createElement('div');
    charCountContainer.className = 'smart-reply-char-count';
    charCountContainer.style.display = 'none';
    charCountContainer.innerHTML = `
      <span class="char-count"><span class="char-current">0</span>/<span class="char-limit">280</span></span>
    `;
    dropdown.appendChild(charCountContainer);

    const tones = [
      { id: 'professional', name: 'Professional', emoji: '💼' },
      { id: 'casual', name: 'Casual', emoji: '😊' },
      { id: 'witty', name: 'Witty', emoji: '😏' },
      { id: 'supportive', name: 'Supportive', emoji: '🤝' },
      { id: 'contrarian', name: 'Contrarian', emoji: '🤔' }
    ];

    tones.forEach((tone, index) => {
      const option = document.createElement('div');
      option.className = 'smart-reply-option';
      
      // Pre-select last used tone
      const isLastUsed = tone.id === lastTone;
      if (isLastUsed) {
        option.innerHTML = `${tone.emoji} ${tone.name} ✓`;
        option.style.fontWeight = '600';
      } else {
        option.innerHTML = `${tone.emoji} ${tone.name}`;
      }
      
      option.setAttribute('role', 'button');
      option.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      // Add hover and focus effects
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
      });
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = '';
      });
      option.addEventListener('focus', () => {
        option.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        option.style.outline = '2px solid rgb(29, 155, 240)';
        option.style.outlineOffset = '-2px';
      });
      option.addEventListener('blur', () => {
        option.style.backgroundColor = '';
        option.style.outline = '';
      });
      
      option.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Save the selected tone to session storage via service worker
        try {
          await chrome.runtime.sendMessage({ type: 'SET_LAST_TONE', tone: tone.id });
        } catch (error) {
          console.log('Smart Reply: Could not save last tone:', error);
        }
        
        onToneSelect(tone.id);
        // Close dropdown after selection
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 100); // Small delay for visual feedback
      }, true);
      dropdown.appendChild(option);
    });

    return dropdown;
  }

  /**
   * Enhanced loading states with multi-stage progress
   */
  static showLoadingState(button: HTMLElement, stage: string = 'Generating'): void {
    button.classList.add('loading');
    
    // Try to find span element first
    let span = button.querySelector('span');
    if (span) {
      span.textContent = `${stage}...`;
    } else {
      // If no span exists, update the button's text content directly
      // but preserve any icons/svgs
      const svg = button.querySelector('svg');
      if (svg) {
        // If there's an SVG, create a span for the text
        button.innerHTML = '';
        button.appendChild(svg.cloneNode(true));
        const newSpan = document.createElement('span');
        newSpan.textContent = ` ${stage}...`;
        button.appendChild(newSpan);
      } else {
        // No SVG, just update text
        button.textContent = `${stage}...`;
      }
    }
    
    (button as HTMLButtonElement).disabled = true;
    
    // Add or update progress indicator
    let progressContainer = button.querySelector('.loading-progress') as HTMLElement;
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'loading-progress';
      progressContainer.innerHTML = `
        <div class="progress-bar-container">
          <div class="progress-bar"></div>
        </div>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      `;
      button.appendChild(progressContainer);
    }
    
    // Update loading stage
    const existingStage = button.getAttribute('data-loading-stage');
    button.setAttribute('data-loading-stage', stage);
    
    console.log(`%c⏳ Loading State: ${stage}`, 'color: #FFA500; font-weight: bold');
    if (existingStage && existingStage !== stage) {
      console.log(`%c  Progress: ${existingStage} → ${stage}`, 'color: #657786');
    }
  }

  static hideLoadingState(button: HTMLElement): void {
    button.classList.remove('loading');
    
    // Restore button text based on mode and platform
    const isRewriteMode = button.getAttribute('data-mode') === 'rewrite';
    const isHypeFury = button.classList.contains('smart-reply-button');
    
    const span = button.querySelector('span');
    if (span) {
      if (isRewriteMode) {
        span.textContent = 'AI Rewrite ✨';
      } else if (isHypeFury) {
        span.textContent = '✨ AI Reply';
      } else {
        span.textContent = 'AI Reply';
      }
    } else {
      // Fallback if no span
      if (isHypeFury) {
        button.textContent = '✨ AI Reply';
      } else {
        button.textContent = 'AI Reply';
      }
    }
    
    (button as HTMLButtonElement).disabled = false;
    
    // Remove progress indicator after a brief success animation
    const progressContainer = button.querySelector('.loading-progress');
    if (progressContainer) {
      // Show success state briefly
      progressContainer.innerHTML = '<div class="success-checkmark">✓</div>';
      progressContainer.classList.add('success');
      
      setTimeout(() => {
        progressContainer.remove();
      }, 800);
    }
    
    // Clear loading stage
    button.removeAttribute('data-loading-stage');
    
    console.log('%c✅ Loading Complete', 'color: #17BF63; font-weight: bold');
  }

  // Removed updateProgressText - no longer needed

  static updateCharCount(count: number): void {
    const charCountElements = document.querySelectorAll('.char-current');
    const limitElements = document.querySelectorAll('.char-limit');
    
    charCountElements.forEach(element => {
      element.textContent = count.toString();
      // Keep subtle gray color always
      const parent = element.closest('.char-count') as HTMLElement;
      if (parent) {
        parent.style.color = '#536471'; // Subtle gray
      }
    });

    // Check if user has premium (longer limit)
    const isPremium = document.querySelector('[data-testid="tweetTextarea_0_label"]')?.textContent?.includes('25,000');
    if (isPremium) {
      limitElements.forEach(element => {
        element.textContent = '25000';
      });
    }
    
    // Show char count container when we have a count
    const charCountContainers = document.querySelectorAll('.smart-reply-char-count');
    charCountContainers.forEach(element => {
      (element as HTMLElement).style.display = count > 0 ? 'block' : 'none';
    });
  }

  static showError(button: HTMLElement, message: string, errorType: 'network' | 'api' | 'context' | 'general' = 'general'): void {
    button.classList.add('error');
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'Error';
    }
    button.setAttribute('title', message);
    
    // Remove any loading progress
    const progressContainer = button.querySelector('.loading-progress');
    if (progressContainer) {
      progressContainer.innerHTML = '<div class="error-icon">⚠</div>';
      progressContainer.classList.add('error');
    }
    
    // Enhanced error logging with context
    console.log(`%c❌ Error State: ${errorType}`, 'color: #DC3545; font-weight: bold');
    console.log(`%c  Message: ${message}`, 'color: #657786');
    
    // Reset after 4 seconds (longer for users to read error)
    setTimeout(() => {
      button.classList.remove('error');
      if (span) {
        span.textContent = 'AI Reply';
      }
      button.setAttribute('title', 'Generate AI reply');
      
      // Remove error progress container
      if (progressContainer) {
        progressContainer.remove();
      }
      
      console.log('%c🔄 Error state cleared', 'color: #657786');
    }, 4000);
  }

  /**
   * Performance Optimization Suite: Get DOM cache statistics
   */
  static getDOMCacheStats() {
    return domCache.getStats();
  }

  /**
   * Performance Optimization Suite: Clear DOM cache for cleanup
   */
  static clearDOMCache(): void {
    domCache.invalidate();
  }

  /**
   * Performance Optimization Suite: Log performance metrics
   */
  static logPerformanceMetrics(): void {
    const stats = domCache.getStats();
    
    console.log('%c⚡ PERFORMANCE OPTIMIZATION SUITE', 'color: #17BF63; font-weight: bold; font-size: 14px');
    console.log('%c  DOM Query Cache:', 'color: #657786', 
               `${stats.hitRate}% hit rate (${stats.cacheHits}/${stats.totalQueries} queries)`);
    
    if (stats.totalQueries > 100) {
      const efficiency = stats.hitRate > 50 ? 'Excellent' : stats.hitRate > 30 ? 'Good' : 'Poor';
      console.log('%c  Cache Efficiency:', 'color: #657786', 
                 `${efficiency} - ${Math.round((stats.cacheHits / stats.totalQueries) * 100)}% CPU savings`);
    }
  }

  /**
   * Enhanced convenience methods using the 4-strategy fallback system
   * Task 1.4: Provide easy access to common elements with resilient fallbacks
   */
  static findReplyTextarea(parent?: Element): Element | null {
    return this.findWithFallback('replyTextarea', parent);
  }

  static findToolbar(parent?: Element): Element | null {
    return this.findWithFallback('toolbar', parent);
  }

  static findTweetText(parent?: Element): Element | null {
    return this.findWithFallback('tweetText', parent);
  }

  static findOriginalTweet(parent?: Element): Element | null {
    return this.findWithFallback('originalTweet', parent);
  }

  static findReplyButton(parent?: Element): Element | null {
    return this.findWithFallback('replyButton', parent);
  }

  static findAuthorHandle(parent?: Element): Element | null {
    return this.findWithFallback('authorHandle', parent);
  }

  /**
   * Test the health of all fallback strategies
   * Useful for debugging and monitoring selector robustness
   */
  static testFallbackStrategies(): void {
    console.log('%c🔍 Testing Enhanced Fallback Strategies', 'color: #1DA1F2; font-weight: bold');
    
    const testResults: Record<string, { strategy: string; success: boolean }> = {};
    
    Object.keys(SELECTOR_CHAINS).forEach(elementType => {
      // Test each strategy (use document.body as container)
      const container = document.body;
      
      // Test primary
      const primary = FallbackStrategies.tryPrimarySelector(
        container, 
        SELECTOR_CHAINS[elementType as keyof typeof SELECTOR_CHAINS].primary
      );
      
      // Test class combinations
      const byClass = FallbackStrategies.tryByClassCombination(container, elementType);
      
      // Test structural patterns
      const byStructure = FallbackStrategies.tryByStructure(container, elementType);
      
      // Test text content
      const byText = FallbackStrategies.tryByTextContent(container, elementType);
      
      // Determine which strategy worked
      let strategy = 'NONE';
      if (primary) strategy = 'Primary';
      else if (byClass) strategy = 'Class Combination';
      else if (byStructure) strategy = 'Structure';
      else if (byText) strategy = 'Text Content';
      
      testResults[elementType] = {
        strategy,
        success: strategy !== 'NONE'
      };
    });
    
    // Report results
    Object.entries(testResults).forEach(([type, result]) => {
      const icon = result.success ? '✅' : '❌';
      const color = result.success ? '#17BF63' : '#DC3545';
      console.log(`%c  ${icon} ${type}:`, `color: ${color}`, 
                  result.success ? `Found via ${result.strategy}` : 'Not found');
    });
  }
}