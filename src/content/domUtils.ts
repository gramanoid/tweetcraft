import { TwitterContext } from '@/types';
import { URLCleaner } from '@/utils/urlCleaner';

// Performance Optimization Suite: DOM Query Caching
class DOMCache {
  private cache = new WeakMap<Element, Map<string, Element | null>>();
  private queryCount = 0;
  private cacheHits = 0;
  
  query(parent: Element, selector: string): Element | null {
    this.queryCount++;
    
    if (!this.cache.has(parent)) {
      this.cache.set(parent, new Map());
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
}

// Global DOM cache instance
const domCache = new DOMCache();

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
      'div[contenteditable="true"]'
    ]
  },
  toolbar: {
    primary: '[data-testid="toolBar"]',
    fallbacks: [
      '[role="group"]:has(button[data-testid="reply"])',
      '[role="group"]:has(svg[data-testid="reply"])',
      'div:has(button[aria-label*="reply"])'
    ]
  },
  tweetText: {
    primary: '[data-testid="tweetText"]',
    fallbacks: [
      '[data-testid="tweetText"] span',
      'article [lang] span',
      'article div[dir] span'
    ]
  },
  originalTweet: {
    primary: 'article[data-testid="tweet"][tabindex="-1"]',
    fallbacks: [
      'article[data-testid="tweet"]:first-of-type',
      'article[role="article"]:has([data-testid="tweetText"])',
      'main article:has([data-testid="tweetText"])'
    ]
  }
};

export class DOMUtils {
  // Legacy selectors for backward compatibility
  static readonly REPLY_TEXTAREA_SELECTOR = SELECTOR_CHAINS.replyTextarea.primary;
  static readonly TOOLBAR_SELECTOR = SELECTOR_CHAINS.toolbar.primary;
  static readonly TWEET_TEXT_SELECTOR = SELECTOR_CHAINS.tweetText.primary;
  static readonly ORIGINAL_TWEET_SELECTOR = SELECTOR_CHAINS.originalTweet.primary;

  /**
   * Resilient selector finder with automatic fallback - SILENT MODE
   */
  static findWithFallback(selectorType: keyof typeof SELECTOR_CHAINS, parent?: Element, silent = true): Element | null {
    const chain = SELECTOR_CHAINS[selectorType];
    const searchRoot = parent || document;
    
    // Try primary selector first (with caching for Element parents)
    let element: Element | null;
    if (parent) {
      element = domCache.query(parent, chain.primary);
    } else {
      element = searchRoot.querySelector(chain.primary);
    }
    
    if (element) {
      // Success - no logging needed
      return element;
    }
    
    // Try fallback selectors
    for (let i = 0; i < chain.fallbacks.length; i++) {
      if (parent) {
        element = domCache.query(parent, chain.fallbacks[i]);
      } else {
        element = searchRoot.querySelector(chain.fallbacks[i]);
      }
      
      if (element) {
        // Found with fallback - no logging needed
        return element;
      }
    }
    
    // Failed to find element - this is normal for non-reply contexts
    return null;
  }

  /**
   * Determine if we should expect an element to exist based on current context
   */
  private static shouldExpectElement(selectorType: keyof typeof SELECTOR_CHAINS): boolean {
    switch (selectorType) {
      case 'replyTextarea':
        // Only expect reply textarea when we're in compose/reply mode
        // Check for compose tweet modal, reply modal, or inline reply
        const hasComposeModal = !!document.querySelector('[data-testid="tweetTextarea_0"]');
        const hasReplyModal = !!document.querySelector('[data-testid="tweetTextarea_1"]');
        const isReplyPage = window.location.pathname.includes('/compose/tweet') || 
                           window.location.href.includes('reply');
        return hasComposeModal || hasReplyModal || isReplyPage;
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
    let textarea = this.findWithFallback('replyTextarea', element, silent) as HTMLElement;
    if (textarea) {
      return textarea;
    }

    // Search upward in the DOM tree with fallback selectors
    let parent = element.parentElement;
    while (parent) {
      textarea = this.findWithFallback('replyTextarea', parent, silent) as HTMLElement;
      if (textarea) {
        return textarea;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  static extractTwitterContext(toolbarElement: Element): TwitterContext {
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
      
      // Fallback: Try the simpler innerHTML approach
      try {
        const innerDiv = textarea.querySelector('div');
        if (innerDiv) {
          innerDiv.innerHTML = `<span data-text="true">${text}</span>`;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  static createSmartReplyButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'smart-reply-btn';
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <span>AI Reply</span>
    `;
    
    button.setAttribute('title', 'Generate AI reply');
    button.type = 'button';
    
    return button;
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
        // Don't close dropdown immediately - let it show progress
        // dropdown.style.display = 'none';
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
    const span = button.querySelector('span');
    if (span) {
      span.textContent = `${stage}...`;
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
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'AI Reply';
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
}