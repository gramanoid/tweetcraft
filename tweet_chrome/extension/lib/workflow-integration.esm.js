// TweetCraft AI - Workflow Management Integration
import { log } from './log.esm.js';
import { COMPOSE_SELECTORS, SelectorUtils } from './dom-selectors.esm.js';

export class WorkflowIntegration {
  constructor() {
    this.modal = null;
    this.isInitialized = false;
    this.pasteHandler = null;
    this.workflowData = {
      bulkQueue: [],
      recipes: {},
      abTests: {},
      automation: {},
      apiHealth: {},
      pasteRules: {}
    };
  }

  async initialize() {
    try {
      log('WorkflowIntegration: Initializing workflow management system...');
      
      // Load workflow data from storage
      await this.loadWorkflowData();
      
      // Initialize smart paste handler
      this.initializePasteHandler();
      
      // Register keyboard shortcuts
      this.registerKeyboardShortcuts();
      
      // Initialize workflow button injection
      this.initializeWorkflowButton();
      
      // Set up message listeners for background communication
      this.setupMessageListeners();
      
      this.isInitialized = true;
      log('WorkflowIntegration: Initialization complete');
      
    } catch (error) {
      log('WorkflowIntegration: Initialization failed:', error);
      throw error;
    }
  }

  async loadWorkflowData() {
    try {
      const result = await chrome.storage.local.get(['workflowData']);
      if (result.workflowData) {
        this.workflowData = { ...this.workflowData, ...result.workflowData };
      }
    } catch (error) {
      log('WorkflowIntegration: Failed to load workflow data:', error);
    }
  }

  async saveWorkflowData() {
    try {
      await chrome.storage.local.set({ workflowData: this.workflowData });
    } catch (error) {
      log('WorkflowIntegration: Failed to save workflow data:', error);
    }
  }

  initializePasteHandler() {
    // Smart paste handler for content processing
    this.pasteHandler = (event) => {
      const target = event.target;
      
      // Only handle paste in compose areas
      if (!this.isComposeArea(target)) return;
      
      // Get clipboard data
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      const pastedText = clipboardData.getData('text');
      if (!pastedText || pastedText.length < 50) return; // Only process substantial content
      
      // Prevent default paste and handle intelligently
      event.preventDefault();
      this.handleSmartPaste(target, pastedText);
    };

    document.addEventListener('paste', this.pasteHandler, true);
  }

  isComposeArea(element) {
    if (!element) return false;
    
    // Check for Twitter compose areas using centralized selectors
    return SelectorUtils.getWorkingSelector(COMPOSE_SELECTORS.COMPOSE_TEXTAREA) && 
           (element.matches && element.matches(SelectorUtils.getWorkingSelector(COMPOSE_SELECTORS.COMPOSE_TEXTAREA)) ||
            element.closest && element.closest(SelectorUtils.getWorkingSelector(COMPOSE_SELECTORS.COMPOSE_TEXTAREA)));
  }

  async handleSmartPaste(target, content) {
    try {
      // Analyze content type
      const contentType = this.analyzeContentType(content);
      
      // Apply smart formatting based on type
      const formattedContent = await this.formatContent(content, contentType);
      
      // Show formatting options if content is complex
      if (this.shouldShowFormattingOptions(content, contentType)) {
        this.showPasteOptionsModal(target, content, formattedContent, contentType);
      } else {
        // Apply formatting directly
        this.insertFormattedContent(target, formattedContent);
      }
      
    } catch (error) {
      log('WorkflowIntegration: Smart paste failed:', error);
      // Fallback to regular paste
      this.insertFormattedContent(target, content);
    }
  }

  analyzeContentType(content) {
    const lines = content.split('\n');
    const wordCount = content.split(/\s+/).length;
    
    // URL detection
    if (content.match(/https?:\/\/[^\s]+/)) {
      return 'url';
    }
    
    // Code detection
    if (content.includes('function') || content.includes('class') || 
        content.includes('import') || content.includes('const ') ||
        content.match(/[{}();]/g)?.length > 5) {
      return 'code';
    }
    
    // List detection
    if (lines.length > 3 && lines.filter(line => 
      line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)
    ).length > lines.length * 0.5) {
      return 'list';
    }
    
    // Quote detection
    if (content.startsWith('"') && content.endsWith('"') ||
        content.includes('said') || content.includes('according to')) {
      return 'quote';
    }
    
    // Long article detection
    if (wordCount > 100 && lines.length > 5) {
      return 'article';
    }
    
    // Thread detection
    if (wordCount > 280 || lines.length > 3) {
      return 'thread';
    }
    
    return 'text';
  }

  async formatContent(content, type) {
    switch (type) {
      case 'url':
        return await this.formatURL(content);
      case 'code':
        return this.formatCode(content);
      case 'list':
        return this.formatList(content);
      case 'quote':
        return this.formatQuote(content);
      case 'article':
        return await this.formatArticle(content);
      case 'thread':
        return this.formatThread(content);
      default:
        return this.formatText(content);
    }
  }

  async formatURL(content) {
    try {
      // Extract URL and surrounding text
      const urlMatch = content.match(/(.*?)(https?:\/\/[^\s]+)(.*)/);
      if (!urlMatch) return content;
      
      const [, before, url, after] = urlMatch;
      
      // Get URL summary via background script
      const summary = await this.getURLSummary(url);
      
      if (summary) {
        return `${before.trim()}\n\n${summary.title}\n${url}\n\n${summary.description}${after ? '\n\n' + after.trim() : ''}`.trim();
      }
      
      return content;
    } catch (error) {
      return content;
    }
  }

  formatCode(content) {
    // Detect language and add syntax highlighting hints
    const language = this.detectCodeLanguage(content);
    return `💻 Code snippet${language ? ` (${language})` : ''}:\n\n\`\`\`\n${content}\n\`\`\``;
  }

  formatList(content) {
    const lines = content.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Convert to bullet points if not already
      if (!trimmed.match(/^[-*•]\s/) && !trimmed.match(/^\d+\.\s/)) {
        return `• ${trimmed}`;
      }
      return trimmed;
    });
    
    return formattedLines.join('\n');
  }

  formatQuote(content) {
    // Clean up quote formatting
    const cleaned = content.replace(/^["']|["']$/g, '');
    return `"${cleaned}"\n\n💭 Thoughts?`;
  }

  async formatArticle(content) {
    // Summarize long content for Twitter
    const summary = await this.summarizeContent(content);
    return `📖 Key insights:\n\n${summary}\n\n🧵 Thread below 👇`;
  }

  formatThread(content) {
    // Split into tweet-sized chunks
    const chunks = this.splitIntoTweets(content);
    if (chunks.length === 1) return content;
    
    return chunks.map((chunk, index) => 
      `${index + 1}/${chunks.length} ${chunk}`
    ).join('\n\n---\n\n');
  }

  formatText(content) {
    // Basic text cleanup
    return content.trim().replace(/\n{3,}/g, '\n\n');
  }

  detectCodeLanguage(content) {
    const patterns = {
      javascript: /\b(function|const|let|var|=>|import|export)\b/,
      python: /\b(def|import|from|class|if __name__)\b/,
      java: /\b(public|private|class|import|package)\b/,
      css: /\{[^}]*:[^}]*\}/,
      html: /<[^>]+>/,
      sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE)\b/i
    };
    
    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) return lang;
    }
    
    return null;
  }

  splitIntoTweets(content, maxLength = 250) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      
      if (currentChunk.length + trimmed.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk + '.');
        currentChunk = trimmed;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk + '.');
    return chunks;
  }

  shouldShowFormattingOptions(content, type) {
    // Show options for complex content types
    return ['article', 'thread', 'code', 'url'].includes(type) || 
           content.length > 500;
  }

  showPasteOptionsModal(target, originalContent, formattedContent, contentType) {
    // Create simple options modal
    const modal = document.createElement('div');
    modal.className = 'tweetcraft-paste-options';
    modal.innerHTML = `
      <div class="paste-options-content">
        <h3>Smart Paste Options</h3>
        <p>Detected: <strong>${contentType}</strong></p>
        <div class="paste-buttons">
          <button class="paste-formatted">Use Formatted</button>
          <button class="paste-original">Use Original</button>
          <button class="paste-cancel">Cancel</button>
        </div>
      </div>
    `;
    
    // Style the modal
    Object.assign(modal.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--tc-color-bg-primary)',
      border: '1px solid var(--tc-color-border-light)',
      borderRadius: '8px',
      padding: '20px',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });
    
    document.body.appendChild(modal);
    
    // Handle button clicks
    modal.querySelector('.paste-formatted').onclick = () => {
      this.insertFormattedContent(target, formattedContent);
      modal.remove();
    };
    
    modal.querySelector('.paste-original').onclick = () => {
      this.insertFormattedContent(target, originalContent);
      modal.remove();
    };
    
    modal.querySelector('.paste-cancel').onclick = () => {
      modal.remove();
    };
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (modal.parentNode) modal.remove();
    }, 10000);
  }

  insertFormattedContent(target, content) {
    if (target.contentEditable === 'true') {
      // For contenteditable elements
      target.focus();
      document.execCommand('insertText', false, content);
    } else {
      // For textarea elements
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const before = target.value.substring(0, start);
      const after = target.value.substring(end);
      
      target.value = before + content + after;
      target.selectionStart = target.selectionEnd = start + content.length;
      
      // Trigger input event
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  registerKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+W - Open Workflow Modal
      if (event.ctrlKey && event.shiftKey && event.key === 'W') {
        event.preventDefault();
        this.showWorkflowModal();
      }
      
      // Ctrl+Alt+B - Quick Bulk Process
      if (event.ctrlKey && event.altKey && event.key === 'B') {
        event.preventDefault();
        this.showQuickBulkProcess();
      }
    });
  }

  initializeWorkflowButton() {
    // Add workflow button to compose areas
    const observer = new MutationObserver(() => {
      this.injectWorkflowButtons();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Initial injection
    setTimeout(() => this.injectWorkflowButtons(), 1000);
  }

  injectWorkflowButtons() {
    // Find compose toolbars
    const toolbars = document.querySelectorAll('[data-testid="toolBar"]');
    
    toolbars.forEach(toolbar => {
      if (toolbar.querySelector('.tweetcraft-workflow-btn')) return;
      
      const workflowBtn = document.createElement('button');
      workflowBtn.className = 'tweetcraft-workflow-btn';
      workflowBtn.innerHTML = '⚡';
      workflowBtn.title = 'Workflow Management (Ctrl+Shift+W)';
      workflowBtn.onclick = () => this.showWorkflowModal();
      
      // Style the button
      Object.assign(workflowBtn.style, {
        background: 'transparent',
        border: 'none',
        color: 'var(--tc-color-primary)',
        fontSize: '18px',
        padding: '8px',
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'background 0.2s'
      });
      
      workflowBtn.onmouseover = () => {
        workflowBtn.style.background = 'var(--tc-color-bg-hover)';
      };
      
      workflowBtn.onmouseout = () => {
        workflowBtn.style.background = 'transparent';
      };
      
      toolbar.appendChild(workflowBtn);
    });
  }

  async showWorkflowModal() {
    try {
      if (this.modal) {
        this.modal.remove();
      }
      
      // Dynamically import and render the modal
      const { render, h } = await import('preact');
      const { WorkflowModal } = await import('../components/WorkflowModal.jsx');
      
      const modalContainer = document.createElement('div');
      modalContainer.id = 'tweetcraft-workflow-modal';
      document.body.appendChild(modalContainer);
      
      render(h(WorkflowModal, {
        isOpen: true,
        onClose: () => {
          modalContainer.remove();
          this.modal = null;
        }
      }), modalContainer);
      
      this.modal = modalContainer;
      
    } catch (error) {
      log('WorkflowIntegration: Failed to show workflow modal:', error);
    }
  }

  showQuickBulkProcess() {
    // Quick bulk process for selected text or clipboard
    const selection = window.getSelection().toString();
    if (selection) {
      this.processBulkContent(selection);
    } else {
      // Try to read from clipboard
      navigator.clipboard.readText().then(text => {
        if (text) this.processBulkContent(text);
      }).catch(() => {
        this.showToast('No content selected or clipboard access denied', 'warning');
      });
    }
  }

  async processBulkContent(content) {
    const items = content.split('\n').filter(line => line.trim());
    if (items.length === 0) return;
    
    // Add to bulk queue
    const newItems = items.map((item, index) => ({
      id: Date.now() + index,
      content: item.trim(),
      status: 'pending',
      timestamp: Date.now()
    }));
    
    this.workflowData.bulkQueue.push(...newItems);
    await this.saveWorkflowData();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'PROCESS_BULK_QUEUE',
      queue: newItems
    });
    
    this.showToast(`Added ${items.length} items to bulk processing queue`, 'success');
  }

  setupMessageListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'BULK_ITEM_PROCESSED':
          this.handleBulkItemProcessed(message.data);
          break;
        case 'AB_TEST_UPDATED':
          this.handleABTestUpdated(message.data);
          break;
        case 'WORKFLOW_DATA_UPDATED':
          this.handleWorkflowDataUpdated(message.data);
          break;
      }
    });
  }

  handleBulkItemProcessed(data) {
    // Update queue item status
    const item = this.workflowData.bulkQueue.find(i => i.id === data.id);
    if (item) {
      item.status = data.status;
      item.result = data.result;
      this.saveWorkflowData();
    }
  }

  handleABTestUpdated(data) {
    // Update A/B test data
    if (this.workflowData.abTests[data.testId]) {
      this.workflowData.abTests[data.testId] = { ...this.workflowData.abTests[data.testId], ...data };
      this.saveWorkflowData();
    }
  }

  handleWorkflowDataUpdated(data) {
    // Sync workflow data from background
    this.workflowData = { ...this.workflowData, ...data };
    this.saveWorkflowData();
  }

  async getURLSummary(url) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_URL_SUMMARY',
        url: url
      });
      return response.summary;
    } catch (error) {
      return null;
    }
  }

  async summarizeContent(content) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SUMMARIZE_CONTENT',
        content: content
      });
      return response.summary || content.substring(0, 200) + '...';
    } catch (error) {
      return content.substring(0, 200) + '...';
    }
  }

  showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `tweetcraft-toast toast-${type}`;
    toast.textContent = message;
    
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      zIndex: '10001',
      fontSize: '14px',
      fontWeight: '500'
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Public API methods
  getSystemStats() {
    return {
      queueLength: this.workflowData.bulkQueue.length,
      recipeCount: Object.keys(this.workflowData.recipes).length,
      activeTests: Object.keys(this.workflowData.abTests).length,
      isInitialized: this.isInitialized
    };
  }

  destroy() {
    if (this.pasteHandler) {
      document.removeEventListener('paste', this.pasteHandler, true);
    }
    
    if (this.modal) {
      this.modal.remove();
    }
    
    // Remove injected buttons
    document.querySelectorAll('.tweetcraft-workflow-btn').forEach(btn => btn.remove());
    
    this.isInitialized = false;
  }
}
