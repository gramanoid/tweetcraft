# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Core Development Principles

**BUILD FOR CONSUMERS, NOT ENTERPRISES**
- This is a consumer product - prioritize user experience and speed
- Avoid enterprise patterns (factories, dependency injection, excessive abstraction layers)
- Choose pragmatic solutions over "best practices" from enterprise software
- If the code is readable and works reliably, ship it

## Repository Overview

TweetCraft - AI-powered Twitter/X and HypeFury reply generator Chrome extension with comprehensive feature set including: Multi-platform support (Twitter/X + HypeFury with full feature parity), OpenRouter integration, unified 6-tab AI interface (Personas, All, Smart, Favorites, Image Gen, Custom), **strategic prompt architecture with centralized construction**, **enhanced AI suggestions with descriptive scoring**, image generation (AI + web search), 4-part template system (24 personalities, 11 vocabularies, 15 rhetoric approaches, 6 pacing options), **10 quick personas with compact grid layout**, custom templates with separate Style/Tone prompts and **temperature control**, **Smart Defaults & Quick Generate system**, collapsible UX, thread context awareness, Arsenal Mode (474 lines, IndexedDB), comprehensive keyboard shortcuts with Space bar quick generation, **usage-based persona sorting**, **enhanced pattern recognition**, advanced network resilience, race condition prevention, multi-stage loading states, **comprehensive anti-meta-commentary AI restrictions**, **unified visual feedback system**, and **perfect cross-category consistency**. Current version: 0.0.16

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

## Current Development State

The repository is currently in active development with several modified files:
- Modified files: CLAUDE.md, TODO.md, src/content/contentScript.ts, src/content/unifiedSelector.ts, src/services/openRouter.ts
- New files: src/services/promptArchitecture.ts (Strategic prompt construction), docs/PROMPT_ARCHITECTURE.md (Architecture documentation)
- New untracked files: src/services/smartDefaults.ts (Smart Defaults system)
- Git branch: feature/custom-tab-ux-improvements (use for PRs)
- Version: 0.0.16 (with latest major improvements: **Strategic prompt architecture**, **Custom temperature controls**, **Centralized prompt construction**, **Tab-specific configurations**, and **Comprehensive validation**)

**IMPORTANT**: The codebase contains a hardcoded OpenRouter API key in `src/config/apiConfig.ts`. This is for personal use only and should never be committed to public repositories.

## Development Commands

### Main Extension
```bash
npm install         # Install dependencies
npm run dev         # Development build with watch mode
npm run build       # Production build
npm run lint        # Run ESLint
npm run type-check  # TypeScript type checking
npm run test        # Run Jest tests
npm run test:watch  # Run Jest tests in watch mode
npm run test:coverage # Run Jest tests with coverage
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
5. **No additional configuration needed** - API key and all advanced settings are pre-configured in the environment

### Testing
Jest testing framework configured with TypeScript support:
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Run tests with coverage reporting
- Tests use jsdom environment for DOM manipulation testing
- @testing-library/jest-dom for enhanced DOM assertions

Manual testing checklist:
- Test on twitter.com, x.com, and app.hypefury.com
- Verify all template/tone combinations work on all platforms
- Check browser console for debug logs (uses structured, color-coded logging)
- Verify loading states show "Generating..." on all platforms

## Architecture Overview

### Chrome Extension Structure (Manifest V3)
- **Service Worker** (`src/background/serviceWorker.ts`) - Background message handling and CSP-compliant storage access
- **Content Script** (`src/content/contentScript.ts`) - Twitter DOM manipulation with singleton pattern to prevent multiple instances
- **Popup** (`src/popup/popup-simple.ts`) - **Streamlined extension popup** with only 5 essential settings
- **Storage** (`src/services/storage.ts`) - Chrome storage API wrapper for API keys and settings
- **OpenRouter Service** (`src/services/openRouter.ts`) - AI model integration with prompt architecture
- **Prompt Architecture** (`src/services/promptArchitecture.ts`) - **NEW**: Centralized strategic prompt construction for all tabs
- **Platform Support** (`src/platforms/`) - Multi-platform compatibility (Twitter/X, HypeFury)

### Key Architectural Patterns
1. **Singleton Content Script**: Uses `__smartReplyInstance` global to prevent duplicate instances
2. **Strategic Prompt Architecture**: Centralized prompt construction with tab-specific configurations
3. **DOM Cache Utility**: Performance optimization with WeakMap-based caching for frequently accessed elements
4. **Memory Management**: WeakSet for DOM references, comprehensive cleanup on navigation
5. **Debounced Operations**: 100ms debounce for DOM mutations to reduce CPU usage
6. **Template + Tone System**: Separate selection of reply structure (templates) and personality (tones)
7. **Session Caching**: Reduces API calls by caching responses in session storage
8. **Network Resilience**: Offline queuing, adaptive timeouts based on connection quality (3G/4G/5G aware)
9. **Request Optimization**: Deduplication, intelligent batching, and performance metrics tracking
10. **AsyncOperationManager**: Prevents race conditions with AbortController coordination
11. **Multi-Platform Support**: Adapter pattern for Twitter/X and HypeFury integration

### Build System (Webpack)
- Configuration in `build/` directory with common/dev/prod configs
- TypeScript compilation with strict checking
- SCSS processing with CSS extraction
- Assets copied from `public/` to `dist/`
- Path alias: `@` maps to `src/`

### Modular Configuration System
The extension uses a modular configuration approach in `src/config/` and **environment-based configuration**:
- `personalities.ts` - 24 personality types (Friendly, Professional, Sarcastic, etc.)
- `vocabulary.ts` - 11 vocabulary styles (Plain English, Corporate, Gen Z, etc.)
- `rhetoric.ts` - 15 rhetorical approaches (Agree & Build, Devil's Advocate, Hot Take, etc.)
- `lengthPacing.ts` - 6 length and pacing options (Drive-By, Mini-Thread, etc.)
- `quickPersonas.ts` - 10 pre-configured persona combinations
- `apiConfig.ts` - **SENSITIVE**: Contains hardcoded OpenRouter API key
- `configurationManager.ts` - Centralized configuration management
- `constants.ts` - Application constants and defaults
- **`.env`** - **NEW**: Environment-based configuration with API keys, model defaults, and feature toggles

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
- `📂 POPUP SETTINGS LOADED` - Extension popup settings loaded
- `💾 POPUP SETTINGS SAVED` - Extension popup settings saved
- `👁️ VISION ANALYSIS` - Image understanding and analysis
- `🔄 RESET USAGE` - Usage counter reset operations
- `🤖 LLM ANALYSIS` - AI-powered template suggestions and scoring

## Current Features (v0.0.15 - Latest Update: Complete Prompt Architecture + Streamlined Extension Popup + LLM-First Smart Tab)

### Platform Support
- **Twitter/X**: Full support on twitter.com and x.com
- **HypeFury**: Complete feature parity on app.hypefury.com
  - Unified 6-tab selector (Personas, All, Smart, Favorites, Image Gen, Custom)
  - All keyboard shortcuts (Alt+1-9 for tones, Alt+Q for quick generate)
  - AI Rewrite functionality
  - Loading states with "Generating..." text
  - Smart context extraction from HypeFury's UI
  - Platform-specific styling and button placement

### Platform-Specific Implementation Details
```typescript
// Platform detection
const isHypeFury = window.location.hostname === 'app.hypefury.com';

// Button selector adaptation
const buttonSelector = isHypeFury ? '.smart-reply-button' : '.smart-reply-btn';

// Loading state handling
if (isHypeFury) {
  span.textContent = '✨ AI Reply';  // HypeFury style
} else {
  span.textContent = 'AI Reply';     // Twitter style
}
```

### Core System Components
- **Prompt Architecture** (`src/services/promptArchitecture.ts`) - **NEW**: Comprehensive prompt construction system for all tabs
- **Arsenal Mode** (`src/services/arsenalService.ts`) - IndexedDB with 6 categories, usage tracking, favorites
- **Smart Defaults System** (`src/services/smartDefaults.ts`) - Usage pattern learning and Quick Generate functionality
- **Usage Tracker** (`src/services/usageTracker.ts`) - Comprehensive analytics and pattern recognition
- **Keyboard Shortcuts System** (`src/utils/keyboardShortcuts.ts`) - Alt+1-9 for tones, Alt+Q/R/T/S/C/E for actions, Space for Quick Generate
- **Loading State Manager** (`src/utils/loadingStateManager.ts`) - Multi-stage progress with animations and cancel support
- **DOM Resilience System** (`src/utils/domCache.ts`) - 4+ fallback levels per selector with WeakMap caching
- **AsyncOperationManager** (`src/utils/asyncOperationManager.ts`) - Race condition prevention with AbortController
- **Configuration Manager** (`src/config/configurationManager.ts`) - Centralized settings with caching
- **Memory Manager** (`src/utils/memoryManager.ts`) - WeakMap/WeakSet with comprehensive cleanup
- **Error Handler** (`src/utils/errorHandler.ts`) - Comprehensive recovery workflows

### Unified AI Reply Interface (v0.0.14 - Latest Update)
- **Six-tab Interface**: Personas, All, Smart, Favorites, Image Gen, Custom
- **Smart Suggestions Tab**: 
  - **LLM-First Algorithm**: AI analysis is now the PRIMARY scoring mechanism with confidence scoring and reasoning chains
  - **Enhanced Context Analysis**: Thread dynamics, user behavior patterns, engagement metrics, and conversation stage detection
  - **Sophisticated Prompts**: Multi-part system prompts with examples and step-by-step reasoning instructions
  - **Comprehensive Scoring**: AI confidence scores combined with usage patterns and contextual relevance
  - **Enhanced AI-powered scoring** with descriptive labels (Perfect Match, Excellent Fit, Great Choice, etc.)
  - **Shows top 8 suggestions** with meaningful context explanations (up from 6)
  - **Color-coded reason chips** with categories (Context, Favorites, Usage, Success, Timing, AI, Tone)
  - **Refresh button** with smooth animation for generating new contextual suggestions
  - **Advanced pattern recognition** with 11+ sophisticated rules for better context detection
- **Image Generation Tab**: 
  - AI image generation using `google/gemini-2.5-flash-image-preview`
  - Web image search using `perplexity/sonar` model
  - Style selection (realistic, cartoon, artistic, sketch)
  - Direct URL insertion into tweets
  - No placeholder images - only real results
- **Personas Tab**: 
  - **Compact 5-column grid layout** showing all 10 personas simultaneously (space efficiency overhaul)
  - **Usage-based intelligent sorting** with recent usage indicators and frequency counts
  - **Hover tooltips** with full descriptions and usage statistics
  - **Visual usage indicators**: count badges and recent usage dots for pattern recognition
  - **Enhanced tracking integration** with main usage tracker service for analytics
- **All Tab (4-part builder)**:
  - Step 1: 24 personalities (Friendly, Professional, Sarcastic, etc.)
  - Step 2: 11 vocabulary styles (Plain English, Corporate, Gen Z, etc.)
  - Step 3: 15 rhetoric approaches (Agree & Build, Devil's Advocate, Hot Take, etc.)
  - Step 4: 6 length & pacing options (Drive-By, One-Two Punch, Mini-Thread, etc.)
- **Custom Tab**: 
  - **Inline template creation** with collapsible form interface
  - **Four-field system**: Style, Tone, Length instructions, and **Temperature control**
  - **Temperature slider**: Per-template creativity control (0.1 = focused, 1.0 = creative) that overrides system-wide setting
  - **Comprehensive template management**: Edit, delete, preview, and favorite saved templates
  - **Advanced features**: Import/export templates, bulk operations, template sharing
  - **Enhanced UI**: Template cards with preview snippets, action buttons, search functionality
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

### Template + Tone System (Enhanced in v0.0.14)
- **4-Part Selection System**: 
  - Personality (24 options): Sets the emotional tone
  - Vocabulary (11 options): Determines language style
  - Rhetoric (15 options): Defines approach to the topic
  - Length & Pacing (6 options): Controls response structure
- **Quick Personas**: 10 pre-configured combinations for one-click selection
- **Smart Suggestions**: AI scores and recommends best combinations
- **Centralized Configuration**: All options defined in config files
- **Custom templates**: Full inline creation and management system with Style/Tone/Length fields
- **Dark mode UI**: Matches Twitter/X interface
- **Seamless flow**: Selections saved between popup opens

### Strategic Prompt Architecture (NEW in v0.0.16)
- **Prompt Architecture Service** (`src/services/promptArchitecture.ts`): 
  - Centralized prompt construction for all 6 tabs
  - Master system prompt for expert Twitter reply writing
  - Tab-specific prompt configurations (Personas, All, Smart, Favorites, Image Gen, Custom)
  - Temperature override mechanism for Custom templates
  - Anti-disclosure instructions to prevent AI from revealing its nature
  - Context mode support (none, single, thread) for different reply scenarios
- **Comprehensive Documentation** (`docs/PROMPT_ARCHITECTURE.md`):
  - Detailed prompt structure definition for each tab
  - Temperature control hierarchy (System-wide default vs Custom override)
  - Implementation examples and usage patterns
- **Tab Configuration Mapping**:
  - **PERSONAS**: System prompt + persona configuration + anti-disclosure
  - **ALL**: System prompt + 4-part selection + anti-disclosure
  - **SMART/FAVORITES**: Same structure as ALL tab
  - **IMAGE GEN**: No prompts applied (functional only)
  - **CUSTOM**: System prompt + style/tone/length + temperature override + anti-disclosure

### Smart Defaults & Quick Generate System (NEW in v0.0.15 - Issue #2 Resolution)
- **Smart Defaults Service** (`src/services/smartDefaults.ts`): 
  - Tracks user selection patterns and usage frequency
  - Automatically suggests most-used combinations based on history
  - Provides intelligent fallbacks for new users
  - Stores last-used selections with 24-hour recency check
- **Quick Generate Mode**: 
  - Prominent lightning bolt ⚡ button in header with gradient styling and pulse animation
  - Bypasses entire 4-part selection flow using learned patterns
  - Uses last-used selections when available, falls back to smart defaults
  - Keyboard shortcut: **Space bar** for instant generation
- **Collapsible UX Improvements**:
  - Vocabulary and Length & Pacing sections are collapsible for reduced visual clutter
  - Sections remain **required** - must be selected before generation
  - Click section headers to collapse/expand with smooth animations
  - Maintains all 4-part validation while improving usability
- **Enhanced Keyboard Navigation**:
  - **Space**: Quick Generate with previous settings
  - **Enter**: Generate with current selections
  - **Escape**: Close popup
  - Works across all tabs with proper input field detection

### AI Rewrite Feature (Fixed in v0.0.10)
- **Proper LLM Integration**: User's text is now properly passed to the LLM for rewriting
- **Context-Aware Rewriting**: Maintains context of what the user is replying to
- **Improved Positioning**: AI Rewrite button now appears correctly before the tweet button

### Security Improvements (v0.0.14)
- **AES-GCM Encryption**: API keys encrypted using Web Crypto API for storage
- **Secure Storage**: Enhanced storage mechanisms for sensitive data
- **Improved Error Handling**: Better validation and sanitization of API responses
- **API Key Configuration**: OpenRouter API key stored in `src/config/apiConfig.ts`
  - **SECURITY NOTE**: API key is hardcoded for personal use - DO NOT COMMIT to public repositories
  - Key should be moved to environment variables or secure storage for production distribution

### Technical Features
- **Strategic Prompt Architecture**: Centralized prompt construction with tab-specific configurations and temperature controls
- **Thread Context Extraction**: Analyzes up to 4 tweets for context-aware replies
- **LLM-First Smart Suggestions**: AI analysis drives template scoring with confidence scoring, reasoning chains, and comprehensive context analysis
- **Image Understanding**: Fully functional vision analysis using OpenRouter vision models (default: Gemini Pro Vision) - **BACKEND-ONLY, ENABLED BY DEFAULT**
- **Streamlined Extension Popup**: Only 5 essential settings (Model, System Prompt, Reply Length, Temperature, Context Mode) - all advanced features moved to backend
- **Environment-Based Configuration**: API keys, model defaults, and feature toggles configured in .env file for security and maintainability
- **Comprehensive Console Logging**: Detailed monitoring of all settings, toggles, image understanding usage, and AI operations with color-coded structured output
- **Usage Analytics & Reset Functionality**: Complete usage tracking with manual reset capability through extension popup
- **Smart Defaults & Usage Tracking**: Comprehensive analytics with pattern recognition and intelligent fallbacks
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

## Active Development

See [TODO.md](TODO.md) for the comprehensive UX/UI improvement plan including:
- 20 identified issues with detailed solutions
- 4-week implementation roadmap
- Desktop-specific optimizations for single-user workflow
- Focus on reducing clicks and adding keyboard navigation

## Known Issues

### Active Issues
- Twitter DOM structure changes may break button injection (mitigated with 4+ fallback strategies)
- Service worker shows "Inactive" in Chrome extensions page (normal for Manifest V3)
- Extension context can become invalidated on reload (requires extension reload)
- Rate limiting depends on OpenRouter account tier

### Recently Fixed (v0.0.16 - Strategic Prompt Architecture)
- ✅ **Strategic Prompt Architecture Implementation** - Complete centralized prompt construction system with:
  - Master system prompt for expert Twitter reply writing across all tabs
  - Tab-specific prompt configurations for Personas, All, Smart, Favorites, and Custom
  - Temperature override mechanism for Custom templates with UI slider
  - Anti-disclosure instructions preventing AI from revealing its nature
  - Context mode support (none, single, thread) for different scenarios
  - Comprehensive logging for debugging prompt construction
- ✅ **Custom Tab Temperature Control** - Added temperature slider (0.1-1.0) for per-template creativity control
- ✅ **Prompt Architecture Integration** - Fully integrated into OpenRouter.ts with proper tab identification
- ✅ **Documentation Updates** - Created comprehensive PROMPT_ARCHITECTURE.md with detailed structure definitions

### Previously Fixed (v0.0.15 - Latest Session: Major Overhaul)
- ✅ **Streamlined Extension Popup** - Simplified to only 5 essential settings: Model, System Prompt (Your Identity), Default Reply Length, Temperature, Context Mode
- ✅ **Backend-Only Image Understanding** - Moved all image understanding configuration to backend (.env), always enabled by default, removed frontend toggles
- ✅ **Environment-Based Configuration** - Added comprehensive .env file with API keys, model defaults, vision settings, and feature toggles
- ✅ **Usage Analytics Reset** - Added functional reset button in extension popup with full backend message handling (RESET_USAGE_STATS)
- ✅ **LLM-First Smart Tab Algorithm** - Completely transformed Smart suggestions from pattern-based to LLM-primary scoring with:
  - AI analysis as PRIMARY mechanism (8.0 point boost for LLM category matches)
  - Confidence scoring and reasoning chains
  - Enhanced context analysis (thread dynamics, user behavior, engagement metrics)
  - Comprehensive system prompts with examples and step-by-step reasoning
- ✅ **Comprehensive Console Logging** - Added detailed monitoring throughout entire system:
  - Extension popup settings load/save with structured color-coded output
  - Vision analysis pipeline with cost estimation and model selection
  - AI generation parameters and context information
  - LLM analysis results with confidence scores and reasoning
  - Usage tracking and analytics operations
- ✅ **Vision Analysis Integration** - Complete ANALYZE_IMAGES message type implementation with OpenRouter vision models
- ✅ **TypeScript Build Fixes** - Resolved multiple compilation errors for message types, interfaces, and property access

### Previous Fixes (v0.0.15 - Earlier)
- ✅ **Personas Tab Generate Button** - Fixed issue where clicking persona cards didn't activate Generate button (updateUI() method now properly handles personas view)
- ✅ **AI Self-Disclosure Prevention** - Enhanced system prompts to prevent AI from revealing its nature or explaining methodology in responses
- ✅ **Quick Generate Smart Defaults** - Fixed ID mismatches between smartDefaults.ts and config files (hyphenated → underscored IDs)
- ✅ **Collapsible UI Sections** - Enhanced toggleSection() method with window.getComputedStyle for reliable visibility detection
- ✅ **Tab Layout Compactness** - Reduced tab padding/font sizes and added flex-shrink: 0 to prevent Custom tab from being cut off

### Major UX Enhancements (v0.0.15)
- ✅ **Personas Tab Layout Overhaul** - Complete redesign with 5-column compact grid, usage-based sorting, hover tooltips, and visual indicators
- ✅ **AI Suggestions Enhancement** - Increased to 8 suggestions with descriptive labels, color-coded reason chips, refresh functionality, and enhanced pattern recognition
- ✅ **Usage Tracking Integration** - Enhanced persona tracking with main usage tracker service for intelligent sorting and analytics
- ✅ **Pattern Recognition Upgrade** - Enhanced from 8 to 11+ sophisticated regex patterns for better context detection in AI suggestions
- ✅ **Scoring System Redesign** - Replaced confusing numeric scores with meaningful descriptive labels and visual categorization

### Previously Fixed (v0.0.14)
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
- `GET_STORAGE` / `SET_STORAGE` - Generic storage access for CSP compliance (v0.0.11)
- `RESET_USAGE_STATS` - Reset all usage tracking counters (v0.0.15)
- `ANALYZE_IMAGES` - Vision analysis using OpenRouter vision models (v0.0.15)

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

## Code Quality Improvements (v0.0.11 - Latest Fixes)

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
- `src/content/unifiedSelector.ts` - **ENHANCED**: 6-tab unified AI interface with personas grid overhaul, AI suggestions improvements, and Custom temperature control
- `src/services/openRouter.ts` - **ENHANCED**: OpenRouter API integration with prompt architecture, comprehensive logging and vision model support
- `src/services/promptArchitecture.ts` - **NEW**: Centralized strategic prompt construction for all tabs with temperature controls
- `src/services/imageService.ts` - AI image generation and web search
- `src/services/templateSuggester.ts` - **COMPLETELY TRANSFORMED**: LLM-first Smart suggestions with AI-driven scoring, confidence analysis, and reasoning chains
- `src/services/visionService.ts` - **NEW**: Complete vision analysis pipeline with OpenRouter integration and detailed logging
- `src/services/smartDefaults.ts` - Smart defaults and Quick Generate functionality
- `src/services/usageTracker.ts` - **ENHANCED**: Usage patterns tracking with persona tracking support for intelligent sorting
- `src/background/serviceWorker.ts` - **ENHANCED**: Message handling with ANALYZE_IMAGES and RESET_USAGE_STATS support, comprehensive logging
- `src/popup/popup-simple.ts` - **STREAMLINED**: Simplified extension popup with only 5 essential settings and enhanced logging
- `public/popup.html` - **SIMPLIFIED**: Clean popup interface with Model, System Prompt, Reply Length, Temperature, Context Mode
- `.env` - **NEW**: Environment-based configuration with API keys, model defaults, vision settings, and feature toggles
- `src/config/apiConfig.ts` - **CRITICAL**: Contains hardcoded OpenRouter API key
- `src/config/templatesAndTones.ts` - Template and tone definitions with temperature field (deprecated - see modular configs)
- `docs/PROMPT_ARCHITECTURE.md` - **NEW**: Comprehensive documentation of strategic prompt structure for all tabs
- `src/config/personalities.ts` - 24 personality options for template system
- `src/config/vocabulary.ts` - 11 vocabulary styles
- `src/config/rhetoric.ts` - 15 rhetoric approaches
- `src/config/lengthPacing.ts` - 6 length and pacing options
- `src/config/quickPersonas.ts` - 10 pre-configured persona combinations
- `src/types/messages.ts` - **ENHANCED**: Added ANALYZE_IMAGES and RESET_USAGE_STATS message types with proper interfaces
- `src/types/llm.ts` - **ENHANCED**: Comprehensive LLM analysis interfaces with confidence scoring and context analysis
- `src/platforms/hypefury.ts` - HypeFury platform adapter

## Documentation Maintenance

**KEEP DOCUMENTATION CURRENT** - Update CLAUDE.md when:
- Project structure changes significantly
- New major features are added
- Architectural patterns change
- Known issues are discovered or resolved
- API integration details change