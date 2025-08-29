# TweetCraft Feature Implementation TODO

This document contains detailed implementation specifications for features identified through competitive analysis of 13+ Twitter/X Chrome extensions. Features are organized by priority and implementation complexity.

## 🚨 Phase 1: Critical Missing Features (Week 1-2)

### 1. ✅ Keyboard Shortcuts System
**Status:** COMPLETED (v1.4.3)  
**Priority:** CRITICAL  
**Reference:** XReplyGPT  
**Effort:** Low (2-3 days)

**Implemented Features:**
- ✅ Alt+Q: Generate AI reply using default tone from settings
- ✅ Default tone selector in popup for keyboard shortcuts
- ✅ Proper integration with Twitter's contentEditable elements with execCommand
- ✅ Fallback generation without toolbar when needed
- ✅ Retry logic with 15 attempts for toolbar detection
- ✅ Removed non-working Alt+Shift+Q shortcut
- ✅ Console logging with numbered categories (1., 2., 3.) and sub-items (a., b., c.)

#### Implementation Details:
```javascript
// Add to manifest.json
"commands": {
  "generate_reply": {
    "suggested_key": {
      "default": "Ctrl+Shift+L",
      "mac": "Command+Shift+L"
    },
    "description": "Generate AI reply for current tweet"
  },
  "next_suggestion": {
    "suggested_key": {
      "default": "Ctrl+Shift+E",
      "mac": "Command+Shift+E"
    },
    "description": "Navigate to next reply suggestion"
  },
  "previous_suggestion": {
    "suggested_key": {
      "default": "Ctrl+Shift+S",
      "mac": "Command+Shift+S"
    },
    "description": "Navigate to previous reply suggestion"
  },
  "regenerate_reply": {
    "suggested_key": {
      "default": "Ctrl+Shift+R",
      "mac": "Command+Shift+R"
    },
    "description": "Regenerate current reply"
  }
}
```

#### Service Worker Handler:
```javascript
// In serviceWorker.ts
chrome.commands.onCommand.addListener((command) => {
  switch(command) {
    case 'generate_reply':
      // Send message to content script to trigger generation
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'generateReply'});
      });
      break;
    case 'next_suggestion':
      // Navigate to next suggestion
      chrome.tabs.sendMessage(tabs[0].id, {action: 'nextSuggestion'});
      break;
    // ... other commands
  }
});
```

#### Content Script Implementation:
- Listen for keyboard command messages
- Find active tweet/reply box
- Trigger appropriate action
- Show visual feedback (highlight, animation)
- Update focus appropriately

### 2. ✅ Multiple Reply Suggestions Display
**Status:** COMPLETED (v1.5.0)  
**Priority:** CRITICAL  
**Reference:** XReplyGPT, twitter-ai-reply  
**Effort:** Medium (3-4 days)

**Implemented Features:**
- ✅ Generate 3 suggestions in parallel with different temperatures
- ✅ Carousel UI with navigation (arrows, dots, keyboard)
- ✅ Individual regeneration for each suggestion
- ✅ Edit suggestions inline
- ✅ Copy to clipboard functionality
- ✅ "3 Suggestions" modifier in tone selector to trigger carousel mode

#### UI Design:
```html
<!-- New suggestion container structure -->
<div class="tweetcraft-suggestions-container">
  <div class="suggestions-header">
    <span class="suggestion-count">1 of 3</span>
    <button class="regenerate-all">Regenerate All</button>
  </div>
  
  <div class="suggestions-carousel">
    <button class="nav-prev" aria-label="Previous suggestion">‹</button>
    
    <div class="suggestion-item active" data-index="0">
      <div class="suggestion-text">First reply suggestion...</div>
      <div class="suggestion-actions">
        <button class="use-suggestion">Use</button>
        <button class="regenerate-single">🔄</button>
        <button class="edit-suggestion">✏️</button>
      </div>
    </div>
    
    <div class="suggestion-item" data-index="1">
      <div class="suggestion-text">Second reply suggestion...</div>
      <!-- ... actions ... -->
    </div>
    
    <div class="suggestion-item" data-index="2">
      <div class="suggestion-text">Third reply suggestion...</div>
      <!-- ... actions ... -->
    </div>
    
    <button class="nav-next" aria-label="Next suggestion">›</button>
  </div>
  
  <div class="suggestions-dots">
    <span class="dot active" data-index="0"></span>
    <span class="dot" data-index="1"></span>
    <span class="dot" data-index="2"></span>
  </div>
</div>
```

#### Backend Logic:
```javascript
// Generate multiple suggestions in parallel
async function generateMultipleSuggestions(context, tone, count = 3) {
  const promises = Array(count).fill(null).map((_, index) => 
    generateSingleReply(context, tone, {
      temperature: 0.7 + (index * 0.1), // Vary temperature for diversity
      seed: index // Different seed for variation
    })
  );
  
  const suggestions = await Promise.all(promises);
  return suggestions.filter(s => s && s.length > 0);
}
```

#### State Management:
```javascript
class SuggestionManager {
  constructor() {
    this.suggestions = [];
    this.currentIndex = 0;
    this.maxSuggestions = 3;
  }
  
  async generateAll(context, tone) {
    this.suggestions = await generateMultipleSuggestions(context, tone, this.maxSuggestions);
    this.currentIndex = 0;
    this.render();
  }
  
  async regenerateSingle(index) {
    const newSuggestion = await generateSingleReply(context, tone, {
      temperature: 0.8,
      avoidDuplicates: this.suggestions
    });
    this.suggestions[index] = newSuggestion;
    this.render();
  }
  
  navigateNext() {
    this.currentIndex = (this.currentIndex + 1) % this.suggestions.length;
    this.render();
  }
  
  navigatePrevious() {
    this.currentIndex = (this.currentIndex - 1 + this.suggestions.length) % this.suggestions.length;
    this.render();
  }
}
```

### 3. ✅ Visual Emoji Tone Selection
**Status:** COMPLETED (v1.5.0)  
**Priority:** HIGH  
**Reference:** twitter-gpt-3-extension  
**Effort:** Low (1-2 days)

**Implemented Features:**
- ✅ Emoji icons displayed in popup dropdown (💼 😊 😄 🤗 🤔)
- ✅ Default tone selector works with keyboard shortcuts
- ✅ Grid-based emoji tone selector in content script (3x2 grid)
- ✅ Quick mood modifiers UI (3 Suggestions, Add Question, More Emojis, Shorter, Longer)
- ✅ Visual feedback with hover and active states
- ✅ Custom tone option with textarea for user prompts

#### UI Implementation:
```html
<!-- Replace dropdown with emoji button grid -->
<div class="tweetcraft-tone-selector">
  <div class="tone-grid">
    <button class="tone-btn" data-tone="professional" title="Professional">
      <span class="emoji">💼</span>
      <span class="label">Pro</span>
    </button>
    <button class="tone-btn" data-tone="casual" title="Casual">
      <span class="emoji">😊</span>
      <span class="label">Casual</span>
    </button>
    <button class="tone-btn" data-tone="witty" title="Witty">
      <span class="emoji">😄</span>
      <span class="label">Witty</span>
    </button>
    <button class="tone-btn" data-tone="supportive" title="Supportive">
      <span class="emoji">🤗</span>
      <span class="label">Support</span>
    </button>
    <button class="tone-btn" data-tone="contrarian" title="Contrarian">
      <span class="emoji">🤔</span>
      <span class="label">Counter</span>
    </button>
    <button class="tone-btn custom" data-tone="custom" title="Custom Tone">
      <span class="emoji">✨</span>
      <span class="label">Custom</span>
    </button>
  </div>
  
  <!-- Quick mood modifiers -->
  <div class="mood-modifiers">
    <button class="mood-mod" data-modifier="add-question">❓ Add Question</button>
    <button class="mood-mod" data-modifier="add-emoji">😀 More Emojis</button>
    <button class="mood-mod" data-modifier="shorter">✂️ Shorter</button>
    <button class="mood-mod" data-modifier="longer">📝 Longer</button>
  </div>
</div>
```

#### CSS Styling:
```scss
.tone-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  
  .tone-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border: 2px solid transparent;
    border-radius: 12px;
    background: rgba(29, 155, 240, 0.1);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(29, 155, 240, 0.2);
      transform: scale(1.05);
    }
    
    &.active {
      border-color: rgb(29, 155, 240);
      background: rgba(29, 155, 240, 0.3);
    }
    
    .emoji {
      font-size: 24px;
      margin-bottom: 4px;
    }
    
    .label {
      font-size: 11px;
      font-weight: 500;
    }
  }
}
```

### 4. ✅ Preset Reply Templates System
**Status:** COMPLETED (v1.5.0)  
**Priority:** HIGH  
**Reference:** XAI  
**Effort:** Medium (2-3 days)

**Implemented Features:**
- ✅ 12+ default preset templates across 4 categories
- ✅ Engagement: Ask Question, Agree & Expand, Challenge Politely
- ✅ Value: Add Value, Share Experience, Share Resource
- ✅ Conversation: Show Support, Congratulate, Empathize
- ✅ Humor: Add Humor, Witty Observation, Playful Tease
- ✅ Custom template creator with dialog UI
- ✅ Expandable UI with quick access bar
- ✅ Templates saved to Chrome storage
- ✅ Integration with tone selector

#### Preset Configuration:
```javascript
const DEFAULT_PRESETS = [
  {
    id: 'ask_question',
    name: 'Ask Question',
    emoji: '❓',
    prompt: 'Generate a thoughtful question about: {context}',
    description: 'Ask a relevant follow-up question'
  },
  {
    id: 'add_value',
    name: 'Add Value',
    emoji: '💡',
    prompt: 'Provide additional valuable insight or information related to: {context}',
    description: 'Share helpful information'
  },
  {
    id: 'share_experience',
    name: 'Share Experience',
    emoji: '📖',
    prompt: 'Share a relevant personal experience or story about: {context}',
    description: 'Add personal perspective'
  },
  {
    id: 'polite_challenge',
    name: 'Challenge Politely',
    emoji: '🤝',
    prompt: 'Respectfully present an alternative viewpoint on: {context}',
    description: 'Offer different perspective'
  },
  {
    id: 'agree_expand',
    name: 'Agree & Expand',
    emoji: '👍',
    prompt: 'Agree with the tweet and expand on the idea: {context}',
    description: 'Build on the idea'
  },
  {
    id: 'humor',
    name: 'Add Humor',
    emoji: '😂',
    prompt: 'Create a funny but respectful response to: {context}',
    description: 'Lighten the mood'
  }
];

// User custom presets stored in Chrome storage
const USER_PRESETS = {
  maxCustomPresets: 10,
  presets: []
};
```

#### UI Implementation:
```html
<div class="preset-container">
  <!-- Quick access presets bar -->
  <div class="preset-bar">
    <button class="preset-btn" data-preset="ask_question">
      <span>❓</span>
      <tooltip>Ask Question</tooltip>
    </button>
    <button class="preset-btn" data-preset="add_value">
      <span>💡</span>
      <tooltip>Add Value</tooltip>
    </button>
    <button class="preset-btn" data-preset="share_experience">
      <span>📖</span>
      <tooltip>Share Experience</tooltip>
    </button>
    <button class="preset-btn" data-preset="polite_challenge">
      <span>🤝</span>
      <tooltip>Challenge Politely</tooltip>
    </button>
    <button class="preset-btn more">
      <span>➕</span>
      <tooltip>More Presets</tooltip>
    </button>
  </div>
  
  <!-- Expanded preset panel -->
  <div class="preset-panel hidden">
    <div class="preset-section">
      <h3>Default Presets</h3>
      <div class="preset-grid">
        <!-- All default presets -->
      </div>
    </div>
    
    <div class="preset-section">
      <h3>My Custom Presets</h3>
      <div class="preset-grid">
        <!-- User custom presets -->
      </div>
      <button class="create-preset">+ Create New Preset</button>
    </div>
  </div>
</div>
```

#### Custom Preset Creator:
```javascript
class PresetCreator {
  constructor() {
    this.modal = null;
  }
  
  show() {
    this.modal = createModal({
      title: 'Create Custom Preset',
      content: `
        <div class="preset-creator">
          <input type="text" id="preset-name" placeholder="Preset Name" maxlength="20">
          <input type="text" id="preset-emoji" placeholder="Emoji (optional)" maxlength="2">
          <textarea id="preset-prompt" placeholder="Enter your prompt template. Use {context} for tweet content." rows="4"></textarea>
          <input type="text" id="preset-description" placeholder="Short description" maxlength="50">
          
          <div class="preset-variables">
            <p>Available variables:</p>
            <code>{context}</code> - Tweet content<br>
            <code>{author}</code> - Tweet author<br>
            <code>{thread}</code> - Thread context<br>
            <code>{time}</code> - Current time<br>
          </div>
        </div>
      `,
      buttons: [
        { text: 'Cancel', action: 'close' },
        { text: 'Save Preset', action: 'save', primary: true }
      ]
    });
  }
  
  async save(presetData) {
    const userPresets = await StorageService.getUserPresets();
    userPresets.push({
      id: `custom_${Date.now()}`,
      ...presetData,
      isCustom: true
    });
    await StorageService.saveUserPresets(userPresets);
  }
}
```

## 💡 Phase 2: Architecture Improvements (Week 3-4)

### 5. ✅ Memory Management System
**Status:** COMPLETED (v1.5.0)  
**Priority:** HIGH  
**Reference:** tweet_chrome  
**Effort:** Medium (3-4 days)

**Implemented Features:**
- ✅ Comprehensive MemoryManager class with singleton pattern
- ✅ Event listener tracking with unique IDs
- ✅ MutationObserver tracking and cleanup
- ✅ Timer and interval tracking with automatic cleanup
- ✅ AbortController tracking for fetch requests
- ✅ Custom cleanup callbacks registration
- ✅ Memory usage statistics reporting
- ✅ Auto-cleanup on page unload and navigation
- ✅ Development mode periodic stats logging
- ✅ Proper error handling during cleanup

#### Implementation:
```javascript
// memory-manager.ts
class MemoryManager {
  private listeners: Map<string, {element: Element, event: string, handler: Function}> = new Map();
  private observers: Set<MutationObserver> = new Set();
  private timers: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private abortControllers: Set<AbortController> = new Set();
  
  // Track event listeners
  addEventListener(element: Element, event: string, handler: Function, options?: any): string {
    const id = `${Date.now()}_${Math.random()}`;
    this.listeners.set(id, {element, event, handler});
    element.addEventListener(event, handler, options);
    return id;
  }
  
  removeEventListener(id: string): void {
    const listener = this.listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this.listeners.delete(id);
    }
  }
  
  // Track mutation observers
  createObserver(callback: MutationCallback, options: MutationObserverInit): MutationObserver {
    const observer = new MutationObserver(callback);
    this.observers.add(observer);
    return observer;
  }
  
  // Track timers
  setTimeout(callback: Function, delay: number): number {
    const id = window.setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    this.timers.add(id);
    return id;
  }
  
  setInterval(callback: Function, delay: number): number {
    const id = window.setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }
  
  // Track fetch requests
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }
  
  // Cleanup everything
  cleanup(): void {
    console.log('[MemoryManager] Starting cleanup...');
    
    // Remove all event listeners
    this.listeners.forEach(({element, event, handler}) => {
      element.removeEventListener(event, handler);
    });
    this.listeners.clear();
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear all timers
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();
    
    // Clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();
    
    // Abort all fetch requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    console.log('[MemoryManager] Cleanup complete');
  }
  
  // Get memory usage stats
  getStats(): MemoryStats {
    return {
      listeners: this.listeners.size,
      observers: this.observers.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
      abortControllers: this.abortControllers.size
    };
  }
}

// Global instance
export const memoryManager = new MemoryManager();

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => memoryManager.cleanup());
```

#### Integration with Content Script:
```javascript
// contentScript.ts
import { memoryManager } from './memory-manager';

class TweetCraftExtension {
  private observer: MutationObserver | null = null;
  
  init() {
    // Use memory manager for all listeners
    memoryManager.addEventListener(document, 'click', this.handleClick.bind(this));
    memoryManager.addEventListener(window, 'scroll', this.handleScroll.bind(this));
    
    // Create observer through memory manager
    this.observer = memoryManager.createObserver(
      this.handleMutations.bind(this),
      { childList: true, subtree: true }
    );
    
    // Start observing
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
  
  destroy() {
    memoryManager.cleanup();
  }
}
```

### 6. Enhanced Error Handling with Recovery
**Priority:** HIGH  
**Reference:** Multiple extensions  
**Effort:** Low (2 days)

#### Error Handler Implementation:
```javascript
// error-handler.ts
class ErrorHandler {
  private errors: ErrorLog[] = [];
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    console.error('[TweetCraft Error]', error, context);
    
    this.errors.push({
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      context
    });
    
    // Determine error type and recovery strategy
    const strategy = this.getRecoveryStrategy(error, context);
    
    if (strategy.recoverable) {
      await this.attemptRecovery(strategy, context);
    } else {
      this.showUserError(strategy.userMessage);
    }
  }
  
  private getRecoveryStrategy(error: Error, context: ErrorContext): RecoveryStrategy {
    // API errors
    if (error.message.includes('API')) {
      if (error.message.includes('rate limit')) {
        return {
          recoverable: true,
          action: 'retry',
          delay: 60000,
          userMessage: 'Rate limited. Waiting 1 minute...'
        };
      }
      if (error.message.includes('401')) {
        return {
          recoverable: false,
          action: 'reauth',
          userMessage: 'API key invalid. Please check your settings.'
        };
      }
    }
    
    // DOM errors
    if (error.message.includes('DOM') || error.message.includes('element not found')) {
      return {
        recoverable: true,
        action: 'reinject',
        userMessage: 'Twitter interface changed. Attempting to reconnect...'
      };
    }
    
    // Network errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        recoverable: true,
        action: 'retry',
        delay: 2000,
        userMessage: 'Network error. Retrying...'
      };
    }
    
    // Default
    return {
      recoverable: false,
      action: 'log',
      userMessage: 'An unexpected error occurred. Please refresh the page.'
    };
  }
  
  private async attemptRecovery(strategy: RecoveryStrategy, context: ErrorContext): Promise<void> {
    switch (strategy.action) {
      case 'retry':
        await this.retryWithBackoff(context);
        break;
      case 'reinject':
        await this.reinjectUI();
        break;
      case 'reauth':
        this.openSettings();
        break;
    }
  }
  
  private async retryWithBackoff(context: ErrorContext): Promise<void> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.retryDelays[i]));
        // Retry the original action
        await context.retryAction();
        return; // Success
      } catch (error) {
        if (i === this.maxRetries - 1) {
          throw error; // Final failure
        }
      }
    }
  }
}
```

## 🎯 Phase 3: Advanced Features (Month 2+)

### 7. Backend Service Architecture
**Status:** PENDING  
**Priority:** MEDIUM  
**Reference:** XAI backend  
**Effort:** High (1-2 weeks)

#### Backend Structure:
```
tweetcraft-backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── generate.ts
│   │   │   ├── analyze.ts
│   │   │   ├── research.ts
│   │   │   └── user.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rateLimit.ts
│   │       └── cache.ts
│   ├── services/
│   │   ├── openrouter.ts
│   │   ├── grok.ts
│   │   ├── imageAnalysis.ts
│   │   ├── research.ts
│   │   └── cache.ts
│   ├── models/
│   │   ├── user.ts
│   │   ├── reply.ts
│   │   └── analytics.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

#### API Endpoints:
```typescript
// Backend API design
const API_ENDPOINTS = {
  // Core functionality
  '/api/generate-reply': {
    method: 'POST',
    body: {
      context: string,
      tone: string,
      thread?: string[],
      count?: number,
      userId?: string
    },
    response: {
      suggestions: string[],
      metadata: {
        model: string,
        tokensUsed: number,
        latency: number
      }
    }
  },
  
  // Advanced features
  '/api/analyze-image': {
    method: 'POST',
    body: {
      imageUrl: string,
      context?: string
    },
    response: {
      description: string,
      entities: string[],
      sentiment: string
    }
  },
  
  '/api/research': {
    method: 'POST',
    body: {
      query: string,
      sources: ['grok', 'exa', 'perplexity']
    },
    response: {
      summary: string,
      sources: Array<{
        provider: string,
        content: string,
        confidence: number
      }>
    }
  },
  
  // User management
  '/api/user/presets': {
    method: 'GET/POST/PUT/DELETE',
    auth: true
  },
  
  '/api/user/analytics': {
    method: 'GET',
    auth: true,
    response: {
      totalReplies: number,
      avgEngagement: number,
      topTones: string[],
      usage: Array<{date: string, count: number}>
    }
  }
};
```

#### Extension-Backend Communication:
```javascript
// services/backend.ts
class BackendService {
  private baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  private apiKey: string;
  
  async generateReply(params: GenerateParams): Promise<ReplyResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // WebSocket for real-time features
  connectWebSocket(): WebSocket {
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeUpdate(data);
    };
    
    return ws;
  }
}
```

### 8. Image Context Analysis
**Priority:** MEDIUM  
**Reference:** x-post (Grok Vision)  
**Effort:** Medium (3-4 days)

#### Implementation:
```javascript
// services/imageAnalysis.ts
class ImageAnalysisService {
  async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    // Extract image from tweet
    const imageData = await this.fetchImage(imageUrl);
    
    // Use vision model (Grok Vision, GPT-4V, Claude Vision)
    const analysis = await this.callVisionAPI(imageData);
    
    return {
      description: analysis.description,
      objects: analysis.objects,
      text: analysis.extractedText,
      sentiment: analysis.sentiment,
      context: this.generateContextFromAnalysis(analysis)
    };
  }
  
  private async callVisionAPI(imageData: Blob): Promise<any> {
    const formData = new FormData();
    formData.append('image', imageData);
    formData.append('model', 'grok-vision-beta');
    
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
  
  private generateContextFromAnalysis(analysis: any): string {
    return `The image shows ${analysis.description}. 
            Key elements: ${analysis.objects.join(', ')}.
            ${analysis.extractedText ? `Text in image: "${analysis.extractedText}"` : ''}`;
  }
}

// Integration with reply generation
class EnhancedReplyGenerator {
  async generateWithImageContext(tweet: Tweet): Promise<string> {
    let context = tweet.text;
    
    // Check for images
    if (tweet.hasImages) {
      const imageAnalysis = await imageAnalysisService.analyzeImage(tweet.imageUrls[0]);
      context += `\n\nImage context: ${imageAnalysis.context}`;
    }
    
    return this.generateReply(context);
  }
}
```

### 9. Research Integration System
**Priority:** LOW  
**Reference:** tweet_chrome (Grok → Exa → Perplexity)  
**Effort:** High (1 week)

#### Multi-Provider Research:
```javascript
// services/research.ts
class ResearchService {
  private providers = {
    grok: new GrokProvider(),
    exa: new ExaProvider(),
    perplexity: new PerplexityProvider()
  };
  
  async enhanceReplyWithResearch(context: string): Promise<EnhancedReply> {
    // Step 1: Initial analysis with Grok
    const grokAnalysis = await this.providers.grok.analyze(context);
    
    // Step 2: Search for relevant information with Exa
    const exaResults = await this.providers.exa.search({
      query: grokAnalysis.keywords,
      filters: {
        recency: '1week',
        domain: grokAnalysis.suggestedDomains
      }
    });
    
    // Step 3: Deep dive with Perplexity
    const perplexityInsights = await this.providers.perplexity.query({
      question: grokAnalysis.researchQuestion,
      sources: exaResults.topSources
    });
    
    // Step 4: Synthesize all research
    return this.synthesizeResearch({
      context,
      grok: grokAnalysis,
      exa: exaResults,
      perplexity: perplexityInsights
    });
  }
  
  private synthesizeResearch(data: ResearchData): EnhancedReply {
    return {
      reply: this.generateInformedReply(data),
      sources: this.extractSources(data),
      confidence: this.calculateConfidence(data),
      facts: this.extractKeyFacts(data)
    };
  }
}
```

### 10. Testing Infrastructure
**Priority:** HIGH  
**Reference:** tweet_chrome, twitter_chrome_extension  
**Effort:** High (1 week)

#### Jest Unit Tests:
```javascript
// tests/unit/services/openRouter.test.ts
describe('OpenRouterService', () => {
  let service: OpenRouterService;
  
  beforeEach(() => {
    service = new OpenRouterService();
    jest.clearAllMocks();
  });
  
  describe('generateReply', () => {
    it('should generate reply with correct parameters', async () => {
      const mockResponse = { reply: 'Test reply' };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      const result = await service.generateReply('context', 'casual');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
      expect(result).toBe('Test reply');
    });
    
    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(service.generateReply('context', 'casual'))
        .rejects.toThrow('API Error');
    });
  });
});
```

#### Playwright E2E Tests:
```javascript
// tests/e2e/reply-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Reply Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Load extension
    await page.goto('chrome://extensions/');
    // ... load extension logic
    
    // Navigate to Twitter
    await page.goto('https://twitter.com');
    await page.waitForSelector('[data-testid="tweet"]');
  });
  
  test('should generate reply when clicking AI button', async ({ page }) => {
    // Find a tweet and click reply
    const tweet = page.locator('[data-testid="tweet"]').first();
    await tweet.locator('[data-testid="reply"]').click();
    
    // Wait for TweetCraft button
    await page.waitForSelector('.tweetcraft-ai-button');
    await page.click('.tweetcraft-ai-button');
    
    // Select tone
    await page.click('[data-tone="casual"]');
    
    // Verify reply is generated
    await expect(page.locator('.tweetcraft-suggestion')).toBeVisible();
    await expect(page.locator('.tweetcraft-suggestion')).toContainText(/./);
  });
  
  test('should handle multiple suggestions', async ({ page }) => {
    // ... setup
    
    // Generate replies
    await page.click('.tweetcraft-ai-button');
    
    // Check multiple suggestions exist
    const suggestions = page.locator('.suggestion-item');
    await expect(suggestions).toHaveCount(3);
    
    // Navigate between suggestions
    await page.click('.nav-next');
    await expect(page.locator('.suggestion-item.active')).toHaveAttribute('data-index', '1');
  });
});
```

#### Memory Leak Detection:
```javascript
// tests/memory/leak-detector.ts
class MemoryLeakDetector {
  private initialHeap: number;
  private measurements: number[] = [];
  
  async detectLeaks(action: () => Promise<void>, iterations = 10): Promise<LeakReport> {
    // Force garbage collection
    if (global.gc) global.gc();
    
    // Get initial heap size
    this.initialHeap = process.memoryUsage().heapUsed;
    
    // Run action multiple times
    for (let i = 0; i < iterations; i++) {
      await action();
      
      // Force GC and measure
      if (global.gc) global.gc();
      this.measurements.push(process.memoryUsage().heapUsed);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.analyzeResults();
  }
  
  private analyzeResults(): LeakReport {
    const trend = this.calculateTrend(this.measurements);
    const leaked = this.measurements[this.measurements.length - 1] - this.initialHeap;
    
    return {
      hasLeak: trend > 0.8 && leaked > 1000000, // 1MB threshold
      leakedBytes: leaked,
      trend,
      measurements: this.measurements
    };
  }
}
```

### 11. Analytics Dashboard
**Priority:** LOW  
**Reference:** twitter_bookmark_manager  
**Effort:** High (1 week)

#### Analytics Tracking:
```javascript
// services/analytics.ts
class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  
  track(event: string, properties?: any): void {
    this.events.push({
      timestamp: Date.now(),
      event,
      properties,
      session: this.sessionId,
      user: this.userId
    });
    
    // Batch send to backend
    this.batchSend();
  }
  
  // Track specific actions
  trackReplyGenerated(tone: string, context: string): void {
    this.track('reply_generated', {
      tone,
      contextLength: context.length,
      hasThread: context.includes('thread'),
      model: this.currentModel
    });
  }
  
  trackReplyPosted(reply: string, engagementPrediction?: number): void {
    this.track('reply_posted', {
      length: reply.length,
      tone: this.detectTone(reply),
      engagementPrediction
    });
  }
  
  // Get analytics summary
  async getSummary(): Promise<AnalyticsSummary> {
    const response = await fetch('/api/user/analytics');
    return response.json();
  }
}
```

#### Dashboard UI:
```html
<!-- popup-analytics.html -->
<div class="analytics-dashboard">
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">1,234</div>
      <div class="stat-label">Total Replies</div>
      <div class="stat-change">+12% this week</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">3.2x</div>
      <div class="stat-label">Avg Engagement</div>
      <div class="stat-change">↑ vs baseline</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-value">Witty</div>
      <div class="stat-label">Top Tone</div>
      <div class="stat-change">42% of replies</div>
    </div>
  </div>
  
  <div class="chart-container">
    <canvas id="usage-chart"></canvas>
  </div>
  
  <div class="tone-breakdown">
    <h3>Tone Usage</h3>
    <div class="tone-bars">
      <div class="tone-bar" style="--width: 42%">
        <span>Witty</span>
        <span>42%</span>
      </div>
      <div class="tone-bar" style="--width: 28%">
        <span>Professional</span>
        <span>28%</span>
      </div>
      <!-- ... other tones -->
    </div>
  </div>
</div>
```

### 12. Scheduling & Automation
**Priority:** LOW  
**Reference:** twitter_automation  
**Effort:** Very High (2+ weeks)

#### Scheduling System:
```javascript
// services/scheduler.ts
class ReplyScheduler {
  private queue: ScheduledReply[] = [];
  private worker: Worker;
  
  constructor() {
    // Use Web Worker for background processing
    this.worker = new Worker('scheduler-worker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }
  
  scheduleReply(reply: ScheduledReply): void {
    this.queue.push(reply);
    this.worker.postMessage({ action: 'schedule', reply });
  }
  
  // Scheduling strategies
  getOptimalPostTime(context: TweetContext): Date {
    // Analyze best times based on:
    // - Target audience timezone
    // - Historical engagement data
    // - Tweet author's activity patterns
    
    const audienceTimezone = this.detectTimezone(context);
    const peakHours = this.getPeakEngagementHours(audienceTimezone);
    
    return this.findNextSlot(peakHours);
  }
  
  // Auto-reply rules
  setupAutoReply(rules: AutoReplyRule[]): void {
    rules.forEach(rule => {
      this.worker.postMessage({ action: 'add_rule', rule });
    });
  }
}

interface AutoReplyRule {
  trigger: {
    keywords?: string[];
    authors?: string[];
    minFollowers?: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  action: {
    tone: string;
    preset?: string;
    delay?: number; // Minutes before replying
    probability?: number; // 0-1, chance of replying
  };
}
```

## 🔧 Technical Debt & Improvements

### 13. DOM Reliability Improvements
**Priority:** HIGH  
**Reference:** Multiple extensions  
**Effort:** Medium (3-4 days)

#### Robust Selector System:
```javascript
// utils/domSelectors.ts
class DOMSelectors {
  // Multiple fallback selectors for each element
  private selectors = {
    replyButton: [
      '[data-testid="reply"]',
      '[aria-label*="Reply"]',
      'div[role="button"] svg path[d*="M1.751"]', // Reply icon path
      '.css-175oi2r.r-18u37iz button'
    ],
    
    tweetText: [
      '[data-testid="tweetText"]',
      '[lang] > span',
      'div[dir="auto"] > span',
      '.css-1qaijid.r-bcqeeo'
    ],
    
    replyBox: [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea_1"]',
      'div[contenteditable="true"][role="textbox"]',
      '.DraftEditor-root'
    ]
  };
  
  // Intelligent selector with fallbacks
  find(elementType: string, context: Element = document): Element | null {
    const selectors = this.selectors[elementType];
    
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element && this.validate(element, elementType)) {
          return element;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    
    // Try XPath as last resort
    return this.findByXPath(elementType, context);
  }
  
  // Validate found element
  private validate(element: Element, type: string): boolean {
    switch(type) {
      case 'replyButton':
        return element.querySelector('svg') !== null;
      case 'tweetText':
        return element.textContent?.length > 0;
      case 'replyBox':
        return element.getAttribute('contenteditable') === 'true';
      default:
        return true;
    }
  }
}
```

### 14. Performance Monitoring
**Priority:** MEDIUM  
**Reference:** twitter_chrome_extension  
**Effort:** Low (2 days)

#### Performance Tracker:
```javascript
// utils/performance.ts
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  
  startTimer(name: string): void {
    this.metrics.set(name, {
      start: performance.now(),
      name
    });
  }
  
  endTimer(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) return 0;
    
    metric.end = performance.now();
    metric.duration = metric.end - metric.start;
    
    // Log if slow
    if (metric.duration > 1000) {
      console.warn(`[Performance] ${name} took ${metric.duration}ms`);
    }
    
    return metric.duration;
  }
  
  // Track specific operations
  async trackAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await operation();
      return result;
    } finally {
      this.endTimer(name);
    }
  }
  
  // Get performance report
  getReport(): PerformanceReport {
    const metrics = Array.from(this.metrics.values());
    
    return {
      totalOperations: metrics.length,
      averageDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
      slowestOperation: metrics.sort((a, b) => (b.duration || 0) - (a.duration || 0))[0],
      metrics
    };
  }
}
```

## 📋 Implementation Checklist

### Phase 1 (Week 1-2) ✅ COMPLETED
- [x] Implement keyboard shortcuts system ✅ COMPLETED (v1.4.3)
- [x] Add multiple reply suggestions UI ✅ COMPLETED (v1.5.0)
- [x] Create emoji tone selector ✅ COMPLETED (v1.5.0)
- [x] Build preset reply templates ✅ COMPLETED (v1.5.0)
- [x] Add memory management system ✅ COMPLETED (v1.5.0)
- [ ] Enhance error handling (partial - basic error handler implemented)

### Phase 2 (Week 3-4)
- [ ] Set up backend service structure
- [ ] Implement image analysis integration
- [ ] Add research cascade system
- [ ] Create testing infrastructure
- [ ] Build analytics dashboard
- [ ] Improve DOM selectors

### Phase 3 (Month 2+)
- [ ] Complete backend implementation
- [ ] Add scheduling system
- [ ] Implement automation features
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Chrome Web Store preparation

## 📝 Notes

- Each feature should be implemented with backward compatibility in mind
- All new features should include appropriate error handling
- Performance impact should be measured for each feature
- User settings should be migrated smoothly when adding new options
- Documentation should be updated as features are implemented
- Consider A/B testing for major UI changes

## 🔗 References

- XReplyGPT: https://github.com/marcolivierbouch/XReplyGPT
- XAI: Typescript/Webpack Twitter extension with backend
- tweet_chrome: Enterprise-grade extension with comprehensive testing
- twitter_automation: Scheduling and automation platform
- twitter_bookmark_manager: Analytics and database integration

---

Last Updated: 2025-01-26
Version: 1.1.1
Current TweetCraft Version: 1.5.0

## Recent Updates (v1.5.0 - 2025-01-26)

### UI Fixes Completed
- ✅ Fixed preset templates UI overflow issues
- ✅ Redesigned layout with compact 3-column grid
- ✅ Fixed dark mode contrast issues
- ✅ Improved integration with popup UI/UX
- ✅ Added proper constraints to prevent out-of-bounds elements