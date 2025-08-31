# Arsenal Mode Implementation Plan

## Overview
Arsenal Mode adds quick-fire inflammatory replies to TweetCraft. Pre-generated responses load instantly from a JSON file - no API calls, no waiting.

## The Vision
**Quick inflammatory replies at your fingertips. See a bad take → Click Arsenal → Pick reply → Fire. Under 2 seconds total.**

---

## Phase 1: Generate Your Arsenal (30 mins)

### Use BulkCraft to Generate Replies
```bash
# In bulkcraft folder - create different categories
node dist/cli/index.js generate --topic "AI hype" --style inflammatory --count 50 > ai-replies.json
node dist/cli/index.js generate --topic "crypto bros" --style inflammatory --count 50 > crypto-replies.json
node dist/cli/index.js generate --topic "javascript frameworks" --style inflammatory --count 50 > tech-replies.json
node dist/cli/index.js generate --topic "startup culture" --style inflammatory --count 50 > startup-replies.json
node dist/cli/index.js generate --topic "web3 NFTs" --style inflammatory --count 50 > web3-replies.json
```

### Combine into Single Arsenal File
```javascript
// public/arsenal.json
{
  "replies": [
    // AI/AGI tweets
    {
      "id": "ai_1", 
      "text": "Another day, another AI bro discovering if statements", 
      "category": "ai", 
      "keywords": ["ai", "agi", "artificial", "intelligence", "chatgpt", "openai"]
    },
    {
      "id": "ai_2", 
      "text": "Touch grass, the singularity can wait", 
      "category": "ai", 
      "keywords": ["singularity", "agi", "skynet", "alignment"]
    },
    {
      "id": "ai_3",
      "text": "Wow, you prompted an AI to write that take? Revolutionary.",
      "category": "ai",
      "keywords": ["prompt", "llm", "gpt", "claude"]
    },
    
    // Crypto tweets  
    {
      "id": "crypto_1", 
      "text": "Few understand (that you don't understand)", 
      "category": "crypto", 
      "keywords": ["bitcoin", "crypto", "blockchain", "web3", "defi"]
    },
    {
      "id": "crypto_2", 
      "text": "Have fun staying poor with your JPEGs", 
      "category": "crypto", 
      "keywords": ["nft", "jpeg", "opensea", "mint"]
    },
    {
      "id": "crypto_3",
      "text": "Sir, this is a Ponzi scheme",
      "category": "crypto",
      "keywords": ["moon", "hodl", "diamond hands", "pump"]
    },
    
    // Tech debates
    {
      "id": "tech_1", 
      "text": "Skill issue", 
      "category": "tech", 
      "keywords": ["javascript", "react", "vue", "angular", "framework"]
    },
    {
      "id": "tech_2", 
      "text": "Tell me you've never scaled without telling me", 
      "category": "tech", 
      "keywords": ["scale", "production", "enterprise", "architecture"]
    },
    {
      "id": "tech_3",
      "text": "Your localhost experience is showing",
      "category": "tech", 
      "keywords": ["deploy", "production", "devops", "kubernetes"]
    },
    
    // Startup culture
    {
      "id": "startup_1",
      "text": "Another 'Uber for X' that'll be dead in 6 months",
      "category": "startup",
      "keywords": ["startup", "founder", "entrepreneur", "disrupt"]
    },
    {
      "id": "startup_2",
      "text": "Congrats on reinventing something that already exists",
      "category": "startup",
      "keywords": ["innovative", "revolutionary", "game-changer", "pivot"]
    }
  ]
}
```

---

## Phase 2: Core Implementation (2 hours)

### 1. Create Arsenal Loader
```javascript
// src/content/arsenal.ts
class Arsenal {
  private replies: any[] = [];
  private used: Set<string> = new Set();
  private loaded: boolean = false;

  async init() {
    if (this.loaded) return;
    
    try {
      const url = chrome.runtime.getURL('arsenal.json');
      const response = await fetch(url);
      const data = await response.json();
      this.replies = data.replies;
      this.loaded = true;
      
      // Load used replies from localStorage
      const saved = localStorage.getItem('arsenal_used');
      if (saved) {
        this.used = new Set(JSON.parse(saved));
      }
      
      console.log('%c⚔️ Arsenal loaded:', 'color: #ff4500; font-weight: bold', 
                  `${this.replies.length} replies ready`);
    } catch (error) {
      console.error('Failed to load arsenal:', error);
    }
  }

  findMatches(tweetText: string): any[] {
    const text = tweetText.toLowerCase();
    const words = text.split(/\s+/);
    
    // Score each reply based on keyword matches
    const scored = this.replies
      .filter(r => !this.used.has(r.id))
      .map(reply => {
        const score = reply.keywords.filter(kw => 
          text.includes(kw.toLowerCase())
        ).length;
        return { ...reply, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
    
    return scored.slice(0, 5);
  }

  markUsed(id: string) {
    this.used.add(id);
    localStorage.setItem('arsenal_used', JSON.stringify([...this.used]));
  }

  resetUsed() {
    this.used.clear();
    localStorage.removeItem('arsenal_used');
  }
  
  getStats() {
    return {
      total: this.replies.length,
      used: this.used.size,
      remaining: this.replies.length - this.used.size
    };
  }
}

export const arsenal = new Arsenal();
```

### 2. Add Arsenal Button
```javascript
// src/content/arsenalButton.ts
import { arsenal } from './arsenal';
import { showArsenalPopup } from './arsenalPopup';

export function injectArsenalButton() {
  // Find all reply buttons and add arsenal option
  const observer = new MutationObserver(() => {
    // Find reply compose areas
    const replyButtons = document.querySelectorAll('[data-testid="reply"]');
    
    replyButtons.forEach(replyButton => {
      const article = replyButton.closest('article');
      if (!article) return;
      
      // Check if we already added arsenal button
      const existingArsenal = article.querySelector('.arsenal-trigger');
      if (existingArsenal) return;
      
      // Create arsenal button
      const arsenalBtn = document.createElement('button');
      arsenalBtn.className = 'arsenal-trigger';
      arsenalBtn.innerHTML = '⚔️';
      arsenalBtn.title = 'Arsenal Quick Reply (Alt+A)';
      
      // Style to match Twitter's icon buttons
      arsenalBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 35px;
        height: 35px;
        margin-left: 8px;
        border-radius: 9999px;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 18px;
      `;
      
      // Hover effect
      arsenalBtn.onmouseenter = () => {
        arsenalBtn.style.backgroundColor = 'rgba(255, 69, 0, 0.1)';
      };
      arsenalBtn.onmouseleave = () => {
        arsenalBtn.style.backgroundColor = 'transparent';
      };
      
      // Click handler
      arsenalBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Extract tweet text
        const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
        const tweetText = tweetTextElement?.textContent || '';
        
        // Show popup anchored to this button
        showArsenalPopup(tweetText, arsenalBtn, article);
      };
      
      // Insert after reply button
      const actionBar = replyButton.parentElement;
      if (actionBar) {
        actionBar.style.position = 'relative';
        actionBar.appendChild(arsenalBtn);
      }
    });
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}
```

### 3. Simple Popup UI
```javascript
// src/content/arsenalPopup.ts
import { arsenal } from './arsenal';

let currentPopup: HTMLElement | null = null;

export function showArsenalPopup(
  tweetText: string, 
  anchorElement: HTMLElement,
  tweetArticle: HTMLElement
) {
  // Remove existing popup
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  
  const matches = arsenal.findMatches(tweetText);
  
  const popup = document.createElement('div');
  popup.className = 'arsenal-popup';
  
  if (matches.length === 0) {
    popup.innerHTML = `
      <div class="arsenal-header">
        <span>⚔️ No matches found</span>
        <button class="arsenal-close">×</button>
      </div>
      <div class="arsenal-empty">
        No arsenal replies match this tweet.
        Try the AI Reply button for a custom response.
      </div>
    `;
  } else {
    popup.innerHTML = `
      <div class="arsenal-header">
        <span>⚔️ Choose your weapon</span>
        <button class="arsenal-close">×</button>
      </div>
      <div class="arsenal-replies">
        ${matches.map(reply => `
          <div class="arsenal-reply-option" data-id="${reply.id}">
            <span class="arsenal-reply-text">${reply.text}</span>
            <span class="arsenal-category">${reply.category}</span>
          </div>
        `).join('')}
      </div>
      <div class="arsenal-footer">
        <span class="arsenal-stats">
          ${arsenal.getStats().remaining} unused replies
        </span>
      </div>
    `;
  }
  
  // Position near the button
  const rect = anchorElement.getBoundingClientRect();
  popup.style.cssText = `
    position: fixed;
    top: ${Math.min(rect.bottom + 5, window.innerHeight - 320)}px;
    left: ${Math.min(rect.left - 100, window.innerWidth - 420)}px;
    width: 400px;
    max-height: 300px;
    background: #15202B;
    border: 2px solid #ff4500;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(255, 69, 0, 0.3);
    z-index: 10000;
    overflow: hidden;
  `;
  
  // Event handlers
  popup.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Close button
    if (target.classList.contains('arsenal-close')) {
      popup.remove();
      currentPopup = null;
      return;
    }
    
    // Reply selection
    const replyOption = target.closest('.arsenal-reply-option');
    if (replyOption) {
      const replyText = replyOption.querySelector('.arsenal-reply-text')?.textContent;
      const replyId = replyOption.getAttribute('data-id');
      
      if (replyText && replyId) {
        insertReplyIntoTweet(replyText, tweetArticle);
        arsenal.markUsed(replyId);
        popup.remove();
        currentPopup = null;
      }
    }
  });
  
  // Close on escape
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && currentPopup) {
      currentPopup.remove();
      currentPopup = null;
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  // Close on click outside
  setTimeout(() => {
    const clickOutside = (e: MouseEvent) => {
      if (currentPopup && !currentPopup.contains(e.target as Node)) {
        currentPopup.remove();
        currentPopup = null;
        document.removeEventListener('click', clickOutside);
      }
    };
    document.addEventListener('click', clickOutside);
  }, 100);
  
  document.body.appendChild(popup);
  currentPopup = popup;
}

function insertReplyIntoTweet(text: string, tweetArticle: HTMLElement) {
  // Click reply button to open compose
  const replyButton = tweetArticle.querySelector('[data-testid="reply"]') as HTMLElement;
  if (replyButton) {
    replyButton.click();
    
    // Wait for compose box to appear
    setTimeout(() => {
      const composeBox = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement;
      if (composeBox) {
        // Focus the box
        composeBox.focus();
        
        // Insert text using the working method from domUtils
        if (composeBox.contentEditable === 'true') {
          document.execCommand('insertText', false, text);
          
          // Trigger React update
          const inputEvent = new InputEvent('input', { 
            inputType: 'insertText', 
            data: text,
            bubbles: true
          });
          composeBox.dispatchEvent(inputEvent);
        }
      }
    }, 200);
  }
}
```

### 4. Minimal Styling
```css
/* src/content/arsenal.css */
.arsenal-popup {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #ffffff;
  font-size: 14px;
}

.arsenal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #38444d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  color: #ff4500;
}

.arsenal-close {
  background: none;
  border: none;
  color: #8899a6;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.arsenal-close:hover {
  background-color: rgba(255, 69, 0, 0.1);
}

.arsenal-replies {
  max-height: 200px;
  overflow-y: auto;
}

.arsenal-reply-option {
  padding: 12px 16px;
  border-bottom: 1px solid #38444d;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.arsenal-reply-option:hover {
  background-color: rgba(255, 69, 0, 0.1);
}

.arsenal-reply-text {
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
}

.arsenal-category {
  font-size: 11px;
  padding: 2px 6px;
  background: #ff4500;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 700;
  white-space: nowrap;
}

.arsenal-footer {
  padding: 8px 16px;
  border-top: 1px solid #38444d;
  font-size: 12px;
  color: #8899a6;
  text-align: center;
}

.arsenal-stats {
  display: inline-block;
}

.arsenal-empty {
  padding: 24px 16px;
  text-align: center;
  color: #8899a6;
  line-height: 1.4;
}

/* Scrollbar styling */
.arsenal-replies::-webkit-scrollbar {
  width: 6px;
}

.arsenal-replies::-webkit-scrollbar-track {
  background: transparent;
}

.arsenal-replies::-webkit-scrollbar-thumb {
  background: #ff4500;
  border-radius: 3px;
}

.arsenal-replies::-webkit-scrollbar-thumb:hover {
  background: #ff6500;
}
```

---

## Phase 3: Integration (30 mins)

### 1. Update Content Script
```javascript
// src/content/contentScript.ts
import { arsenal } from './arsenal';
import { injectArsenalButton } from './arsenalButton';

// Add to existing init function
async function init() {
  console.log('%c⚔️ ARSENAL MODE', 'color: #ff4500; font-weight: bold; font-size: 14px');
  
  // Existing initialization...
  
  // Initialize arsenal
  await arsenal.init();
  
  // Inject arsenal buttons
  injectArsenalButton();
  
  // Add keyboard shortcut
  document.addEventListener('keydown', handleArsenalShortcut);
}

function handleArsenalShortcut(e: KeyboardEvent) {
  // Alt + A for Arsenal
  if (e.altKey && e.key === 'a') {
    e.preventDefault();
    
    // Find the tweet in focus or under mouse
    const hoveredTweet = document.querySelector('article:hover');
    if (hoveredTweet) {
      const arsenalBtn = hoveredTweet.querySelector('.arsenal-trigger') as HTMLElement;
      if (arsenalBtn) {
        arsenalBtn.click();
      }
    }
  }
}
```

### 2. Update Manifest
```json
// manifest.json
{
  "web_accessible_resources": [
    {
      "resources": [
        "icons/*.png",
        "arsenal.json"  // Add this
      ],
      "matches": [
        "*://twitter.com/*",
        "*://x.com/*"
      ]
    }
  ],
  
  // Also add to content scripts if not already there
  "content_scripts": [
    {
      "matches": ["*://twitter.com/*", "*://x.com/*"],
      "css": [
        "content.css",
        "arsenal.css"  // Add this
      ],
      "js": ["content.js"]
    }
  ]
}
```

### 3. Update Webpack Config
```javascript
// build/webpack.common.js
// Add arsenal.css to the build
module.exports = {
  entry: {
    content: [
      './src/content/contentScript.ts',
      './src/content/arsenal.css'  // Add this
    ]
  }
}
```

### 4. Add Reset Command (Optional)
```javascript
// src/popup/popup-simple.ts
// Add button to reset used replies
const resetArsenalBtn = document.createElement('button');
resetArsenalBtn.textContent = 'Reset Arsenal Used Replies';
resetArsenalBtn.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'RESET_ARSENAL' 
    });
  });
};
```

---

## Phase 4: Testing Checklist

### Basic Functionality
- [ ] Arsenal button appears next to reply buttons
- [ ] Button has hover effect
- [ ] Clicking button shows popup
- [ ] Popup appears in correct position
- [ ] Relevant replies appear based on keywords
- [ ] Category badges display correctly
- [ ] Clicking reply opens compose and inserts text
- [ ] Used replies don't show again
- [ ] Stats show correct remaining count
- [ ] Close button works
- [ ] Click outside closes popup
- [ ] Escape key closes popup

### Edge Cases
- [ ] No matches shows appropriate message
- [ ] Works on both twitter.com and x.com
- [ ] Popup doesn't go off-screen
- [ ] Multiple popups don't stack
- [ ] Keyboard shortcut (Alt+A) works
- [ ] Works with Twitter's infinite scroll
- [ ] Handles deleted tweets gracefully

### Performance
- [ ] Arsenal.json loads successfully
- [ ] Search is instant (<100ms)
- [ ] No lag when scrolling timeline
- [ ] localStorage doesn't grow too large

---

## File Structure Summary
```
tweetcraft/
├── public/
│   └── arsenal.json            # Pre-generated replies (10KB-50KB)
├── src/
│   └── content/
│       ├── arsenal.ts          # Core arsenal logic (~100 lines)
│       ├── arsenalButton.ts    # Button injection (~80 lines)
│       ├── arsenalPopup.ts     # Popup UI (~150 lines)
│       └── arsenal.css         # Styles (~120 lines)
├── manifest.json               # Update with arsenal.json
└── ARSENAL_IMPLEMENTATION.md   # This file
```

---

## Implementation Timeline

### Day 1 (3-4 hours)
- **Hour 1**: Generate replies with BulkCraft, create arsenal.json
- **Hour 2**: Implement arsenal.ts and arsenalButton.ts
- **Hour 3**: Build arsenalPopup.ts and arsenal.css
- **Hour 4**: Integration and basic testing

### Day 2 (1-2 hours) 
- **Hour 1**: Bug fixes and edge cases
- **Hour 2**: Polish and final testing

---

## Future Enhancements (Not for MVP)

### V1.1 - Better Matching
- Add regex patterns for more complex matching
- Weight recent vs old tweets differently
- Learn from user selections

### V1.2 - Customization
- Let users add their own replies
- Edit existing replies
- Import/export personal arsenals

### V1.3 - Analytics
- Track which replies get most engagement
- Show "greatest hits" section
- Auto-retire low-performing replies

---

## Key Decisions Made

1. **No Database**: Just JSON in memory - fast and simple
2. **No Service Worker**: Direct content script implementation
3. **No Complex UI**: Simple popup, no React/frameworks
4. **No Scoring Algorithm**: Basic keyword matching
5. **localStorage for State**: Not Chrome storage API
6. **Separate from AI Reply**: Different button, different flow

---

## Success Metrics

- **Speed**: Reply selection in <2 seconds total
- **Accuracy**: 80%+ relevant matches
- **Adoption**: Users prefer for common responses
- **Performance**: No impact on Twitter browsing
- **Simplicity**: <500 total lines of code

---

## Notes

- Keep it simple - this is a utility, not a product
- Don't overengineer - it's just picking from a list
- Make it fast - speed is the whole point
- Visual distinction matters - users should instantly know this is different from AI Reply