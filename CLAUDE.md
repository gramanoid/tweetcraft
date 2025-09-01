# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Core Development Principles

**BUILD FOR CONSUMERS, NOT ENTERPRISES**
- This is a consumer product - prioritize user experience and speed
- Avoid enterprise patterns (factories, dependency injection, excessive abstraction layers)
- Choose pragmatic solutions over "best practices" from enterprise software
- If the code is readable and works reliably, ship it

## Repository Overview

TweetCraft - AI-powered Twitter/X reply generator Chrome extension with comprehensive feature set including: OpenRouter integration, unified 5-tab AI interface, smart suggestions with AI scoring, image generation (AI + web search), template+tone system (15+ templates, 12 tones), custom templates with separate Style/Tone prompts, thread context awareness, Arsenal Mode (474 lines, IndexedDB), comprehensive keyboard shortcuts (384 lines), advanced network resilience, race condition prevention, and multi-stage loading states. Current version: 0.0.11 (preparing v0.0.12)

### BulkCraft Feature (Separate Directory - Pending Integration)
BulkCraft is an advanced content generation feature currently in the `bulkcraft/` directory, planned for integration into the main extension. It provides:
- **CSV Analysis**: Analyzes Twitter export data to identify viral patterns
- **AI-Powered Generation**: Creates optimized content using historical performance data
- **Trend Research**: Researches current viral trends and topics
- **Competitor Analysis**: Analyzes successful accounts for strategies
- **Psychology-Based Content**: Applies psychological triggers for engagement
- **Viral Prediction**: Scores content for viral potential

Located in `bulkcraft/` directory with its own npm package structure (v0.1.0).

**BulkCraft Tech Stack**:
- TypeScript with tsx for development
- Commander.js for CLI interface
- CSV parsing for Twitter analytics data
- Axios for API calls
- Zod for schema validation
- Separate build system from main extension

## Development Commands

### Main Extension
```bash
npm install         # Install dependencies
npm run dev         # Development build with watch mode
npm run build       # Production build
npm run lint        # Run ESLint
npm run type-check  # TypeScript type checking
npm run clean       # Clean build directory

# Common workflow:
npm run clean && npm run build  # Clean rebuild for production
```

### BulkCraft (in bulkcraft/ directory)
```bash
npm install         # Install BulkCraft dependencies
npm run build       # Build TypeScript
npm run dev         # Development mode with tsx watch
npm run analyze     # Run analytics on CSV data
npm run generate    # Generate content
npm run lint        # Run ESLint
npm run typecheck   # TypeScript type checking
```

### Loading the Extension in Chrome
1. Build: `npm run build`
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder
5. Configure OpenRouter API key in the extension popup

### Testing
Manual testing only - no automated tests:
- Test on both twitter.com and x.com
- Verify all 12 tone presets and templates work
- Check browser console for debug logs (uses structured, color-coded logging)

## Architecture Overview

### Chrome Extension Structure (Manifest V3)
- **Service Worker** (`src/background/serviceWorker.ts`) - Background message handling and CSP-compliant storage access
- **Content Script** (`src/content/contentScript.ts`) - Twitter DOM manipulation with singleton pattern to prevent multiple instances
- **Popup** (`src/popup/popup-simple.ts`) - Extension settings UI
- **Storage** (`src/services/storage.ts`) - Chrome storage API wrapper for API keys and settings
- **OpenRouter Service** (`src/services/openRouter.ts`) - AI model integration
- **Platform Support** (`src/platforms/`) - Multi-platform compatibility (Twitter/X, HypeFury)

### Key Architectural Patterns
1. **Singleton Content Script**: Uses `__smartReplyInstance` global to prevent duplicate instances
2. **DOM Cache Utility**: Performance optimization with WeakMap-based caching for frequently accessed elements
3. **Memory Management**: WeakSet for DOM references, comprehensive cleanup on navigation
4. **Debounced Operations**: 100ms debounce for DOM mutations to reduce CPU usage
5. **Template + Tone System**: Separate selection of reply structure (templates) and personality (tones)
6. **Session Caching**: Reduces API calls by caching responses in session storage
7. **Network Resilience**: Offline queuing, adaptive timeouts based on connection quality (3G/4G/5G aware)
8. **Request Optimization**: Deduplication, intelligent batching, and performance metrics tracking
9. **AsyncOperationManager**: Prevents race conditions with AbortController coordination
10. **Multi-Platform Support**: Adapter pattern for Twitter/X and HypeFury integration

### Build System (Webpack)
- Configuration in `build/` directory with common/dev/prod configs
- TypeScript compilation with strict checking
- SCSS processing with CSS extraction
- Assets copied from `public/` to `dist/`
- Path alias: `@` maps to `src/`

## Critical Implementation Notes

### Text Insertion for Twitter/X (DO NOT MODIFY)
Twitter uses contentEditable divs. The working implementation in `domUtils.ts`:

```typescript
// For contentEditable (Twitter's approach), use execCommand
if (textarea.contentEditable === 'true') {
  // Position cursor at beginning
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(textarea);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Insert text using execCommand
  document.execCommand('insertText', false, text);
  
  // Trigger React update
  const inputEvent = new InputEvent('input', { 
    inputType: 'insertText', 
    data: text 
  });
  textarea.dispatchEvent(inputEvent);
}
```

This approach is tested and proven to work with Twitter's React-based architecture (Aug 2025).

## Console Logging Standards

**MANDATORY FOR ALL NEW FEATURES** - Use structured, color-coded logging:

### Format
```javascript
console.log('%c🚀 FEATURE NAME', 'color: #1DA1F2; font-weight: bold; font-size: 14px');
console.log('%c  Property:', 'color: #657786', value);
```

### Color Palette
- `#1DA1F2` - Primary actions (Twitter blue)
- `#17BF63` - Success (green)
- `#DC3545` - Errors (red)
- `#FFA500` - Warnings (orange)
- `#657786` - Details (gray)

### Current Logging Prefixes
- `🎯 TONE SELECTION` - Tone selection events
- `📤 CONTENT SCRIPT` - Message handling
- `🚀 OPENROUTER` - API interactions
- `💾 CACHE` - Cache hits/misses
- `🔨 BUILDING` - Request construction
- `✅ SUCCESS` / `❌ ERROR` - Operation results

## Current Features (v0.0.12 - Latest Fixes)

### Core System Components
- **Arsenal Mode** (`src/services/arsenalService.ts`) - IndexedDB with 6 categories, usage tracking, favorites
- **Keyboard Shortcuts System** (`src/utils/keyboardShortcuts.ts`) - Alt+1-9 for tones, Alt+Q/R/T/S/C/E for actions
- **Loading State Manager** (`src/utils/loadingStateManager.ts`) - Multi-stage progress with animations and cancel support
- **DOM Resilience System** (`src/utils/domCache.ts`) - 4+ fallback levels per selector with WeakMap caching
- **AsyncOperationManager** (`src/utils/asyncOperationManager.ts`) - Race condition prevention with AbortController
- **Configuration Manager** (`src/config/configurationManager.ts`) - Centralized settings with caching
- **Memory Manager** (`src/utils/memoryManager.ts`) - WeakMap/WeakSet with comprehensive cleanup
- **Error Handler** (`src/utils/errorHandler.ts`) - Comprehensive recovery workflows

### Unified AI Reply Interface (v0.0.11 - Latest Major Update)
- **Five-tab Interface**: All Templates, Smart Suggestions, Favorites, Image Gen, Custom
- **Smart Suggestions Tab**: 
  - AI-powered scoring of template/tone combinations
  - Shows top 6 suggestions with scores and reasoning
  - Context-aware recommendations based on tweet content
- **Image Generation Tab**: 
  - AI image generation using `google/gemini-2.5-flash-image-preview`
  - Web image search using `perplexity/sonar` model
  - Style selection (realistic, cartoon, artistic, sketch)
  - Direct URL insertion into tweets
  - No placeholder images - only real results
- **Enhanced Custom Templates**: 
  - Separate Style and Tone prompt fields
  - No character limits on prompts
  - Combined prompts for maximum flexibility
- **Popup Improvements**:
  - Stays anchored to button during scroll
  - Disappears immediately when generating starts
  - All dropdown text fixed to black on white background
- **Removed Standalone Buttons**: Smart Suggestions and Image buttons now integrated

### Unified Selector (Phase C - Base Implementation)
- **Responsive Design**: Adaptive layout from 560px (desktop) to 95vw (mobile) with media queries
- **Smart Organization**: Templates grouped by category with 2-column grid (1-column on mobile)
- **Improved Dimensions**: 560x420px default with min/max constraints for better content fit
- **Feature Toggle**: Can switch between unified and traditional two-popup flow via localStorage flag
- **Auto-close on Generation**: Popup automatically dismisses after successful reply generation
- **Dark Mode Native**: Optimized for Twitter/X dark theme

### Image Integration (Phase D - Enhanced in v0.0.11)
- **AI Image Generation**: Uses OpenRouter API with Google Gemini Flash model
  - Retry logic with exponential backoff (3 retries, 1s/2s/3s delays)
  - Improved error handling with detailed validation of API responses
  - Better alt text generation from AI descriptions
  - Comprehensive error messages for debugging
  - Graceful fallback to placeholder images after retries
- **Web Image Search**: Integration with Unsplash/Pexels APIs (fallback to placeholders)
- **Smart Suggestions**: Context-aware image suggestions based on tweet content
- **Enhanced Keyword Extraction**: 
  - TTL-based cache with 1-hour expiration
  - LRU cache implementation (100 entries max) for performance
  - Automatic cache cleanup for expired entries
  - Improved algorithm with hashtag support and better stop words
- **Three-tab Interface**: Search Web, AI Generate, and Smart Suggest modes
- **API Key Consistency**: Uses 'smartReply_apiKey' throughout the extension

### Template + Tone System (Revamped in v0.0.10)
- **Centralized Configuration**: Templates and tones now defined in `src/config/templatesAndTones.ts`
- **15 preset templates**: Including Hot Take, Ratio Bait, Steel Man, Devil's Advocate, and more
- **12 personality tones**: Added Gen Z, Minimalist, Philosophical, Savage, and Motivational
- **Backend-configurable**: Easy to modify templates/tones without touching frontend code
- **Custom templates**: Support for {variable} placeholders
- **Dark mode UI**: Matches Twitter/X interface
- **Seamless flow**: Template selection → Tone selection without closing popup

### AI Rewrite Feature (Fixed in v0.0.10)
- **Proper LLM Integration**: User's text is now properly passed to the LLM for rewriting
- **Context-Aware Rewriting**: Maintains context of what the user is replying to
- **Improved Positioning**: AI Rewrite button now appears correctly before the tweet button

### Security Improvements (v0.0.11)
- **AES-GCM Encryption**: API keys now encrypted using Web Crypto API
- **Secure Storage**: Enhanced storage mechanisms for sensitive data
- **Improved Error Handling**: Better validation and sanitization of API responses

### Technical Features
- **Thread Context Extraction**: Analyzes up to 4 tweets for context-aware replies
- **Advanced Caching**: Session-based response caching with deduplication
- **Network Resilience**: Offline queuing, adaptive timeouts, connection quality detection
- **Request Optimization**: Intelligent batching, request deduplication, performance metrics
- **URL Privacy**: Automatic removal of tracking parameters from URLs
- **Keyboard Shortcuts**: Alt+Q (quick generate), Alt+1-9 (tones), Alt+R/T/C/E (actions)
- **Multiple Suggestions**: Carousel UI for browsing multiple reply options
- **Race Condition Prevention**: AsyncOperationManager with AbortController coordination
- **Comprehensive Error Handling**: Retry logic with exponential backoff

## Development Tips

1. **Extension reloading**: After code changes, reload extension in Chrome extensions page
2. **Console debugging**: TweetCraft uses color-coded structured logging (see Console Logging Standards)
3. **Service Worker debugging**: Use chrome://extensions → Service Worker link
4. **DOM changes**: Twitter's DOM changes frequently - verify selectors work with 4+ fallback strategies
5. **Context invalidation**: Reload extension if seeing "Extension context invalidated" errors
6. **Memory leaks**: Extension implements cleanup with WeakSet for DOM references
7. **Performance**: Uses debounced mutation observer (100ms) to reduce CPU usage
8. **CSP Compliance**: All storage operations use message passing pattern through service worker
9. **Platform Testing**: Test on both twitter.com and x.com domains

## Known Issues

### Active Issues
- Twitter DOM structure changes may break button injection (mitigated with 4+ fallback strategies)
- Service worker shows "Inactive" in Chrome extensions page (normal for Manifest V3)
- Extension context can become invalidated on reload (requires extension reload)
- Rate limiting depends on OpenRouter account tier

### Recently Fixed (v0.0.12)
- ✅ ChunkLoadError in image generation - Fixed with message passing pattern
- ✅ Missing "Generating..." loading state - Fixed with enhanced button finding
- ✅ 48 ESLint errors - All critical errors resolved
- ✅ CSP violations - Fixed with GET_STORAGE/SET_STORAGE handlers
- ✅ Chrome message timeouts - Added 5-second timeout to prevent hanging
- ✅ Timer type safety - Fixed NodeJS.Timeout usage in browser context
- ✅ JSON extraction bug - Fixed depth tracking for nested structures

## Future Integration: BulkCraft

### Planned Features for Main Extension
When BulkCraft is integrated from its separate branch, it will add:
1. **Bulk Content Generation** - Generate multiple tweets/replies at once
2. **Analytics-Driven Content** - Use Twitter export data to optimize content
3. **Viral Pattern Recognition** - Identify and replicate successful content patterns
4. **Scheduled Generation** - Queue content for later posting
5. **Performance Prediction** - Score content for potential virality before posting

### Integration Considerations
- BulkCraft currently has its own package.json and dependencies
- Will need UI integration in the extension popup
- Requires storage for analytics data and generated content queue
- May need background processing for bulk operations
- Consider rate limiting for bulk API calls

## API Integration Details

### OpenRouter Service Architecture
- **Base URL**: `https://openrouter.ai/api/v1`
- **Headers**: Include HTTP-Referer and X-Title for proper tracking
- **Models Priority**: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Haiku, Gemini Pro 1.5
- **Rate Limiting**: Minimum 1 second between requests with automatic retry on 429 errors
- **Error Handling**: Specific handling for 401 (invalid key), 429 (rate limit), 402 (insufficient credits)

### Service Worker Message Types
- `GET_CONFIG` / `SET_CONFIG` - Configuration management
- `GET_API_KEY` / `SET_API_KEY` - API key management
- `TEST_API_KEY` - Validates API key against OpenRouter
- `FETCH_MODELS` - Retrieves available models list
- `GENERATE_REPLY` - Main reply generation endpoint
- `GET_LAST_TONE` / `SET_LAST_TONE` - Tone preference persistence
- `GET_STORAGE` / `SET_STORAGE` - Generic storage access for CSP compliance (v0.0.12)

## Performance Optimizations

### Request Optimization Strategy
1. **Cache Check** - Session storage lookup (instant)
2. **Request Deduplication** - 30-second window for identical requests
3. **Intelligent Batching** - 200ms window to batch similar requests
4. **Retry Logic** - Exponential backoff: 1s, 2s, 4s delays
5. **Adaptive Timeouts** - Based on connection type (30s for 4G, up to 90s for slow-2G)

### Memory Management
- **WeakMap** for DOM element caching
- **WeakSet** for DOM reference tracking
- **Automatic cleanup** on page navigation
- **Debounced operations** to reduce CPU usage
- **LRU Cache** for keyword extraction (100 entries max)

## Code Quality Improvements (v0.0.12 - Latest Fixes)

### CSP Compliance Fixes
- **Message Passing Pattern**: All chrome.storage calls now use service worker
- **GET_STORAGE/SET_STORAGE Handlers**: Added to service worker for CSP compliance
- **Enhanced Button Finding**: 4-strategy fallback system for reliable DOM queries
- **TypeScript Type Safety**: Fixed all type mismatches and null safety issues

## Code Quality Improvements (v0.0.11 - Post-CodeRabbit)

### Enhanced Error Handling
- **API Response Validation**: Comprehensive validation of OpenRouter API responses
- **Detailed Error Messages**: Specific error messages for different failure scenarios
- **Retry Logic**: Exponential backoff with 3 retries for transient failures
- **Graceful Fallbacks**: Automatic fallback to placeholder images after retries

### Performance Optimizations
- **TTL-Based Caching**: Keywords cache with 1-hour expiration
- **LRU Cache**: Automatic removal of oldest entries when cache limit reached (100 entries)
- **Periodic Cleanup**: Probabilistic cleanup of expired cache entries
- **Cache Hit Logging**: Debug logging for cache performance monitoring
- **Response Validation**: Early validation to prevent unnecessary processing

### UI/UX Improvements
- **Responsive Design**: Media queries for mobile compatibility
- **Dynamic Sizing**: Min/max constraints for better content adaptation (560x420px default)
- **Mobile-First Approach**: Single column layout on small screens
- **Consistent Padding**: Proper spacing adjustments for different screen sizes

### API Integration
- **Consistent Key Storage**: Uses 'smartReply_apiKey' throughout the extension
- **Better Error Recovery**: Retry logic skips auth errors (401) automatically
- **Improved Logging**: Detailed console logging for debugging API issues

## File Organization

### Key Files and Their Purpose
- `src/content/contentScript.ts` - Main content script, singleton pattern, button injection
- `src/content/domUtils.ts` - Twitter DOM manipulation, text insertion (DO NOT MODIFY insertion logic)
- `src/content/unifiedSelector.ts` - 5-tab unified AI interface implementation
- `src/services/openRouter.ts` - OpenRouter API integration with retry logic
- `src/services/imageService.ts` - AI image generation and web search
- `src/services/templateSuggester.ts` - Smart suggestions with AI scoring
- `src/background/serviceWorker.ts` - Message handling, storage operations
- `src/config/templatesAndTones.ts` - Template and tone definitions
- `src/platforms/hypefury.ts` - HypeFury platform adapter

## Documentation Maintenance

**KEEP DOCUMENTATION CURRENT** - Update CLAUDE.md when:
- Project structure changes significantly
- New major features are added
- Architectural patterns change
- Known issues are discovered or resolved
- API integration details change