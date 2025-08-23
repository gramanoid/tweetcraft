# Changelog

## [1.4.1] - 2024-12-23

### Fixed
- **Empty Response Bug**: Fixed issue where API responses were incorrectly cleaned to empty strings
- **Thread Context Duplicates**: Removed duplicate tweets from thread context extraction
- **Model Fetching**: Fixed fetch models button not working correctly from OpenRouter API

### Added
- **Thread Context Toggle**: Added on/off toggle for thread context inclusion in popup settings
- **Enhanced Logging**: Added console logs for single vs thread reply generation
- **Temperature Confirmation**: Added console log confirmation of temperature settings
- **Better Error Logging**: Improved error logging for API response debugging

### Technical Improvements
- Deduplicated thread tweets using Set to track seen content
- Added fallback to use original reply if cleanup removes all content
- Implemented FETCH_MODELS handler in service worker with model prioritization
- Improved frontend-backend mapping for all settings

## [1.4.0] - 2024-12-22

### Added - Phase 3.5 Features
- **Thread Context Extraction**
  - Automatically extracts up to 3 previous tweets in a conversation thread
  - Provides full conversation context to the AI for more relevant replies
  - Maintains conversation flow and continuity
  - Improves reply quality by understanding the full discussion

### Technical Improvements
- Enhanced DOM parsing to identify thread structure
- Improved prompt engineering to include thread context
- Better conversation flow understanding
- Support for multi-participant threads

## [1.3.0] - 2024-12-22

### Rebranding
- **New Name**: Rebranded from "Smart Reply" to "TweetCraft"
- **Custom Icons**: Implemented custom TweetCraft icons and logo
- **Updated Branding**: Updated all UI text and console messages
- **Logo Integration**: Added TweetCraft logo to popup header

### Visual Improvements
- Professional custom icons in all required sizes (16x16, 32x32, 48x48, 128x128)
- Logo-only variant for cleaner UI elements
- Consistent branding throughout the extension

## [1.2.1] - 2024-12-22

### Added
- **Strip Tracking Parameters from URLs**
  - Automatically removes tracking parameters from URLs in tweets
  - Cleans URLs in generated replies for privacy
  - Removes common tracking params (utm_*, fbclid, etc.)
  - Maintains clean URLs for better user privacy

### Technical Improvements
- Added `URLCleaner` utility class with comprehensive tracking parameter list
- Integrated URL cleaning into tweet extraction and reply generation
- Supports cleaning of Amazon, Google Analytics, Facebook, Twitter, and other tracking parameters

## [1.2.0] - 2024-12-22

### Added - Phase 4 Features (Polish & Performance)
- **API Key Validation & Masking**
  - Format validation for OpenRouter API keys (sk-or-*)
  - Show/hide toggle button with eye icon
  - Masked display showing only first/last 4 characters
  - Visual feedback for validation state
- **Debounced DOM Operations**
  - 500ms debounce on mutation observer callbacks
  - Batch processing of toolbar detection
  - Reduced CPU usage during rapid DOM changes
- **Enhanced Cleanup on Page Navigation**
  - Proper cleanup on SPA navigation (Twitter is an SPA)
  - History API event listeners
  - Memory leak prevention with event listener removal
  - Cleanup functions for all registered handlers

### Technical Improvements
- Added `debounce` and `throttle` utility functions
- Improved memory management with proper cleanup
- Better handling of SPA navigation events
- Enhanced API key security with masking

## [1.1.0] - 2024-12-22

### Added - Phase 3 Features
- **Smart Retry Logic** - Automatic retry with exponential backoff (1s, 2s, 4s) for transient errors
- **Model Selection with Live API** - Fetch and display all available models from OpenRouter
  - Refresh button to update model list
  - Model info display (context window, pricing)
  - Prioritized sorting for commonly used models
- **Temperature Control Slider** - Adjustable creativity level (0.1-1.0)
  - Visual slider with real-time value display
  - Persistent setting saved to storage
  - Clear indicators for "Focused" vs "Creative"

### Technical Improvements
- Added `fetchWithRetry` method for resilient API calls
- Implemented `fetchAvailableModels` for dynamic model discovery
- Extended config to support temperature setting
- Enhanced popup UI with new controls and animations

### Note
- Thread Context Extraction deferred to next release for better implementation

## [1.0.4] - 2024-12-22

### Added - Phase 2 Features
- **Session-based response caching** - Reduces API calls by caching generated replies per tweet ID + tone combination
- **Remember last used tone** - Pre-selects your previously selected tone with a checkmark indicator
- **Test API Key button** - Validate your OpenRouter API key directly from the popup settings
- **Improved error messages** - More actionable error messages with specific instructions:
  - Invalid API key → Links to OpenRouter key page
  - Rate limiting → Shows exact wait time when available
  - Insufficient credits → Links to OpenRouter account page
  - Network errors → Clear connection troubleshooting steps

### Technical Improvements
- Added `CacheService` for managing session-based reply cache
- Extended `StorageService` with session storage support for last tone
- Enhanced OpenRouter error handling with specific status code responses
- Improved popup UI with test button and result display

### Fixed
- Session storage access from content scripts - now properly routed through service worker
- "Access to storage is not allowed from this context" error resolved

## [1.0.3] - 2024-12-22

### Working Features

#### Core Functionality ✅
- All five tone presets working correctly (Professional, Casual, Witty, Supportive, Contrarian)
- Tweet text extraction working properly
- Reply generation with proper context
- Character count display (subtle gray)
- Loading animation during generation
- Dropdown closes after successful generation

#### UI/UX ✅
- Keyboard navigation fully functional
- Click-outside to close working
- Dropdown follows button when scrolling
- Visual hover feedback on options
- Clean, minimal interface

#### Improvements
- Removed AI meta-text from responses (no more "A balanced reply could be:")
- Simplified UI - removed unnecessary status messages
- Better error handling for extension reloads
- Comprehensive debug logging for troubleshooting

### Debug Features
- Logs extracted tweet text from DOM
- Logs user prompt sent to LLM
- Logs tone selection and application
- Logs final system prompt with modifiers

### Known Working Scenarios
- Replying to regular tweets ✅
- Replying to tweets with images ✅
- Different tone selections producing varied responses ✅
- Character counting for generated replies ✅

## [1.0.2] - 2024-12-22

### Phase 1 - Zero-Risk UI Improvements

#### Added
- 📊 Character counter with dynamic color coding (red >280, orange >260)
- 📝 Progress text during generation ("Analyzing tweet context...", "Generating reply...")
- ⌨️ Full keyboard navigation support (Arrow keys, Enter, Escape)
- 🎨 Visual hover feedback on dropdown options
- 🖱️ Click-outside to close dropdown functionality
- 🎆 Focus states for accessibility
- 👑 Twitter Premium character limit detection (25k chars)
- 🔄 Live character count updates as user edits

#### Improved
- Cleaner console output (removed verbose logging)
- Better duplicate button prevention
- Silent service worker reconnection
- Graceful handling of extension context invalidation
- Singleton pattern to prevent multiple content script instances

#### Fixed
- Prevented duplicate button injections in same toolbar
- "Extension context invalidated" errors when reloading extension
- Memory leaks from old content script instances

## [1.0.1] - 2024-12-22

### Improved
- Better cleanup on page navigation
- Simple rate limiting (1 second between API calls)
- More robust service worker reconnection
- Fixed memory leaks with proper cleanup

### Fixed
- Text insertion using proven paste event method
- Dropdown visibility with stronger CSS specificity
- Dark mode styling for dropdown

## [1.0.0] - 2024-12-22

### Initial Release
- OpenRouter integration for any LLM (GPT-4, Claude, etc.)
- Custom prompt system for personal style
- 5 tone presets (Professional, Casual, Witty, Supportive, Contrarian)
- Context-aware reply generation
- BYOK (Bring Your Own Key) architecture
- Chrome Manifest V3 compliant