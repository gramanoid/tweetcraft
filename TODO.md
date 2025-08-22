# Smart Reply Extension - TODO List

## ✅ Completed Features (v1.0.2)

### Phase 1 - Zero-Risk UI Improvements
- ✅ Character counter (subtle gray, no colors)
- ✅ Keyboard navigation (Arrow keys, Enter, Escape)
- ✅ Visual feedback on dropdown hover
- ✅ Click-outside to close dropdown
- ✅ Fix dropdown position when scrolling
- ✅ Handle extension context invalidation gracefully

### Fixes
- ✅ Fix tone selection not working properly
- ✅ Remove status messages from dropdown (loading animation only)
- ✅ Fix LLM meta text appearing in replies
- ✅ Add debug logging for tweet text extraction

## 📋 Remaining Tasks

### Phase 2 - Low-Risk Enhancements

#### 1. **Session-Based Response Caching**
- Cache generated replies by tweet ID + tone combination
- Clear cache on browser restart
- Instant re-use for identical requests
- Reduces API calls and costs

#### 2. **Remember Last Used Tone**
- Store last selected tone in session storage
- Pre-select on next use during same session
- Reset on browser restart

#### 3. **Improve Error Messages**
- Replace generic errors with actionable messages:
  - "API key invalid" → "Invalid API key. Get your key at openrouter.ai/keys"
  - "Rate limited" → "Rate limited. Try again in X seconds"
  - "Network error" → "Connection failed. Check your internet connection"

#### 4. **Add Test API Key Button**
- Add button in popup settings
- Validates key with OpenRouter /models endpoint
- Shows success/failure with clear message
- Helps users debug configuration issues

### Phase 3 - Medium-Risk Features

#### 5. **Smart Retry Logic**
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Only retry on transient errors (network, 500s)
- Don't retry on auth errors (401) or rate limits (429)
- Show retry attempt in console

#### 6. **Thread Context Extraction**
- Analyze competitors' implementations first
- Extract up to 3 previous tweets in thread
- Include thread context in prompt
- Better understanding of conversation flow

#### 7. **Model Selection with OpenRouter API**
- Fetch live model list from `https://openrouter.ai/api/v1/models`
- Add "Refresh Models" button in popup
- Display model name, context window, pricing
- Cache model list locally with 24hr expiry
- Default to GPT-4 if selected model unavailable

#### 8. **Temperature Control Slider**
- Add slider in popup (0.1 to 1.0)
- Lower = more focused/deterministic
- Higher = more creative/varied
- Default: 0.7
- Save preference in storage

### Phase 4 - Polish & Performance

#### 9. **Fix Service Worker Reconnection**
- Implement proper heartbeat mechanism
- Auto-reconnect without errors
- Handle service worker lifecycle properly

#### 10. **Add Cleanup on Page Navigation**
- Remove event listeners on page unload
- Clean up mutation observers
- Prevent memory leaks
- Clear character count listeners

#### 11. **Debounce DOM Operations**
- Debounce mutation observer callbacks (500ms)
- Reduce CPU usage on rapid DOM changes
- Batch multiple toolbar detections

#### 12. **API Key Validation & Masking**
- Validate key format before saving
- Mask key display (show only last 4 chars)
- Add "Show/Hide" toggle for key visibility

#### 13. **Strip Tracking Parameters**
- Remove utm_* parameters from URLs in context
- Clean Twitter's t.co redirect URLs
- Provide cleaner context to AI

### Optional/Future Features

#### 14. **Feature Flags System**
- Enable/disable features without code changes
- Gradual rollout of new features
- Quick rollback if issues arise
- Store flags in Chrome storage

#### 15. **Image/Media Detection** (Needs Clarification)
- Detect if tweet contains images/video
- Include "This tweet has an image" in context
- Extract alt text if available
- **Question:** What value does this add without vision API?

## 🎯 Priority Order

1. **High Priority** (Most User Value)
   - Model selection with API fetch
   - Test API key button
   - Better error messages
   - Temperature control

2. **Medium Priority** (Nice to Have)
   - Session caching
   - Remember last tone
   - Smart retry logic
   - Thread context

3. **Low Priority** (Polish)
   - Service worker fixes
   - Debouncing
   - Cleanup improvements
   - Tracking parameter stripping

## 📝 Notes

- All features should maintain the "consumer-first" approach
- No enterprise patterns or over-engineering
- Each feature should be independently testable
- Maintain backward compatibility
- Keep debug logging for important operations

## 🚀 Next Release (v1.1.0)

Target features for next release:
1. Model selection with refresh
2. Test API key button
3. Temperature control
4. Better error messages
5. Session caching

Estimated completion: 2-3 hours of development