/**
 * HypeFury platform-specific configurations and selectors
 */

export interface HypeFurySelectors {
  replyTextarea: string[];
  replyButton: string[];
  tweetText: string[];
  toolbar: string[];
  mentionItem: string[];
  feedItem: string[];
}

export const HYPEFURY_SELECTORS: HypeFurySelectors = {
  // Reply textarea selectors - based on the screenshots
  replyTextarea: [
    'textarea[placeholder="What would you like to say?"]',
    'textarea[placeholder*="reply"]',
    'textarea[placeholder*="comment"]',
    '[contenteditable="true"]',
    '.reply-input',
    '.comment-input'
  ],
  
  // Reply button selectors
  replyButton: [
    'button:has-text("Reply")',
    'button:has-text("Quote tweet")',
    'button:has-text("Skip")',
    '[data-testid="reply-button"]',
    '.reply-button',
    '.submit-reply'
  ],
  
  // Tweet/Post text selectors
  tweetText: [
    '.tweet-text',
    '.post-content',
    '.mention-text',
    '[data-testid="tweet-text"]',
    'p:has-text("@")',
    '.content-text'
  ],
  
  // Toolbar/action area selectors
  toolbar: [
    '.reply-actions',
    '.tweet-actions',
    '.action-buttons',
    'div:has(> button:has-text("Reply"))',
    '.toolbar',
    '.actions-container'
  ],
  
  // Mention item containers
  mentionItem: [
    '.mention-item',
    '.mention-container',
    '[data-testid="mention"]',
    'article',
    '.tweet-container'
  ],
  
  // Feed item containers
  feedItem: [
    '.feed-item',
    '.engagement-item',
    '[data-testid="feed-item"]',
    'article',
    '.post-container'
  ]
};

/**
 * Platform detection utilities for HypeFury
 */
export class HypeFuryPlatform {
  /**
   * Check if we're on HypeFury
   */
  static isHypeFury(): boolean {
    return window.location.hostname === 'app.hypefury.com';
  }
  
  /**
   * Check if we're on the mentions page
   */
  static isMentionsPage(): boolean {
    return this.isHypeFury() && window.location.pathname.includes('/mentions');
  }
  
  /**
   * Check if we're on the feed/engagement builder page
   */
  static isFeedPage(): boolean {
    return this.isHypeFury() && 
           (window.location.pathname.includes('/feed') || 
            window.location.pathname.includes('/engagement'));
  }
  
  /**
   * Find element with fallback selectors
   */
  static findElement(selectors: string[], parent?: Element): Element | null {
    const searchRoot = parent || document;
    
    for (const selector of selectors) {
      try {
        // Handle special pseudo-selectors that need custom logic
        if (selector.includes(':has-text(')) {
          const match = selector.match(/(.*):has-text\("(.*)"\)/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = searchRoot.querySelectorAll(baseSelector);
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i];
              if (el.textContent?.includes(text)) {
                return el;
              }
            }
          }
        } else if (selector.includes(':has(')) {
          // Skip complex :has() selectors for now, use simpler alternatives
          continue;
        } else {
          const element = searchRoot.querySelector(selector);
          if (element) {
            return element;
          }
        }
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`, e);
      }
    }
    
    return null;
  }
  
  /**
   * Find all reply textareas on the page
   */
  static findReplyTextareas(): NodeListOf<Element> {
    const textareas: Element[] = [];
    
    for (const selector of HYPEFURY_SELECTORS.replyTextarea) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!textareas.includes(el)) {
            textareas.push(el);
          }
        });
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`, e);
      }
    }
    
    // Convert to NodeList-like structure
    return textareas as unknown as NodeListOf<Element>;
  }
  
  /**
   * Extract context from HypeFury mention/feed item
   */
  static extractContext(container: Element): { text: string; author: string } {
    let text = '';
    let author = '';
    
    console.log('%c🔍 Extracting context from container:', 'color: #667eea', container);
    
    // Helper function to clean and validate text
    const isValidTweetText = (content: string): boolean => {
      if (!content || content.length < 10) return false;
      
      // Filter out CSS, HTML, and UI elements
      const invalidPatterns = [
        /^\./,  // CSS class selectors
        /^#/,   // CSS ID selectors  
        /{.*}/,  // CSS rules
        /^Reply$/i,
        /^Quote/i,
        /^Skip$/i,
        /^\d+ (hours?|minutes?|days?) ago$/i,
        /^View \d+ replies?$/i,
        /^Show more$/i,
        /^Loading/i
      ];
      
      return !invalidPatterns.some(pattern => pattern.test(content));
    };
    
    // Strategy 1: Look for tweet text in specific locations
    const textSelectors = [
      // Most specific selectors first
      '[data-cy="tweet-text"]',
      '[data-testid="tweet-text"]',
      '.tweet-content',
      '.post-text',
      '.mention-text',
      // Look for paragraphs that are likely tweet content
      'p:not([class*="text-xs"]):not([class*="text-gray"])',
      // Divs with substantial text
      'div[class*="text-base"]:not([class*="gray"])',
      'div[class*="text-sm"]:not([class*="gray"])',
      // Generic but filtered
      'p',
      'div.text-black',
      'div.dark\\:text-white'
    ];
    
    // Try each selector until we find valid tweet text
    for (const selector of textSelectors) {
      try {
        const elements = container.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          // Skip if element has child elements (likely a container)
          if (element.children.length > 2) continue;
          
          const content = element.textContent?.trim() || '';
          if (isValidTweetText(content)) {
            // Check if this looks like actual tweet content
            // Tweets often have @mentions, hashtags, complete sentences, or data
            const looksLikeTweet = 
              content.includes('@') || 
              content.includes('#') ||
              content.includes(':') || // Data tweets often have colons
              content.includes('£') || // Currency symbols
              content.includes('$') ||
              content.includes('€') ||
              /\d{4}/.test(content) || // Years like 2016, 2025
              /\d+\.\d+/.test(content) || // Numbers like 7.20, 11.44
              content.length > 30 ||
              /[.!?]/.test(content);
              
            if (looksLikeTweet) {
              text = content;
              console.log('%c✅ Found tweet text:', 'color: #17BF63', text.substring(0, 100) + '...');
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Selector error:', selector, e);
      }
      if (text) break;
    }
    
    // Strategy 2: If no text found, look for tweet in a card/article structure
    if (!text) {
      // Look for article or card containers that might have the tweet
      const cards = container.querySelectorAll('article, [role="article"], .card, [class*="rounded"][class*="bg-"]');
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const paragraphs = card.querySelectorAll('p');
        for (let j = 0; j < paragraphs.length; j++) {
          const p = paragraphs[j];
          const content = p.textContent?.trim() || '';
          if (isValidTweetText(content) && content.length > 30) {
            text = content;
            console.log('%c✅ Found text in card structure:', 'color: #17BF63', text.substring(0, 100) + '...');
            break;
          }
        }
        if (text) break;
      }
    }
    
    // Strategy 3: Last resort - get all text and filter carefully
    if (!text) {
      const allText = container.textContent || '';
      const lines = allText.split('\n')
        .map(line => line.trim())
        .filter(line => isValidTweetText(line) && line.length > 30);
      
      // Find the longest valid line that looks like content
      const validLines = lines.filter(line => {
        // Additional filtering for actual content
        return !line.startsWith('http') && 
               !line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) && // Not just a name
               !line.match(/^\d+$/) && // Not just numbers
               (line.includes(' ') || line.length > 50); // Has spaces or is long
      });
      
      if (validLines.length > 0) {
        // Sort by length and take the longest one
        text = validLines.sort((a, b) => b.length - a.length)[0];
        console.log('%c🔍 Found text via broad search:', 'color: #FFA500', text.substring(0, 100) + '...');
      }
    }
    
    // Try to find author
    const authorSelectors = [
      // Twitter/X profile links
      'a[href*="twitter.com/"]:not([href*="/status/"])',
      'a[href*="x.com/"]:not([href*="/status/"])',
      // Username displays
      'span.font-bold:not(:empty)',
      'span.font-semibold:not(:empty)',
      'a.font-bold:not(:empty)',
      'a.font-semibold:not(:empty)',
      // Class-based
      '[class*="username"]',
      '[class*="author"]',
      '[class*="user-name"]'
    ];
    
    for (const selector of authorSelectors) {
      try {
        const element = container.querySelector(selector);
        if (element) {
          let content = element.textContent?.trim() || '';
          // Clean up the author name
          content = content.replace('@', '').replace(/^\s*·\s*/, '').trim();
          
          // Validate it looks like a username
          if (content && 
              content.length > 0 && 
              content.length < 30 &&
              !content.includes('Reply') &&
              !content.includes('Quote') &&
              !content.match(/^\d/) && // Doesn't start with number
              content.match(/^[a-zA-Z0-9_]+$/)) { // Valid username chars
            author = content;
            console.log('%c✅ Found author:', 'color: #17BF63', author);
            break;
          }
        }
      } catch (e) {
        console.warn('Author selector error:', selector, e);
      }
    }
    
    if (!text) {
      console.log('%c⚠️ No tweet text found in container', 'color: #FFA500');
    }
    
    return { text, author };
  }
  
  /**
   * Get the appropriate injection point for our AI button
   */
  static getButtonInjectionPoint(textarea: Element): Element | null {
    // Try to find the toolbar/action area near the textarea
    const parent = textarea.closest('.mention-item, .feed-item, article, [role="article"]');
    if (!parent) return null;
    
    // Look for existing action buttons container
    const toolbar = this.findElement(HYPEFURY_SELECTORS.toolbar, parent);
    if (toolbar) {
      return toolbar;
    }
    
    // Look for the Skip/Reply/Quote buttons area
    const buttonsContainer = parent.querySelector('.flex.gap-2, .button-group, .actions');
    if (buttonsContainer) {
      return buttonsContainer;
    }
    
    // Fallback: inject after the textarea
    return textarea.parentElement;
  }
  
  /**
   * Style adjustments for HypeFury
   */
  static applyPlatformStyles(): void {
    // Add custom styles for HypeFury
    const style = document.createElement('style');
    style.textContent = `
      /* HypeFury-specific styles for TweetCraft */
      .smart-reply-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-left: 8px;
      }
      
      .smart-reply-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      /* Adjust for HypeFury's dark theme */
      .unified-selector-popup {
        background: #1a1d29 !important;
        border: 1px solid #2a2d3a !important;
      }
      
      .unified-selector-popup .tab-button {
        background: #252834 !important;
        color: #a0a3b1 !important;
      }
      
      .unified-selector-popup .tab-button.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
      }
      
      /* Position adjustments for HypeFury layout */
      .hypefury-reply-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}