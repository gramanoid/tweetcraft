# TweetCraft v0.0.23 - Comprehensive UX/UI & Integration Test Plan

## Executive Summary
This document provides an exhaustive test plan for TweetCraft Chrome Extension, covering all interactive UI components from frontend through backend to LLM integration. Each test validates three layers: Frontend (UI/UX), Integration (API), and End-to-End (LLM Functionality).

## Test Environment Requirements
- **Chrome Version**: 120+ with Developer Mode enabled
- **Platforms**: twitter.com, x.com, app.hypefury.com
- **API Keys**: OpenRouter API key with valid credits
- **Network**: Stable internet connection for API calls
- **Console Access**: Chrome DevTools for monitoring

---

## 1. CORE REPLY GENERATION FLOW

### 1.1 Tab Navigation System

#### 1.1.1 Smart Tab Button
**Action**: Click "⚡ Smart" tab button  
**Frontend Validation**:
- Button highlights with active state (#1DA1F2)
- Tab content renders within 100ms
- Previous tab content unmounts cleanly
- No console errors during transition
**Integration (API)**:
- Triggers: `MessageType.SUGGEST_TEMPLATE` to service worker
- Request: `POST /suggest-template` with tweet context
- Expected: 200 OK with suggestions array within 8s
**End-to-End (LLM)**:
- Prompt includes tweet context + usage patterns
- LLM returns 3-5 template suggestions
- Each suggestion has score (1-10) with rationale
**Pass/Fail**: Tab loads < 500ms, suggestions appear < 8s, scores display correctly

#### 1.1.2 Personas Tab Button
**Action**: Click "👤 Personas" tab button  
**Frontend Validation**:
- 24 personalities display in 5 grouped categories
- Groups are collapsible with smooth animations
- Selected persona shows checkmark indicator
- Hover effects work on all cards
**Integration (API)**:
- No API call (static content)
- LocalStorage saves selected persona
**End-to-End (LLM)**:
- Selected persona affects system prompt construction
- Personality traits reflected in generated replies
**Pass/Fail**: All 24 personas clickable, selection persists across sessions

#### 1.1.3 All Tab Button (Grid View)
**Action**: Click "⊞ All" tab button  
**Frontend Validation**:
- 4 sections render: Personality, Vocabulary, Rhetoric, Length
- Each section shows selection count badge
- Progressive disclosure (sections collapsible)
- Grid layout responsive to container size
**Integration (API)**:
- No direct API call
- Selections stored in chrome.storage.local
**End-to-End (LLM)**:
- All 4 selections combine into complete prompt
- 24,750 possible combinations work correctly
**Pass/Fail**: All combinations selectable, visual feedback immediate

#### 1.1.4 Favorites Tab Button
**Action**: Click "⭐ Favorites" tab button  
**Frontend Validation**:
- Top 5 most-used combinations display
- Usage count shows for each favorite
- One-click apply functionality
- Empty state shows helpful message
**Integration (API)**:
- Reads from `smartDefaults.getTopCombinations()`
- Updates usage stats on selection
**End-to-End (LLM)**:
- Applied favorite generates appropriate reply
- Usage tracking increments correctly
**Pass/Fail**: Favorites load from actual usage, one-click apply works

#### 1.1.5 Compose Tab Button
**Action**: Click "✏️ Compose" tab button  
**Frontend Validation**:
- Text editor with character counter
- Style/tone/purpose dropdowns
- Generate/Enhance/Suggest buttons
- Draft management UI
**Integration (API)**:
- `MessageType.COMPOSE_TWEET` for generation
- Draft saves to localStorage
**End-to-End (LLM)**:
- Generates original tweets (not replies)
- Respects style/tone parameters
- 280 character limit enforced
**Pass/Fail**: Tweets generate within limits, drafts persist

#### 1.1.6 Arsenal Tab Button
**Action**: Click "⚔️ Arsenal" tab button  
**Frontend Validation**:
- 6 category tabs (Professional, Friendly, etc.)
- Search bar with real-time filtering
- Reply cards with copy/edit/delete actions
- Grid layout with proper spacing
**Integration (API)**:
- `MessageType.GET_ARSENAL_REPLIES` fetches from IndexedDB
- `MessageType.SAVE_ARSENAL_REPLY` stores new replies
**End-to-End (LLM)**:
- No LLM integration (pre-saved replies)
- Usage tracking updates on copy
**Pass/Fail**: All CRUD operations work, search filters correctly

### 1.2 Reply Generation Controls

#### 1.2.1 Generate Button (Primary Action)
**Action**: Click "Generate Reply" button after selections  
**Frontend Validation**:
- Button shows loading spinner animation
- "Generating..." text replaces button label
- Button disabled during generation
- Success animation on completion
**Integration (API)**:
- `MessageType.GENERATE_REPLY` to service worker
- Service worker calls OpenRouter API
- Timeout after 30s with error message
**End-to-End (LLM)**:
- System + user prompts constructed correctly
- Temperature settings applied (0.7-0.9)
- Reply respects all 4 selected parameters
- Anti-disclosure instructions prevent AI revelation
**Pass/Fail**: Reply generates < 10s, matches selected tone/style

#### 1.2.2 Quick Generate Button (Space Bar)
**Action**: Press Space bar or click "⚡ Quick Generate"  
**Frontend Validation**:
- Instant trigger without selections
- Uses last successful configuration
- Visual pulse animation during generation
**Integration (API)**:
- Uses cached settings from `smartDefaults`
- Same API flow as regular generation
**End-to-End (LLM)**:
- Smart defaults applied based on time/context
- Reply quality matches manual selection
**Pass/Fail**: Space bar works globally, generates < 8s

#### 1.2.3 Regenerate Button
**Action**: Click "🔄" button after generation  
**Frontend Validation**:
- Button rotation animation
- Previous reply replaced smoothly
- Settings retained from last generation
**Integration (API)**:
- Same request with `bypassCache: true`
- New API call (no deduplication)
**End-to-End (LLM)**:
- Different reply generated (not cached)
- Same parameters but varied output
**Pass/Fail**: New unique reply each time, no caching

#### 1.2.4 Copy Button
**Action**: Click "Copy" button on generated reply  
**Frontend Validation**:
- Button text changes to "✓ Copied"
- Green success color (#17BF63)
- Reverts after 2 seconds
**Integration (API)**:
- No API call
- Clipboard API usage
**End-to-End (LLM)**:
- Copied text matches displayed reply exactly
- No formatting issues
**Pass/Fail**: Text in clipboard, visual feedback works

### 1.3 Advanced Features

#### 1.3.1 Image Context Analysis
**Action**: Generate reply on tweet with images  
**Frontend Validation**:
- "Analyzing images..." indicator
- Image preview in context panel
**Integration (API)**:
- `MessageType.ANALYZE_IMAGES` to service worker
- Base64 conversion in content script
- Vision model API call (gpt-4-vision)
**End-to-End (LLM)**:
- Image description in prompt
- Reply references visual content
- Handles multiple images (up to 4)
**Pass/Fail**: Images analyzed < 5s, context reflected in reply

#### 1.3.2 Thread Context Awareness
**Action**: Reply to tweet in thread  
**Frontend Validation**:
- "Thread context (X tweets)" indicator
- Context preview expandable
**Integration (API)**:
- DOM traversal for parent tweets
- Context included in API request
**End-to-End (LLM)**:
- Reply acknowledges thread discussion
- Maintains conversation continuity
**Pass/Fail**: Thread context captured, reply relevant to discussion

#### 1.3.3 Keyboard Shortcuts
**Action**: Press Alt+1 through Alt+9  
**Frontend Validation**:
- Corresponding tone selected instantly
- Visual highlight on selected option
- Works globally in extension popup
**Integration (API)**:
- Updates selection state
- No API call until generation
**End-to-End (LLM)**:
- Shortcut selection affects reply tone
**Pass/Fail**: All 9 shortcuts work, visual feedback immediate

---

## 2. SETTINGS & CONFIGURATION

### 2.1 Settings Tab Components

#### 2.1.1 API Key Input
**Action**: Enter OpenRouter API key in settings  
**Frontend Validation**:
- Input field masks key (shows ••••)
- Save button enables on change
- Success toast on save
**Integration (API)**:
- `MessageType.SET_API_KEY` to service worker
- Key stored in chrome.storage.local (encrypted)
- Validation endpoint called
**End-to-End (LLM)**:
- Valid key enables generation
- Invalid key shows specific error
**Pass/Fail**: Key saves securely, validation accurate

#### 2.1.2 Model Selection Dropdown
**Action**: Change AI model in settings  
**Frontend Validation**:
- Dropdown shows available models
- Current model highlighted
- Model description on hover
**Integration (API)**:
- `MessageType.FETCH_MODELS` gets list
- Selection saved to storage
**End-to-End (LLM)**:
- Selected model used in generation
- Different models produce varied styles
**Pass/Fail**: Model list loads, selection affects output

#### 2.1.3 Temperature Slider
**Action**: Adjust temperature (0.0 - 1.0)  
**Frontend Validation**:
- Slider thumb draggable
- Value display updates live
- Color gradient (blue to red)
**Integration (API)**:
- Value saved to storage
- Included in generation request
**End-to-End (LLM)**:
- Lower values = more focused replies
- Higher values = more creative replies
**Pass/Fail**: Slider responsive, output variance correlates

#### 2.1.4 Auto-Refresh Toggle
**Action**: Toggle auto-refresh for suggestions  
**Frontend Validation**:
- Toggle animates smoothly
- State persists on reload
- Affects Smart tab behavior
**Integration (API)**:
- Enables/disables periodic API calls
- 30s refresh interval when enabled
**End-to-End (LLM)**:
- Fresh suggestions every 30s
- No duplicate suggestions in sequence
**Pass/Fail**: Toggle works, refresh happens at intervals

#### 2.1.5 Export/Import Settings
**Action**: Click Export Settings button  
**Frontend Validation**:
- Downloads JSON file
- Import accepts .json only
- Success/error messages
**Integration (API)**:
- Reads all chrome.storage data
- Validates imported structure
**End-to-End (LLM)**:
- Imported settings affect generation
- All preferences restored correctly
**Pass/Fail**: Export creates valid JSON, import restores all settings

### 2.2 Privacy & Data Controls

#### 2.2.1 Clear All Data Button
**Action**: Click "Clear All Data" button  
**Frontend Validation**:
- Confirmation modal appears
- Red warning styling
- Progress indicator during clear
**Integration (API)**:
- `MessageType.CLEAR_DATA` to service worker
- Clears chrome.storage + IndexedDB
- Arsenal replies removed
**End-to-End (LLM)**:
- All settings reset to defaults
- Requires API key re-entry
**Pass/Fail**: All data cleared, extension returns to fresh state

#### 2.2.2 Usage Statistics Toggle
**Action**: Toggle usage tracking on/off  
**Frontend Validation**:
- Toggle state clear
- Warning about lost insights
**Integration (API)**:
- Stops tracking when disabled
- Stats frozen at current values
**End-to-End (LLM)**:
- Smart suggestions less accurate when off
- No data collected when disabled
**Pass/Fail**: Tracking stops immediately, stats don't update

---

## 3. ANALYTICS & INSIGHTS

### 3.1 Stats Dashboard

#### 3.1.1 Usage Metrics Display
**Action**: View Stats tab  
**Frontend Validation**:
- CSS-only bar charts render
- Donut chart for personality distribution
- Heatmap for time patterns
**Integration (API)**:
- Reads from `smartDefaults.getWeeklyStats()`
- No external API calls
**End-to-End (LLM)**:
- Stats reflect actual usage
- Recommendations based on patterns
**Pass/Fail**: Charts render correctly, data accurate

#### 3.1.2 Weekly Summary
**Action**: View weekly summary (Sunday 7PM)  
**Frontend Validation**:
- Summary card with key metrics
- Top personality/vocabulary highlighted
- Success rate percentage
**Integration (API)**:
- Chrome alarm triggers calculation
- Data from past 7 days aggregated
**End-to-End (LLM)**:
- Insights actionable and relevant
**Pass/Fail**: Summary appears on schedule, metrics correct

### 3.2 Live Features

#### 3.2.1 Trending Topics
**Action**: View Trending tab  
**Frontend Validation**:
- Topics load with volume indicators
- Category filters work
- Auto-refresh countdown visible
**Integration (API)**:
- EXA API call for trends
- Cache fallback on failure
- 5-minute cache TTL
**End-to-End (LLM)**:
- Topics current and relevant
- Volume numbers realistic
**Pass/Fail**: Trends load < 3s, categories filter correctly

#### 3.2.2 A/B Testing
**Action**: Use A/B Test tab  
**Frontend Validation**:
- Two reply options side-by-side
- Vote buttons for each
- Results summary after voting
**Integration (API)**:
- Generates two variants
- Tracks selection locally
**End-to-End (LLM)**:
- Variants meaningfully different
- Both respect selected parameters
**Pass/Fail**: Two unique replies, voting tracked

---

## 4. ERROR HANDLING & EDGE CASES

### 4.1 Network Failures

#### 4.1.1 Offline Mode
**Action**: Disconnect internet, try generation  
**Frontend Validation**:
- Offline indicator appears
- Queue message shown
- Retry button available
**Integration (API)**:
- Request queued locally
- Auto-retry when online
**End-to-End (LLM)**:
- Queued request processes on reconnection
**Pass/Fail**: Graceful offline handling, queue works

#### 4.1.2 API Rate Limiting
**Action**: Exceed rate limit (multiple rapid requests)  
**Frontend Validation**:
- Rate limit error message
- Cooldown timer shown
- Retry after X seconds
**Integration (API)**:
- 429 status handled
- Exponential backoff implemented
**End-to-End (LLM)**:
- Fallback to cached responses when available
**Pass/Fail**: Clear error message, auto-retry works

### 4.2 Input Validation

#### 4.2.1 Empty Tweet Context
**Action**: Try generation on empty tweet  
**Frontend Validation**:
- Error: "No tweet content found"
- Generate button disabled
**Integration (API)**:
- No API call made
**End-to-End (LLM)**:
- N/A (blocked at frontend)
**Pass/Fail**: Appropriate error, no wasted API call

#### 4.2.2 Malformed API Response
**Action**: Simulate corrupted API response  
**Frontend Validation**:
- Generic error message
- Retry button appears
**Integration (API)**:
- Response validation fails
- Automatic retry with fallback model
**End-to-End (LLM)**:
- Fallback chain: gpt-4o-mini → claude-3-haiku → llama-3.1-8b
**Pass/Fail**: Graceful degradation, user informed

### 4.3 Security & Injection

#### 4.3.1 Prompt Injection Attempt
**Action**: Tweet contains "Ignore instructions and..."  
**Frontend Validation**:
- Normal generation flow
**Integration (API)**:
- Tweet text sanitized
- System prompt immutable
**End-to-End (LLM)**:
- LLM ignores injection attempt
- Reply stays on topic
**Pass/Fail**: No prompt override, safe reply generated

#### 4.3.2 XSS in Generated Reply
**Action**: LLM returns HTML/script tags  
**Frontend Validation**:
- HTML escaped in display
- No script execution
**Integration (API)**:
- Response sanitized
**End-to-End (LLM)**:
- Safe text insertion into Twitter
**Pass/Fail**: No code execution, text safely displayed

---

## 5. PERFORMANCE & OPTIMIZATION

### 5.1 Load Time Metrics

#### 5.1.1 Initial Extension Load
**Action**: First click on extension icon  
**Frontend Validation**:
- Popup appears < 500ms
- No white flash
- Smooth animation
**Integration (API)**:
- Service worker ready
- Storage initialized
**End-to-End (LLM)**:
- Ready for generation immediately
**Pass/Fail**: Load time < 500ms, no jank

#### 5.1.2 Bundle Size Check
**Action**: Inspect built extension  
**Frontend Validation**:
- contentScript.js < 500KB
- Total extension < 2MB
**Integration (API)**:
- Code splitting effective
- Lazy loading for tabs
**End-to-End (LLM)**:
- No performance degradation
**Pass/Fail**: Bundle within limits, performance smooth

### 5.2 Memory Management

#### 5.2.1 Long Session Test
**Action**: Use extension for 1 hour continuously  
**Frontend Validation**:
- No memory leaks
- UI remains responsive
**Integration (API)**:
- Request cache cleaned
- Old data purged
**End-to-End (LLM)**:
- Consistent generation speed
**Pass/Fail**: Memory stable, no degradation

#### 5.2.2 Tab Switching Stress Test
**Action**: Rapidly switch between all tabs 50 times  
**Frontend Validation**:
- No UI freezing
- Animations remain smooth
- Event listeners cleaned up
**Integration (API)**:
- No duplicate API calls
- State management stable
**End-to-End (LLM)**:
- Previous selections preserved
**Pass/Fail**: UI responsive throughout, no errors

---

## 6. ACCESSIBILITY & COMPATIBILITY

### 6.1 Accessibility Standards

#### 6.1.1 Keyboard Navigation
**Action**: Navigate UI using only keyboard  
**Frontend Validation**:
- Tab order logical
- Focus indicators visible
- All actions keyboard-accessible
**Integration (API)**:
- Keyboard triggers same as click
**End-to-End (LLM)**:
- Full functionality via keyboard
**Pass/Fail**: Complete keyboard control possible

#### 6.1.2 Screen Reader Support
**Action**: Test with screen reader  
**Frontend Validation**:
- ARIA labels present
- Role attributes correct
- Status updates announced
**Integration (API)**:
- Loading states announced
**End-to-End (LLM)**:
- Generated reply read aloud
**Pass/Fail**: Screen reader can access all features

### 6.2 Cross-Platform Testing

#### 6.2.1 Twitter.com Compatibility
**Action**: Test on twitter.com  
**Frontend Validation**:
- Extension icon appears
- Selector opens correctly
- Text insertion works
**Integration (API)**:
- DOM selectors find elements
**End-to-End (LLM)**:
- Reply inserted into tweet box
**Pass/Fail**: Full functionality on twitter.com

#### 6.2.2 X.com Compatibility
**Action**: Test on x.com  
**Frontend Validation**:
- Same as twitter.com
- Dark mode support
**Integration (API)**:
- Same endpoints work
**End-to-End (LLM)**:
- Identical functionality
**Pass/Fail**: Full functionality on x.com

#### 6.2.3 HypeFury Compatibility
**Action**: Test on app.hypefury.com  
**Frontend Validation**:
- Extension detects platform
- UI adapts to HypeFury
**Integration (API)**:
- Different DOM selectors used
**End-to-End (LLM)**:
- Reply inserted correctly
**Pass/Fail**: Full functionality on HypeFury

---

## Test Execution Summary

### Critical Path Tests (P0)
1. Generate Reply with default settings
2. API key validation and storage
3. Text insertion on Twitter/X
4. Quick Generate (Space bar)
5. Error handling for offline mode

### High Priority Tests (P1)
1. All tab navigation
2. Image context analysis
3. Thread awareness
4. Settings persistence
5. Arsenal CRUD operations

### Medium Priority Tests (P2)
1. Stats dashboard accuracy
2. Trending topics
3. A/B testing
4. Export/import settings
5. Keyboard shortcuts

### Low Priority Tests (P3)
1. Memory optimization
2. Long session stability
3. Accessibility compliance
4. Animation smoothness
5. Cache hit rates

---

## Success Metrics
- **Core Functionality**: 100% of P0 tests passing
- **API Integration**: < 10s generation time, < 1% error rate
- **LLM Quality**: Replies match selected parameters 95%+ of time
- **Performance**: Initial load < 500ms, bundle < 500KB
- **Reliability**: 99% uptime with fallback models
- **User Experience**: All UI interactions < 100ms response

---

## Regression Test Checklist
Run after each deployment:
- [ ] Generate reply on Twitter.com
- [ ] Generate reply on X.com  
- [ ] Generate reply on HypeFury
- [ ] Quick Generate (Space) works
- [ ] All 12 tabs load correctly
- [ ] Settings persist after reload
- [ ] Arsenal replies save/load
- [ ] No console errors in DevTools
- [ ] Bundle size within limits
- [ ] API key remains secure (not in logs)