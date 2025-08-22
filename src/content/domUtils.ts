import { TwitterContext } from '@/types';

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
        context.tweetText = tweetTextElement.textContent || '';
      }

      // Extract author handle (if needed for future features)
      const handleElement = originalTweetElement.querySelector('[data-testid="User-Name"] a');
      if (handleElement) {
        const href = handleElement.getAttribute('href');
        if (href) {
          context.authorHandle = href.replace('/', '');
        }
      }
    }

    return context;
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

  static createToneDropdown(onToneSelect: (tone: string) => void): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'smart-reply-dropdown';
    dropdown.id = `smart-reply-dropdown-${Date.now()}`; // Unique ID
    dropdown.style.display = 'none';

    const tones = [
      { id: 'professional', name: 'Professional', emoji: '💼' },
      { id: 'casual', name: 'Casual', emoji: '😊' },
      { id: 'witty', name: 'Witty', emoji: '😏' },
      { id: 'supportive', name: 'Supportive', emoji: '🤝' },
      { id: 'contrarian', name: 'Contrarian', emoji: '🤔' }
    ];

    tones.forEach(tone => {
      const option = document.createElement('div');
      option.className = 'smart-reply-option';
      option.innerHTML = `${tone.emoji} ${tone.name}`;
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onToneSelect(tone.id);
        dropdown.style.display = 'none';
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
  }

  static hideLoadingState(button: HTMLElement): void {
    button.classList.remove('loading');
    const span = button.querySelector('span');
    if (span) {
      span.textContent = 'AI Reply';
    }
    (button as HTMLButtonElement).disabled = false;
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