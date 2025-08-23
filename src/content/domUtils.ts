import { TwitterContext } from '@/types';
import { URLCleaner } from '@/utils/urlCleaner';

export class DOMUtils {
  // Twitter's reply textarea selector
  static readonly REPLY_TEXTAREA_SELECTOR = '[data-testid^="tweetTextarea_"][contenteditable="true"]';
  
  // Twitter's toolbar selector (where we'll inject our button)
  static readonly TOOLBAR_SELECTOR = '[data-testid="toolBar"]';
  
  // Tweet content selector
  static readonly TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
  
  // Original tweet selector (for replies)
  static readonly ORIGINAL_TWEET_SELECTOR = 'article[data-testid="tweet"][tabindex="-1"]';

  static findClosestTextarea(element: Element): HTMLElement | null {
    // Look for the textarea within or near the toolbar
    const textarea = element.querySelector(this.REPLY_TEXTAREA_SELECTOR) as HTMLElement;
    if (textarea) {
      return textarea;
    }

    // Search upward in the DOM tree
    let parent = element.parentElement;
    while (parent) {
      const textarea = parent.querySelector(this.REPLY_TEXTAREA_SELECTOR) as HTMLElement;
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
    const originalTweetElement = document.querySelector(this.ORIGINAL_TWEET_SELECTOR);
    
    if (originalTweetElement) {
      context.isReply = true;
      
      // Extract original tweet text
      const tweetTextElement = originalTweetElement.querySelector(this.TWEET_TEXT_SELECTOR);
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
   * Extract thread context by finding the first 3 tweets in the conversation
   * @returns Array of tweet objects with author and text (up to 3 tweets for context)
   */
  static extractThreadContext(): Array<{author: string, text: string}> | null {
    const threadTweets: Array<{author: string, text: string}> = [];
    const seenTexts = new Set<string>();
    
    try {
      // Twitter/X shows thread tweets in article elements with specific data-testid
      // Look for all tweet articles on the page
      const allTweetArticles = document.querySelectorAll('article[data-testid="tweet"]');
      
      // Get the first 3 tweets on the page (these are usually the thread context)
      for (let i = 0; i < allTweetArticles.length; i++) {
        const article = allTweetArticles[i];
        // Stop after collecting 3 tweets
        if (threadTweets.length >= 3) break;
        
        // Extract tweet text
        const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
        if (!tweetTextEl) continue;
        
        const tweetText = URLCleaner.cleanTextURLs(tweetTextEl.textContent || '');
        
        // Skip duplicates
        if (seenTexts.has(tweetText)) continue;
        seenTexts.add(tweetText);
        
        // Extract author info
        const authorEl = article.querySelector('[data-testid="User-Name"] a');
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
      
      // Reverse to get chronological order (oldest first)
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

  static showLoadingState(button: HTMLElement): void {
    button.classList.add('loading');
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'Generating...';
    }
    (button as HTMLButtonElement).disabled = true;
    // No progress text - loading animation is enough
  }

  static hideLoadingState(button: HTMLElement): void {
    button.classList.remove('loading');
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'AI Reply';
    }
    (button as HTMLButtonElement).disabled = false;
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

  static showError(button: HTMLElement, message: string): void {
    button.classList.add('error');
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'Error';
    }
    button.setAttribute('title', message);
    
    // Reset after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      if (span) {
        span.textContent = 'AI Reply';
      }
      button.setAttribute('title', 'Generate AI reply');
    }, 3000);
  }
}