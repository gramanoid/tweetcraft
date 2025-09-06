# TweetCraft Complete Wiring Implementation Todo List

## 🎯 Goal: Connect Frontend UI to Backend Services
**Estimated Time**: 16-24 hours  
**Priority**: CRITICAL - Nothing works without this  

---

## Phase 1: Core Message Passing Infrastructure (3 hours)

### 1.1 Create Message Bridge Service
**File**: `src/services/messageBridge.ts` (NEW)
```typescript
// Centralized message passing with type safety
export class MessageBridge {
  static async sendMessage<T>(message: ExtensionMessage): Promise<T> {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (!response.success) throw new Error(response.error);
      return response.data;
    } catch (error) {
      console.error('Message failed:', error);
      throw error;
    }
  }
}
```
- [ ] Create messageBridge.ts service
- [ ] Add error handling and retry logic
- [ ] Add loading state management
- [ ] Add response type validation
- [ ] Export for all tab components

### 1.2 Update TabManager with Message Passing
**File**: `src/components/tabs/TabManager.ts`
```typescript
// Add these methods to TabManager class
async generateReply(config: SelectionResult): Promise<string> {
  return MessageBridge.sendMessage({
    type: MessageType.GENERATE_REPLY,
    ...config
  });
}

async getSuggestions(context: TwitterContext): Promise<Suggestion[]> {
  return MessageBridge.sendMessage({
    type: MessageType.SUGGEST_TEMPLATE,
    context
  });
}
```
- [ ] Add generateReply method
- [ ] Add getSuggestions method
- [ ] Add getArsenalReplies method
- [ ] Add saveArsenalReply method
- [ ] Add composeTweet method
- [ ] Pass methods to tab components via constructor

### 1.3 Create UI State Manager
**File**: `src/services/uiStateManager.ts` (NEW)
```typescript
// Manage loading, error, and success states
export class UIStateManager {
  static setLoading(element: HTMLElement, loading: boolean) {
    if (loading) {
      element.classList.add('loading');
      element.disabled = true;
      element.innerHTML = '<span class="spinner"></span> Generating...';
    } else {
      element.classList.remove('loading');
      element.disabled = false;
      element.innerHTML = 'Generate Reply';
    }
  }
}
```
- [ ] Create uiStateManager.ts
- [ ] Add loading state methods
- [ ] Add error display methods
- [ ] Add success animation methods
- [ ] Add reply display methods

---

## Phase 2: Wire PersonasTab (2 hours)

**File**: `src/components/tabs/PersonasTab.ts`

### 2.1 Add Selection Tracking
```typescript
private selectedPersona: QuickPersona | null = null;
private selectedVocabulary: string | null = null;
private selectedRhetoric: string | null = null;
private selectedLength: string | null = null;
```
- [ ] Add selection state properties
- [ ] Add getSelectedConfig method
- [ ] Track selections in localStorage

### 2.2 Wire Persona Cards
```typescript
// In attachEventListeners
const personaCards = container.querySelectorAll('.persona-card');
personaCards.forEach(card => {
  card.addEventListener('click', (e) => {
    const personaId = card.dataset.personaId;
    this.selectPersona(personaId);
    this.updateUI();
  });
});
```
- [ ] Add click handlers for all persona cards
- [ ] Add visual selection feedback (checkmarks)
- [ ] Update selected state on click

### 2.3 Wire Generate Button
```typescript
const generateBtn = container.querySelector('.generate-reply-btn');
generateBtn?.addEventListener('click', async () => {
  try {
    UIStateManager.setLoading(generateBtn, true);
    const config = this.getSelectedConfig();
    const reply = await this.tabManager.generateReply(config);
    this.displayReply(reply);
  } catch (error) {
    this.showError(error.message);
  } finally {
    UIStateManager.setLoading(generateBtn, false);
  }
});
```
- [ ] Wire generate button click
- [ ] Add loading state during generation
- [ ] Display generated reply
- [ ] Add error handling
- [ ] Add copy button functionality

---

## Phase 3: Wire SmartTab (3 hours)

**File**: `src/components/tabs/SmartTab.ts`

### 3.1 Implement Suggestion Loading
```typescript
async loadSuggestions() {
  const container = document.querySelector('.smart-suggestions');
  container.innerHTML = '<div class="loading">Analyzing tweet context...</div>';
  
  try {
    const context = this.getTweetContext();
    const suggestions = await this.tabManager.getSuggestions(context);
    this.displaySuggestions(suggestions);
  } catch (error) {
    container.innerHTML = '<div class="error">Failed to load suggestions</div>';
  }
}
```
- [ ] Remove placeholder content
- [ ] Implement getTweetContext method
- [ ] Add loadSuggestions method
- [ ] Auto-load on tab show

### 3.2 Display Real Suggestions
```typescript
displaySuggestions(suggestions: Suggestion[]) {
  const html = suggestions.map(s => `
    <div class="suggestion-card" data-config='${JSON.stringify(s.config)}'>
      <div class="suggestion-score">${s.score}/10</div>
      <div class="suggestion-preview">${s.preview}</div>
      <div class="suggestion-rationale">${s.rationale}</div>
      <button class="use-suggestion">Use This</button>
    </div>
  `).join('');
  container.innerHTML = html;
}
```
- [ ] Create suggestion card template
- [ ] Display score badges
- [ ] Show preview text
- [ ] Add rationale tooltips

### 3.3 Wire Suggestion Selection
```typescript
container.addEventListener('click', async (e) => {
  if (e.target.classList.contains('use-suggestion')) {
    const card = e.target.closest('.suggestion-card');
    const config = JSON.parse(card.dataset.config);
    const reply = await this.tabManager.generateReply(config);
    this.displayReply(reply);
  }
});
```
- [ ] Add click handlers for suggestion cards
- [ ] Extract config from selected suggestion
- [ ] Generate with selected config
- [ ] Track suggestion usage

### 3.4 Wire Refresh Button
```typescript
const refreshBtn = container.querySelector('.refresh-suggestions');
refreshBtn?.addEventListener('click', () => {
  this.loadSuggestions();
});
```
- [ ] Wire refresh button
- [ ] Add rotation animation
- [ ] Prevent multiple simultaneous refreshes

### 3.5 Wire Quick Arsenal Button
```typescript
const arsenalBtn = container.querySelector('.quick-arsenal');
arsenalBtn?.addEventListener('click', async () => {
  const modal = this.showQuickArsenalModal();
  const replies = await this.tabManager.getTopArsenalReplies(5);
  this.populateArsenalModal(modal, replies);
});
```
- [ ] Wire Quick Arsenal button
- [ ] Create modal display
- [ ] Load top 5 arsenal replies
- [ ] Add one-click insert functionality

---

## Phase 4: Wire AllTab (Grid View) (2 hours)

**File**: `src/components/tabs/AllTab.ts`

### 4.1 Track All Selections
```typescript
private selections = {
  personality: null,
  vocabulary: null,
  rhetoric: null,
  lengthPacing: null
};
```
- [ ] Add selection state object
- [ ] Update on each selection
- [ ] Show selection count badges

### 4.2 Wire Selection Cards
```typescript
// For each section (personality, vocabulary, rhetoric, length)
container.addEventListener('click', (e) => {
  if (e.target.classList.contains('option-card')) {
    const type = e.target.dataset.type;
    const value = e.target.dataset.value;
    this.selections[type] = value;
    this.updateSelectionUI();
    this.checkIfReadyToGenerate();
  }
});
```
- [ ] Wire all personality cards (24 items)
- [ ] Wire all vocabulary cards (11 items)
- [ ] Wire all rhetoric cards (15 items)
- [ ] Wire all length cards (6 items)
- [ ] Add visual selection indicators

### 4.3 Enable Generate When Ready
```typescript
checkIfReadyToGenerate() {
  const btn = document.querySelector('.generate-with-all');
  const allSelected = Object.values(this.selections).every(v => v !== null);
  btn.disabled = !allSelected;
  if (allSelected) {
    btn.classList.add('ready-pulse');
  }
}
```
- [ ] Check if all 4 parts selected
- [ ] Enable/disable generate button
- [ ] Add visual ready indicator
- [ ] Show helper text

### 4.4 Wire Generate with 4-Part Config
```typescript
const generateBtn = container.querySelector('.generate-with-all');
generateBtn?.addEventListener('click', async () => {
  const config = {
    tabType: 'all',
    allTabConfig: this.selections
  };
  const reply = await this.tabManager.generateReply(config);
  this.displayReply(reply);
});
```
- [ ] Build complete config object
- [ ] Send to backend with proper format
- [ ] Display generated reply

---

## Phase 5: Wire FavoritesTab (1 hour)

**File**: `src/components/tabs/UnifiedFavoritesTab.ts`

### 5.1 Load Real Favorites
```typescript
async loadFavorites() {
  const favorites = await chrome.storage.local.get('topCombinations');
  if (!favorites?.topCombinations?.length) {
    this.showEmptyState();
  } else {
    this.displayFavorites(favorites.topCombinations);
  }
}
```
- [ ] Load from smartDefaults service
- [ ] Show top 5 combinations
- [ ] Display usage counts

### 5.2 Wire One-Click Apply
```typescript
container.addEventListener('click', async (e) => {
  if (e.target.classList.contains('apply-favorite')) {
    const config = JSON.parse(e.target.dataset.config);
    const reply = await this.tabManager.generateReply(config);
    this.displayReply(reply);
  }
});
```
- [ ] Add apply buttons to each favorite
- [ ] Extract saved configuration
- [ ] Generate with one click
- [ ] Update usage count

---

## Phase 6: Wire ComposeTab (2 hours)

**File**: `src/components/tabs/ComposeTab.ts`

### 6.1 Wire Generate Original Tweet
```typescript
const generateBtn = container.querySelector('.compose-generate');
generateBtn?.addEventListener('click', async () => {
  const topic = container.querySelector('.compose-topic').value;
  const style = container.querySelector('.compose-style').value;
  const tone = container.querySelector('.compose-tone').value;
  
  const tweet = await this.tabManager.composeTweet({
    topic, style, tone, type: 'generate'
  });
  this.displayComposedTweet(tweet);
});
```
- [ ] Wire Generate button
- [ ] Collect form inputs
- [ ] Send compose request
- [ ] Display in editor

### 6.2 Wire Enhance Button
```typescript
const enhanceBtn = container.querySelector('.compose-enhance');
enhanceBtn?.addEventListener('click', async () => {
  const draft = container.querySelector('.compose-editor').value;
  const enhanced = await this.tabManager.composeTweet({
    draft, type: 'enhance'
  });
  this.displayComposedTweet(enhanced);
});
```
- [ ] Wire Enhance button
- [ ] Get current draft text
- [ ] Send enhancement request
- [ ] Update editor with result

### 6.3 Wire Suggest Button
```typescript
const suggestBtn = container.querySelector('.compose-suggest');
suggestBtn?.addEventListener('click', async () => {
  const topic = container.querySelector('.compose-topic').value;
  const suggestions = await this.tabManager.getTweetSuggestions(topic);
  this.displaySuggestions(suggestions);
});
```
- [ ] Wire Suggest button
- [ ] Get topic/context
- [ ] Display suggestions list
- [ ] Allow selection

### 6.4 Add Character Counter
```typescript
const editor = container.querySelector('.compose-editor');
editor?.addEventListener('input', () => {
  const count = editor.value.length;
  const counter = container.querySelector('.char-counter');
  counter.textContent = `${count}/280`;
  counter.classList.toggle('over-limit', count > 280);
});
```
- [ ] Add real-time character counter
- [ ] Show visual warning at 280
- [ ] Prevent posting over limit

### 6.5 Wire Draft Management
```typescript
// Auto-save drafts
editor?.addEventListener('input', debounce(() => {
  localStorage.setItem('compose-draft', editor.value);
}, 500));

// Load saved draft
const savedDraft = localStorage.getItem('compose-draft');
if (savedDraft) editor.value = savedDraft;
```
- [ ] Auto-save drafts to localStorage
- [ ] Load saved draft on open
- [ ] Add clear draft button
- [ ] Add draft history

---

## Phase 7: Wire ArsenalTab (2 hours)

**File**: `src/components/tabs/ArsenalTab.ts`

### 7.1 Load Arsenal Replies
```typescript
async loadReplies(category?: string) {
  const replies = await this.tabManager.getArsenalReplies({
    category,
    limit: 50
  });
  this.displayReplies(replies);
}
```
- [ ] Load replies from IndexedDB
- [ ] Filter by category
- [ ] Display in grid

### 7.2 Wire Category Tabs
```typescript
const categoryTabs = container.querySelectorAll('.category-tab');
categoryTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    this.currentCategory = tab.dataset.category;
    this.loadReplies(this.currentCategory);
    this.updateCategoryUI();
  });
});
```
- [ ] Wire all 6 category tabs
- [ ] Update active state
- [ ] Reload filtered replies

### 7.3 Wire Search
```typescript
const searchInput = container.querySelector('.arsenal-search');
searchInput?.addEventListener('input', debounce(() => {
  this.searchTerm = searchInput.value;
  this.filterReplies();
}, 300));
```
- [ ] Wire search input
- [ ] Implement client-side filtering
- [ ] Highlight search matches

### 7.4 Wire CRUD Operations
```typescript
// Copy button
container.addEventListener('click', async (e) => {
  if (e.target.classList.contains('copy-reply')) {
    const text = e.target.dataset.reply;
    await navigator.clipboard.writeText(text);
    this.showCopySuccess(e.target);
    await this.tabManager.trackArsenalUsage(e.target.dataset.id);
  }
});

// Edit button
if (e.target.classList.contains('edit-reply')) {
  const id = e.target.dataset.id;
  const reply = await this.tabManager.getArsenalReply(id);
  this.showEditModal(reply);
}

// Delete button
if (e.target.classList.contains('delete-reply')) {
  if (confirm('Delete this reply?')) {
    await this.tabManager.deleteArsenalReply(e.target.dataset.id);
    this.loadReplies();
  }
}
```
- [ ] Wire Copy buttons
- [ ] Wire Edit buttons
- [ ] Wire Delete buttons
- [ ] Track usage on copy

### 7.5 Wire Add New Reply
```typescript
const saveBtn = container.querySelector('.save-to-arsenal');
saveBtn?.addEventListener('click', async () => {
  const generatedReply = this.getCurrentReply();
  await this.tabManager.saveArsenalReply({
    text: generatedReply,
    category: this.detectCategory(generatedReply),
    metadata: this.getCurrentMetadata()
  });
  this.showSaveSuccess();
});
```
- [ ] Add save button to generated replies
- [ ] Auto-detect category
- [ ] Save with metadata
- [ ] Show success message

---

## Phase 8: Wire Settings Tab (1 hour)

**File**: `src/components/tabs/SettingsTab.ts`

### 8.1 Load Current Settings
```typescript
async loadSettings() {
  const settings = await chrome.storage.local.get([
    'apiKey', 'model', 'temperature', 'systemPrompt'
  ]);
  this.populateForm(settings);
}
```
- [ ] Load all settings from storage
- [ ] Populate form fields
- [ ] Show current values

### 8.2 Wire Save Settings
```typescript
const saveBtn = container.querySelector('.save-settings');
saveBtn?.addEventListener('click', async () => {
  const settings = this.collectFormData();
  await chrome.storage.local.set(settings);
  this.showSaveSuccess();
});
```
- [ ] Collect all form values
- [ ] Save to chrome.storage
- [ ] Show success message
- [ ] Apply immediately

### 8.3 Wire API Key Validation
```typescript
const validateBtn = container.querySelector('.validate-api-key');
validateBtn?.addEventListener('click', async () => {
  const apiKey = container.querySelector('#api-key').value;
  const isValid = await this.tabManager.validateApiKey(apiKey);
  this.showValidationResult(isValid);
});
```
- [ ] Wire validate button
- [ ] Test API key with OpenRouter
- [ ] Show success/error message
- [ ] Enable/disable features based on validity

### 8.4 Wire Clear Data
```typescript
const clearBtn = container.querySelector('.clear-all-data');
clearBtn?.addEventListener('click', async () => {
  if (confirm('Clear all data? This cannot be undone.')) {
    await chrome.runtime.sendMessage({ type: MessageType.CLEAR_DATA });
    this.showDataCleared();
  }
});
```
- [ ] Wire clear data button
- [ ] Add confirmation dialog
- [ ] Clear all storage
- [ ] Reset to defaults

---

## Phase 9: Wire Additional Tabs (2 hours)

### 9.1 StatsTab
- [ ] Load real usage statistics
- [ ] Update charts with actual data
- [ ] Wire time period selector
- [ ] Add export functionality

### 9.2 TrendingTab
- [ ] Wire refresh button
- [ ] Implement auto-refresh timer
- [ ] Wire category filters
- [ ] Add click-to-compose functionality

### 9.3 EngagementTab
- [ ] Connect to Twitter API
- [ ] Load engagement metrics
- [ ] Wire refresh button
- [ ] Display success rates

### 9.4 ABTestTab
- [ ] Wire variant generation
- [ ] Implement voting buttons
- [ ] Track A/B test results
- [ ] Show winner analysis

### 9.5 CacheTab
- [ ] Display cache statistics
- [ ] Wire clear cache button
- [ ] Show cache hit rates
- [ ] Add cache management

---

## Phase 10: Global Features (2 hours)

### 10.1 Keyboard Shortcuts
```typescript
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key >= '1' && e.key <= '9') {
    const toneIndex = parseInt(e.key) - 1;
    this.selectTone(TONES[toneIndex]);
  }
  if (e.key === ' ' && !this.isTyping()) {
    e.preventDefault();
    this.quickGenerate();
  }
});
```
- [ ] Wire Alt+1 through Alt+9 for tones
- [ ] Wire Space for quick generate
- [ ] Wire Escape to close popup
- [ ] Add help overlay for shortcuts

### 10.2 Context Detection
```typescript
getTweetContext(): TwitterContext {
  const tweet = this.findParentTweet();
  return {
    tweetText: this.extractTweetText(tweet),
    authorHandle: this.extractAuthor(tweet),
    threadContext: this.extractThread(tweet),
    images: this.extractImages(tweet),
    tweetId: this.extractTweetId(tweet)
  };
}
```
- [ ] Implement tweet text extraction
- [ ] Extract author information
- [ ] Detect thread context
- [ ] Extract images for vision API

### 10.3 Error Recovery
```typescript
window.addEventListener('error', (e) => {
  console.error('Extension error:', e);
  this.showErrorBanner('Something went wrong. Please refresh.');
});
```
- [ ] Add global error handler
- [ ] Show user-friendly error messages
- [ ] Add retry mechanisms
- [ ] Log errors for debugging

---

## Phase 11: Testing & Validation (2 hours)

### 11.1 Core Flow Testing
- [ ] Test reply generation on Twitter.com
- [ ] Test reply generation on X.com
- [ ] Test reply generation on HypeFury
- [ ] Verify all 24 personalities work
- [ ] Test all 4-part combinations

### 11.2 Feature Testing
- [ ] Test Smart suggestions load
- [ ] Test Arsenal CRUD operations
- [ ] Test Compose tweet generation
- [ ] Test Settings persistence
- [ ] Test keyboard shortcuts

### 11.3 Error Testing
- [ ] Test with invalid API key
- [ ] Test offline behavior
- [ ] Test rate limiting
- [ ] Test empty states
- [ ] Test timeout handling

### 11.4 Performance Testing
- [ ] Measure generation time
- [ ] Check memory usage
- [ ] Test with 100+ arsenal replies
- [ ] Verify no memory leaks
- [ ] Test long session stability

---

## Implementation Order (Priority)

### Day 1: Core Infrastructure (8 hours)
1. ✅ Phase 1: Message Bridge & Infrastructure
2. ✅ Phase 2: Wire PersonasTab (most used)
3. ✅ Phase 3: Wire SmartTab (key feature)
4. ✅ Phase 10.2: Context Detection

### Day 2: Primary Features (8 hours)
5. ✅ Phase 4: Wire AllTab
6. ✅ Phase 5: Wire FavoritesTab
7. ✅ Phase 7: Wire ArsenalTab
8. ✅ Phase 10.1: Keyboard Shortcuts

### Day 3: Secondary Features (8 hours)
9. ✅ Phase 6: Wire ComposeTab
10. ✅ Phase 8: Wire SettingsTab
11. ✅ Phase 9: Additional Tabs
12. ✅ Phase 11: Testing

---

## Success Criteria

### Minimum Viable Product (Day 1)
- [ ] Can generate reply with PersonasTab
- [ ] Can see Smart suggestions
- [ ] Loading states work
- [ ] Errors handled gracefully

### Full Functionality (Day 3)
- [ ] All 12 tabs functional
- [ ] All CRUD operations work
- [ ] Settings persist
- [ ] Keyboard shortcuts work
- [ ] No console errors

### Production Ready (After Testing)
- [ ] 100% of features wired
- [ ] < 3 second generation time
- [ ] No memory leaks
- [ ] Works on all platforms
- [ ] User can successfully generate and post replies

---

## Code Templates

### Template 1: Basic Button Wiring
```typescript
const button = container.querySelector('.my-button');
button?.addEventListener('click', async () => {
  try {
    UIStateManager.setLoading(button, true);
    const result = await this.tabManager.myMethod();
    this.handleSuccess(result);
  } catch (error) {
    this.handleError(error);
  } finally {
    UIStateManager.setLoading(button, false);
  }
});
```

### Template 2: Selection Handling
```typescript
container.addEventListener('click', (e) => {
  const card = e.target.closest('.selectable-card');
  if (card) {
    // Remove previous selection
    container.querySelectorAll('.selected').forEach(el => {
      el.classList.remove('selected');
    });
    // Add new selection
    card.classList.add('selected');
    this.currentSelection = card.dataset.value;
  }
});
```

### Template 3: Form Submission
```typescript
const form = container.querySelector('.my-form');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  await this.processFormData(data);
});
```

---

## Notes

- **Test after each phase** - Don't wait until the end
- **Keep console open** - Watch for errors during development
- **Use TypeScript** - It will catch many wiring mistakes
- **Add logging** - Track message flow for debugging
- **Save progress** - Commit after each working phase

This todo list will transform the extension from a beautiful mockup to a fully functional tool that actually generates replies.