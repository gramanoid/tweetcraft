import { DOMUtils } from './domUtils';
import { OpenRouterService } from '@/services/openRouter';
import { StorageService } from '@/services/storage';
import { ReplyGenerationRequest } from '@/types';
import './contentScript.scss';

class SmartReplyContentScript {
  private observer: MutationObserver | null = null;
  private processedToolbars = new WeakSet<Element>();
  private port: chrome.runtime.Port | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Establish connection with service worker
    this.connectToServiceWorker();
    
    // Wait for the page to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startObserving());
    } else {
      this.startObserving();
    }
  }

  private connectToServiceWorker(): void {
    try {
      this.port = chrome.runtime.connect({ name: 'content-script' });
      
      this.port.onDisconnect.addListener(() => {
        // Silent reconnection
        this.port = null;
        setTimeout(() => this.connectToServiceWorker(), 1000);
      });
    } catch (error) {
      console.error('Smart Reply: Failed to connect to service worker:', error);
      setTimeout(() => this.connectToServiceWorker(), 5000);
    }
  }

  private startObserving(): void {
    // Find the React root element
    const reactRoot = document.querySelector('#react-root');
    if (!reactRoot) {
      console.warn('Smart Reply: React root not found, retrying...');
      setTimeout(() => this.startObserving(), 1000);
      return;
    }

    // Set up mutation observer to detect new toolbars
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check if the added node is a toolbar
            if (element.matches(DOMUtils.TOOLBAR_SELECTOR)) {
              this.handleToolbarAdded(element);
            }
            
            // Check for toolbars within the added node
            const toolbars = element.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR);
            toolbars.forEach(toolbar => this.handleToolbarAdded(toolbar));
          }
        });
      });
    });

    this.observer.observe(reactRoot, {
      childList: true,
      subtree: true
    });

    // Process existing toolbars
    const existingToolbars = document.querySelectorAll(DOMUtils.TOOLBAR_SELECTOR);
    existingToolbars.forEach(toolbar => this.handleToolbarAdded(toolbar));
  }

  private handleToolbarAdded(toolbarElement: Element): void {
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
    this.injectSmartReplyButton(toolbarElement, textarea, context);
  }

  private injectSmartReplyButton(
    toolbarElement: Element, 
    textarea: HTMLElement, 
    context: any
  ): void {
    try {
      // Create the button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'smart-reply-container';

      // Create the main button
      const button = DOMUtils.createSmartReplyButton();
      
      // Create the dropdown for tone selection
      const dropdown = DOMUtils.createToneDropdown((tone: string) => {
        this.generateReply(textarea, context, tone);
      });

      // Add click handler for the main button
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop all other handlers
        
        // Toggle dropdown visibility
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
          // Position dropdown as fixed element
          const rect = button.getBoundingClientRect();
          dropdown.style.position = 'fixed'; // Use fixed positioning
          dropdown.style.top = `${rect.bottom + 5}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.zIndex = '10000'; // Higher z-index
        }
        
        return false; // Prevent any default action
      }, true); // Use capture phase

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!buttonContainer.contains(e.target as Node)) {
          dropdown.style.display = 'none';
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
        console.log('Smart Reply: Reply generated successfully:', response.reply);
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
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    
    // Remove all injected buttons and dropdowns
    document.querySelectorAll('.smart-reply-container').forEach(el => el.remove());
    document.querySelectorAll('.smart-reply-dropdown').forEach(el => el.remove());
    
    // Clear processed toolbars
    this.processedToolbars = new WeakSet<Element>();
    
    console.log('Smart Reply: Content script destroyed');
  }
}

// Initialize the content script
const smartReply = new SmartReplyContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  smartReply.destroy();
});