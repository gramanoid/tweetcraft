import { DOMUtils } from './domUtils';
import { OpenRouterService } from '@/services/openRouter';
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import { debounce, throttle } from '@/utils/debounce';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;
  private static readonly VERSION = '0.0.1';
  private isDestroyed = false;

  constructor() {
    // Check if another instance already exists
    if ((window as any).__smartReplyInstance) {
      console.log('TweetCraft: Previous instance detected, cleaning up...');
      (window as any).__smartReplyInstance.destroy();
    }
    
    // Register this instance
    (window as any).__smartReplyInstance = this;
    
    // Set up cleanup handlers
    this.setupCleanupHandlers();
    
    this.init();
  }

  private init(): void {
    // Check if already destroyed
    if (this.isDestroyed) return;
    
    console.log('TweetCraft Content Script: Initializing on', window.location.href);
    
    // Establish connection with service worker
    this.connectToServiceWorker();
    
    // Wait for the page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('TweetCraft Content Script: DOM ready, starting observation');
        if (!this.isDestroyed) this.startObserving();
      });
    } else {
      console.log('TweetCraft Content Script: DOM already ready, starting observation');
      this.startObserving();
    }
  }

  private setupCleanupHandlers(): void {
    // Clean up on page navigation (SPA navigation)
    const handleNavigation = () => {
      if (!this.isDestroyed) {
        console.log('Smart Reply: Page navigation detected, cleaning up...');
        this.destroy();
      }
    };
    
    // Listen for various navigation events
    window.addEventListener('beforeunload', handleNavigation);
    window.addEventListener('pagehide', handleNavigation);
    
    // Listen for history changes (Twitter is an SPA)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleNavigation();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleNavigation();
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    // Store cleanup functions for later
    (this as any).cleanupFunctions = [
      () => window.removeEventListener('beforeunload', handleNavigation),
      () => window.removeEventListener('pagehide', handleNavigation),
      () => window.removeEventListener('popstate', handleNavigation),
      () => { history.pushState = originalPushState; },
      () => { history.replaceState = originalReplaceState; }
    ];
  }

  private connectToServiceWorker(): void {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('Smart Reply: Extension context invalidated, cleaning up...');
        this.destroy();
        return;
      }
      
      this.port = chrome.runtime.connect({ name: 'content-script' });
      
      this.port.onDisconnect.addListener(() => {
        // Check if it's an invalidation error
        const error = chrome.runtime.lastError;
        if (error?.message?.includes('Extension context invalidated')) {
          console.log('Smart Reply: Extension was reloaded, cleaning up old instance...');
          this.destroy();
          return;
        }
        
        // Otherwise try silent reconnection
        this.port = null;
        setTimeout(() => this.connectToServiceWorker(), 1000);
      });
    } catch (error: any) {
      // Check for context invalidation
      if (error?.message?.includes('Extension context invalidated')) {
        console.log('Smart Reply: Extension context invalidated, stopping reconnection attempts');
        this.destroy();
        return;
      }
      
      // Only log actual errors, not context invalidation
      if (!error?.message?.includes('context invalidated')) {
        console.error('Smart Reply: Connection error:', error);
      }
      
      setTimeout(() => this.connectToServiceWorker(), 5000);
    }
  }

  private startObserving(): void {
    // Find the React root element
    const reactRoot = document.querySelector('#react-root');
    if (!reactRoot) {
      console.warn('Smart Reply: React root not found, retrying in 1 second...');
      setTimeout(() => {
        if (!this.isDestroyed) this.startObserving();
      }, 1000);
      return;
    }
    
    console.log('Smart Reply: React root found, setting up observer');

    // Create debounced handler for processing mutations
    const debouncedMutationHandler = debounce(() => {
      const toolbarsToProcess = new Set<Element>();
      
      // Find all unprocessed toolbars
      document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR).forEach(toolbar => {
        if (!this.processedToolbars.has(toolbar)) {
          toolbarsToProcess.add(toolbar);
        }
      });
      
      // Process all found toolbars
      toolbarsToProcess.forEach(toolbar => {
        this.handleToolbarAdded(toolbar);
      });
    }, 500); // Debounce for 500ms to batch rapid DOM changes

    // Set up mutation observer to detect new toolbars
    this.observer = new MutationObserver((mutations) => {
      // Just trigger the debounced handler, don't process mutations directly
      debouncedMutationHandler();
    });

    this.observer.observe(reactRoot, {
      childList: true,
      subtree: true
    });

    // Process existing toolbars
    const existingToolbars = document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR);
    console.log(`Smart Reply: Found ${existingToolbars.length} existing toolbars`);
    existingToolbars.forEach(toolbar => this.handleToolbarAdded(toolbar));
  }

  private async handleToolbarAdded(toolbarElement: Element): Promise<void> {
    // Avoid processing the same toolbar multiple times
    if (this.processedToolbars.has(toolbarElement)) {
      return;
    }

    // Check if button already exists in this toolbar
    if (toolbarElement.querySelector('.smart-reply-container')) {
      this.processedToolbars.add(toolbarElement);
      return;
    }

    this.processedToolbars.add(toolbarElement);

    // Find the associated textarea
    const textarea = DOMUtils.findClosestTextarea(toolbarElement);
    if (!textarea) {
      // Silent return - this happens often during Twitter's DOM updates
      return;
    }

    // Extract Twitter context
    const context = DOMUtils.extractTwitterContext(toolbarElement);
    
    // Create and inject the Smart Reply button
    await this.injectSmartReplyButton(toolbarElement, textarea, context);
  }

  private async injectSmartReplyButton(
    toolbarElement: Element, 
    textarea: HTMLElement, 
    context: any
  ): Promise<void> {
    try {
      // Create the button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'smart-reply-container';

      // Create the main button
      const button = DOMUtils.createSmartReplyButton();
      
      // Create the dropdown for tone selection
      const dropdown = await DOMUtils.createToneDropdown((tone: string) => {
        this.generateReply(textarea, context, tone);
      });

      // Function to update dropdown position
      const updateDropdownPosition = () => {
        if (dropdown.style.display === 'block') {
          const rect = button.getBoundingClientRect();
          dropdown.style.position = 'fixed';
          dropdown.style.top = `${rect.bottom + 5}px`;
          dropdown.style.left = `${rect.left}px`;
        }
      };

      // Add click handler for the main button
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other handlers
        
        // Toggle dropdown visibility
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
          // Position dropdown relative to button
          updateDropdownPosition();
          dropdown.style.zIndex = '10000'; // Higher z-index
          
          // Add scroll listener to update position
          window.addEventListener('scroll', updateDropdownPosition, true);
          
          // Focus first option for keyboard nav
          const firstOption = dropdown.querySelector('.smart-reply-option') as HTMLElement;
          if (firstOption) {
            firstOption.focus();
            firstOption.setAttribute('tabindex', '0');
          }
        } else {
          // Remove scroll listener when closing
          window.removeEventListener('scroll', updateDropdownPosition, true);
        }
        
        return false; // Prevent any default action
      }, true); // Use capture phase

      // Close dropdown when clicking outside or pressing Escape
      document.addEventListener('click', (e) => {
        if (!buttonContainer.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
          dropdown.style.display = 'none';
          // Remove scroll listener
          window.removeEventListener('scroll', updateDropdownPosition, true);
        }
      });
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'block') {
          const options = Array.from(dropdown.querySelectorAll('.smart-reply-option')) as HTMLElement[];
          const focusedIndex = options.findIndex(opt => opt === document.activeElement);
          
          switch(e.key) {
            case 'Escape':
              dropdown.style.display = 'none';
              window.removeEventListener('scroll', updateDropdownPosition, true);
              button.focus();
              e.preventDefault();
              break;
            case 'ArrowDown':
              e.preventDefault();
              const nextIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
              options[nextIndex]?.focus();
              options[nextIndex]?.setAttribute('tabindex', '0');
              break;
            case 'ArrowUp':
              e.preventDefault();
              const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
              options[prevIndex]?.focus();
              options[prevIndex]?.setAttribute('tabindex', '0');
              break;
            case 'Enter':
              if (focusedIndex >= 0) {
                e.preventDefault();
                options[focusedIndex]?.click();
              }
              break;
          }
        }
      });

      // Assemble the components
      buttonContainer.appendChild(button);
      
      // Append dropdown to body to avoid Twitter's event handlers
      document.body.appendChild(dropdown);

      // Find the right place to inject the button
      const toolbarContainer = toolbarElement.querySelector('div');
      if (toolbarContainer) {
        toolbarContainer.appendChild(buttonContainer);
        // Only log on first injection
        if (!document.querySelector('.smart-reply-container:nth-of-type(2)')) {
          console.log('Smart Reply: Ready');
        }
      } else {
        console.warn('Smart Reply: Could not find toolbar container');
      }

    } catch (error) {
      console.error('Smart Reply: Failed to inject button:', error);
    }
  }

  private async generateReply(
    textarea: HTMLElement, 
    context: any, 
    tone?: string
  ): Promise<void> {
    // Find the button to show loading state
    const container = textarea.closest('[role="dialog"], [role="main"]')?.querySelector('.smart-reply-container');
    const button = container?.querySelector('.smart-reply-btn') as HTMLElement;
    
    if (!button) {
      console.error('Smart Reply: Button not found for loading state');
      return;
    }

    try {
      // Show loading state
      DOMUtils.showLoadingState(button);
      console.log('Smart Reply: Generating reply with tone:', tone);

      // Check if API key is configured
      const apiKey = await StorageService.getApiKey();
      if (!apiKey) {
        DOMUtils.showError(button, 'Please configure your API key in the extension popup');
        console.error('Smart Reply: No API key configured');
        return;
      }

      // Prepare the request
      const request: ReplyGenerationRequest = {
        originalTweet: context.tweetText,
        tone: tone
      };

      console.log('Smart Reply: Request prepared:', request);

      // Generate the reply
      const response = await OpenRouterService.generateReply(request, context);

      if (response.success && response.reply) {
        // Set the generated text in the textarea
        DOMUtils.setTextareaValue(textarea, response.reply);
        
        // Update character count
        DOMUtils.updateCharCount(response.reply.length);
        
        console.log('Smart Reply: Reply generated successfully:', response.reply);
        
        // Close dropdown after successful generation
        const dropdown = document.querySelector('.smart-reply-dropdown') as HTMLElement;
        if (dropdown) {
          setTimeout(() => {
            dropdown.style.display = 'none';
            // Remove scroll listener
            window.removeEventListener('scroll', () => {}, true);
          }, 500); // Small delay to show the completion
        }
        
        // Listen for further edits to update char count
        const updateCount = () => {
          const currentText = textarea.textContent || '';
          DOMUtils.updateCharCount(currentText.length);
        };
        textarea.addEventListener('input', updateCount);
        
        // Store the listener for cleanup
        textarea.setAttribute('data-smart-reply-listener', 'true');
      } else {
        // Show error
        DOMUtils.showError(button, response.error || 'Failed to generate reply');
        console.error('Smart Reply: Generation failed:', response.error);
      }

    } catch (error) {
      console.error('Smart Reply: Error generating reply:', error);
      DOMUtils.showError(button, 'Network error occurred');
    } finally {
      // Hide loading state
      DOMUtils.hideLoadingState(button);
    }
  }

  public destroy(): void {
    // Prevent multiple destroy calls
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Disconnect port
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    
    // Run all cleanup functions
    const cleanupFunctions = (this as any).cleanupFunctions || [];
    cleanupFunctions.forEach((cleanup: Function) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Smart Reply: Error during cleanup:', error);
      }
    });
    
    // Remove all injected buttons and dropdowns
    document.querySelectorAll('.smart-reply-container').forEach(el => el.remove());
    document.querySelectorAll('.smart-reply-dropdown').forEach(el => el.remove());
    
    // Remove event listeners from buttons by cloning
    document.querySelectorAll('.smart-reply-button').forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode?.replaceChild(newButton, button);
    });
    
    // Clear processed toolbars
    this.processedToolbars = new WeakSet<Element>();
    
    // Unregister this instance
    if ((window as any).__smartReplyInstance === this) {
      delete (window as any).__smartReplyInstance;
    }
    
    console.log('Smart Reply: Content script destroyed');
  }
}

// Initialize the content script
const smartReply = new SmartReplyContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  smartReply.destroy();
});